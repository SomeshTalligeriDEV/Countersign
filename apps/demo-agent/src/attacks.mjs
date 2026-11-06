import {randomBytes} from 'node:crypto';
import {paymentDomain,paymentTypes} from '../../../packages/shared/src/index.ts';
import {parseHumanAmount} from '../../../packages/shared/src/amount.mjs';
import {resourceHash} from '../../../packages/shared/src/crypto.mjs';
export async function attackIntent({name,chain,account,mandateId,merchantId,mandateAddress,clock=()=>Math.floor(Date.now()/1000)}){
 if(!['tamper-amount','tamper-payout','over-budget','save-replay'].includes(name))throw new Error('invalid_scenario');
 if(await chain.chainId()!==1874)throw new Error('wrong_chain');
 const [policy,terms,remaining]=await Promise.all([chain.policy(mandateId),chain.terms(merchantId),chain.remaining(mandateId)]);
 const amount=name==='over-budget'?BigInt(remaining)+1n:BigInt(parseHumanAmount('0.50',terms.decimals));
 const intent={mandateId,merchantId,payout:terms.payout,registryVersion:String(terms.registryVersion),amount:amount.toString(),orderId:'0x'+randomBytes(32).toString('hex'),resourceHash:resourceHash('GET','/api/report'),nonce:BigInt('0x'+randomBytes(32).toString('hex')).toString(),epoch:String(policy.epoch),deadline:String(clock()+180)};
 const agentSig=await account.signTypedData({domain:paymentDomain(mandateAddress),types:paymentTypes,primaryType:'PaymentIntent',message:intent});
 if(name==='tamper-amount')intent.amount=(amount+1n).toString();
 if(name==='tamper-payout')intent.payout=terms.payout.toLowerCase()==='0x0000000000000000000000000000000000000001'?'0x0000000000000000000000000000000000000002':'0x0000000000000000000000000000000000000001';
 return {intent,agentSig};
}
export async function submitAttack({apiUrl,body,name,fetchImpl=fetch}){
 const url=new URL(apiUrl);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('https_api_required');
 const response=await fetchImpl(new URL('/v1/settle',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 if(response.ok)throw new Error('ATTACK_ACCEPTED: inspect returned transaction; no rejection claimed');
 const expected=name==='replay-after-revoke'?'StaleEpoch':name==='over-budget'?'gasguard_rejected':'bad_intent_sig';
 // Over-budget is rejected either by the API's pre-read of the contract policy (contract error name) or by GasGuard simulation.
 const budgetRevert=name==='over-budget'&&['OverPerTx','OverPeriod'].includes(result.error);
 if(!budgetRevert&&(result.error!==expected||(name==='over-budget'&&result.reason!=='would_revert')))throw new Error(`Scenario not demonstrated: ${result.error??'unknown'} ${result.reason??''}`);
 return {scenario:name,status:'rejected',error:result.error,reason:result.reason??null,evidence:'API/GasGuard rejection; no onchain revert transaction claimed'};
}
