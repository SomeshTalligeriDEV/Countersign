import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAgent} from '../src/index.mjs';
import {privateKeyToAccount} from '../../shared/src/test-signing.mjs';
import {recoverAgent,resourceHash} from '../../shared/src/crypto.mjs';
import {USDT_ADDRESS} from '../../shared/src/index.ts';
const hash='0x'+'1'.repeat(64),address='0x'+'2'.repeat(40);
function fixture(){
 const account=privateKeyToAccount('0x'+'0'.repeat(63)+'2');
 const quote={scheme:'countersign-v1',chainId:1874,mandateContract:address,token:USDT_ADDRESS,merchantId:hash,payout:address,registryVersion:'1',amount:'500000',orderId:hash,resourceHash:resourceHash('GET','/api/report'),deadline:'1060'};
 const policy={agent:account.address,paused:false,expiry:2000n,perTxLimit:1000000n,remaining:2000000n,humanThreshold:1000000n,epoch:1n};
 const options={account,mandateId:hash,mandateAddress:address,merchantIds:[hash],maxAmount:1000000n,readPolicy:async()=>policy,clock:()=>1000};
 return {quote,policy,options};
}
test('agent signs exact intent and retries same signature until confirmation',async()=>{
 const {quote,options}=fixture();let signedHeader;let calls=0;
 const agent=createAgent({...options,fetchImpl:async(_url,init)=>{
 calls++;const header=init.headers.get('x-payment');
 if(!header)return Response.json(quote,{status:402});
 if(!signedHeader){signedHeader=header;const payment=JSON.parse(Buffer.from(header,'base64url').toString());assert.equal(await recoverAgent(address,payment.intent,payment.agentSig),options.account.address);assert.equal(payment.intent.amount,'500000');}
 else assert.equal(header,signedHeader);
 return calls<3?Response.json({status:'pending_confirmation'},{status:202}):Response.json({report:'fixture'});
 }});
 const pending=await agent.fetch('http://localhost:4000/api/report');assert.equal(pending.status,'pending_confirmation');
 const done=await pending.retry();assert.equal(done.status,'response');assert.equal(done.response.status,200);assert.equal(calls,3);
});
test('agent refuses altered resource, foreign token and excess budget without signing',async()=>{
 for(const mode of ['resource','token','budget']){
 const {quote,policy,options}=fixture();let signed=false;
 if(mode==='resource')quote.resourceHash=hash;if(mode==='token')quote.token=address;if(mode==='budget')policy.remaining=1n;
 const agent=createAgent({...options,account:{address:options.account.address,signTypedData:async()=>{signed=true;throw new Error('must not sign');}},fetchImpl:async()=>Response.json(quote,{status:402})});
 await assert.rejects(agent.fetch('http://localhost:4000/api/report'));assert.equal(signed,false);
 }
});
test('above-threshold request explicitly requires approval without signature or broadcast',async()=>{
 const {quote,policy,options}=fixture();policy.humanThreshold=500000n;let calls=0;
 const agent=createAgent({...options,account:{address:options.account.address,signTypedData:async()=>assert.fail()},fetchImpl:async()=>{calls++;return Response.json(quote,{status:402});}});
 assert.equal((await agent.fetch('http://localhost:4000/api/report')).status,'approval_required');assert.equal(calls,1);
});
test('configured threshold path signs exact intent and creates an approval without paying',async()=>{
 const {quote,policy,options}=fixture();policy.humanThreshold=500000n;let requests=0,created=0;
 const agent=createAgent({...options,approvalApi:{create:async body=>{created++;assert.equal(await recoverAgent(address,body.intent,body.agentSig),options.account.address);return {approvalId:'fixture-approval',approveUrl:'http://localhost/approve/fixture-approval'};},status:async()=>({status:'pending_human'})},fetchImpl:async()=>{requests++;return Response.json(quote,{status:402});}});
 const result=await agent.fetch('http://localhost:4000/api/report');assert.equal(result.status,'pending_human');assert.equal(created,1);assert.equal(requests,1);assert.equal((await result.check()).status,'pending_human');
});
