import {mandateIdFor} from '../../../packages/shared/src/crypto.mjs';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseHumanAmount} from '../../../packages/shared/src/amount.mjs';
import {encodeFunctionData,erc20Abi,zeroHash} from '../../../packages/shared/src/viem-runtime.mjs';
const token='0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7';
const address=v=>typeof v==='string'&&/^0x[\da-fA-F]{40}$/.test(v)&&!/^0x0{40}$/i.test(v);
const integer=v=>{if(typeof v!=='string'||!/^\d{1,20}$/.test(v))throw new Error('invalid_setup');const n=BigInt(v);if(n>=1n<<64n)throw new Error('invalid_setup');return n;};
/** Unsigned calldata only. Caller wallet is always the treasury and gas payer. */
export function createOwnerSetup({chain,mandateAddress,abi,clock=()=>Math.floor(Date.now()/1000)}){
 if(!address(mandateAddress))throw new Error('invalid_contract');
 const contractAbi=abi??JSON.parse(readFileSync(new URL('../../../contracts/out/Mandate.sol/Mandate.json',import.meta.url))).abi;
 return {async merchant(body){
  if(!body||Object.keys(body).length!==4||!['owner','mandateId','merchantId','allowed'].every(k=>Object.hasOwn(body,k))||!address(body.owner)||!/^0x[\da-fA-F]{64}$/.test(body.mandateId)||!/^0x[\da-fA-F]{64}$/.test(body.merchantId)||typeof body.allowed!=='boolean')throw new Error('invalid_setup');
  if(await chain.chainId()!==1874)throw new Error('wrong_chain_or_token');
  const policy=await chain.policy(body.mandateId);
  if(policy.owner.toLowerCase()!==body.owner.toLowerCase())throw new Error('NotOwner');
  if(body.allowed)await chain.terms(body.merchantId);
  return {chainId:1874,from:body.owner,to:mandateAddress,value:'0x0',data:encodeFunctionData({abi:contractAbi,functionName:'setMerchant',args:[body.mandateId,body.merchantId,body.allowed]}),purpose:body.allowed?'Allow merchant and invalidate outstanding signatures':'Remove merchant and invalidate outstanding signatures'};
 },async prepare(body){
  const keys=['owner','agent','attestor','perTxLimit','periodLimit','humanThreshold','periodLength','expiry','allowance'];
  if(!body||Object.keys(body).some(k=>!keys.includes(k))||!keys.every(k=>Object.hasOwn(body,k)))throw new Error('invalid_setup');
  for(const key of ['owner','agent','attestor'])if(!address(body[key]))throw new Error('invalid_setup');
  const config=await chain.setupContext(body.owner);
  if(config.chainId!==1874||config.token.toLowerCase()!==token.toLowerCase())throw new Error('wrong_chain_or_token');
  const values={};for(const key of ['perTxLimit','periodLimit','humanThreshold','allowance']){
   values[key]=BigInt(parseHumanAmount(body[key],config.decimals));
   if(values[key]<=0n||values[key]>=1n<<128n)throw new Error('invalid_setup');
  }
  if(values.perTxLimit>values.periodLimit||values.allowance>values.periodLimit)throw new Error('invalid_setup');
  const periodLength=integer(body.periodLength),expiry=integer(body.expiry);
  if(periodLength===0n||expiry<=BigInt(clock()))throw new Error('invalid_setup');
  const params={agent:body.agent,attestor:body.attestor,perTxLimit:values.perTxLimit,periodLimit:values.periodLimit,humanThreshold:values.humanThreshold,periodLength,expiry,ensNamehash:zeroHash};
  const salt='0x'+randomBytes(32).toString('hex');
  const transactions=[];
  const tx=(to,data,purpose)=>({chainId:1874,from:body.owner,to,data,value:'0x0',purpose});
  if(BigInt(config.allowance)>0n)transactions.push(tx(token,encodeFunctionData({abi:erc20Abi,functionName:'approve',args:[mandateAddress,0n]}),'Reset existing USDT allowance to zero'));
  transactions.push(tx(token,encodeFunctionData({abi:erc20Abi,functionName:'approve',args:[mandateAddress,values.allowance]}),'Set the explicit limited USDT allowance'));
  transactions.push(tx(mandateAddress,encodeFunctionData({abi:contractAbi,functionName:'createMandate',args:[params,salt]}),'Create mandate with the connected wallet as treasury'));
  return {mandateId:mandateIdFor(body.owner,salt),mandateAddress,chainId:1874,token,decimals:config.decimals,salt,owner:body.owner,allowance:values.allowance.toString(),transactions,warning:'Allowance is shared across this owner’s mandates for this contract. Replacing it affects all of them. World identity onboarding and merchant allowlisting are separate required steps.'};
 }};
}
