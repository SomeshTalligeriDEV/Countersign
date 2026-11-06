import {randomBytes} from 'node:crypto';
import {paymentDomain,paymentTypes,USDT_ADDRESS} from '../../shared/src/index.ts';
import {resourceHash} from '../../shared/src/crypto.mjs';
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
const decimal=value=>{if(typeof value!=='string'||!/^(0|[1-9][0-9]{0,77})$/.test(value))throw new Error('invalid_quote');return BigInt(value);};
const hash=value=>{if(typeof value!=='string'||!/^0x[\da-fA-F]{64}$/.test(value))throw new Error('invalid_quote');return value;};
/** Signer is injected: this module never loads or prints private keys. */
export function createAgent({account,mandateId,mandateAddress,merchantIds,maxAmount,readPolicy,approvalApi,fetchImpl=fetch,clock=()=>Math.floor(Date.now()/1000)}){
 const domain=paymentDomain(mandateAddress);hash(mandateId);
 const cap=BigInt(maxAmount);if(cap<=0n||!Array.isArray(merchantIds)||!merchantIds.length)throw new Error('local_policy_required');
 return {async fetch(url,{method='GET',body,headers={},signal}={}){
  const target=new URL(url);
  if(target.protocol!=='https:'&&!(target.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(target.hostname)))throw new Error('https_merchant_required');
  if(target.username||target.password||target.hash)throw new Error('invalid_merchant_url');
  if(body!==undefined&&typeof body!=='string')throw new Error('exact_string_body_required');
  const requestHeaders=new Headers(headers);
  if(requestHeaders.has('x-payment'))throw new Error('payment_header_managed_by_agent');
  const execute=()=>fetchImpl(target,{method,body,headers:requestHeaders,redirect:'error',signal:signal??AbortSignal.timeout(15000)});
  const initial=await execute();if(initial.status!==402)return {status:'response',response:initial};
  const quote=await initial.json();
  if(quote.scheme!=='countersign-v1'||quote.chainId!==1874||!same(quote.mandateContract,mandateAddress)||!same(quote.token,USDT_ADDRESS)||!merchantIds.some(id=>same(id,quote.merchantId)))throw new Error('untrusted_quote');
  if(!/^0x[\da-fA-F]{40}$/.test(quote.payout??''))throw new Error('invalid_quote');
  const amount=decimal(quote.amount),deadline=decimal(quote.deadline),version=decimal(quote.registryVersion);
  if(amount<=0n||amount>cap)throw new Error('local_amount_limit');
  if(deadline<=BigInt(clock())||deadline>BigInt(clock()+180)||version>=1n<<64n)throw new Error('invalid_quote');
  const expected=resourceHash(method,target.pathname+target.search,Buffer.from(body??''));
  if(!same(expected,quote.resourceHash))throw new Error('resource_mismatch');
  const policy=await readPolicy(mandateId);
  if(!same(policy.agent,account.address)||policy.paused||BigInt(policy.expiry)<=BigInt(clock()))throw new Error('inactive_agent_policy');
  if(amount<BigInt(policy.humanThreshold)&&deadline>BigInt(clock()+60))throw new Error('invalid_quote');
  if(amount>BigInt(policy.perTxLimit)||amount>BigInt(policy.remaining))throw new Error('local_budget_limit');
  if(amount>=BigInt(policy.humanThreshold)&&!approvalApi)return {status:'approval_required',terms:quote};
  const intent={mandateId,merchantId:hash(quote.merchantId),payout:quote.payout,registryVersion:version.toString(),amount:amount.toString(),orderId:hash(quote.orderId),resourceHash:expected,nonce:BigInt('0x'+randomBytes(32).toString('hex')).toString(),epoch:BigInt(policy.epoch).toString(),deadline:deadline.toString()};
  const agentSig=await account.signTypedData({domain,types:paymentTypes,primaryType:'PaymentIntent',message:intent});
  requestHeaders.set('x-payment',Buffer.from(JSON.stringify({intent,agentSig})).toString('base64url'));
  const send=async()=>{const response=await execute();if(response.status===202)return {status:'pending_confirmation',details:await response.json(),retry:send};return {status:'response',response};};
  if(amount>=BigInt(policy.humanThreshold)){
   const approval=await approvalApi.create({intent,agentSig});
   return {status:'pending_human',...approval,retry:send,async check(){return approvalApi.status(approval.approvalId);}};
  }
  return send();
 }};
}
