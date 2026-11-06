import {test} from 'node:test';import assert from 'node:assert/strict';
import {runAll} from '../../demo-agent/src/run-all.mjs';import {attackIntent,submitAttack} from '../../demo-agent/src/attacks.mjs';
import {openStore} from '../src/store.mjs';import {Facilitator} from '../src/facilitator.mjs';import {GasGuard} from '../src/gasguard.mjs';import {Approvals} from '../src/approvals.mjs';import {createAttestor} from '../../attestor/src/attestor.mjs';import {createOwnerSignatureService} from '../src/owner-signature.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/test-signing.mjs';import {hashIntent,hashApproval,approvalFor,recoverOwner} from '../../../packages/shared/src/crypto.mjs';import {paymentDomain,paymentTypes} from '../../../packages/shared/src/index.ts';
test('six-step fake-chain demo executes in order with real signatures, approval and rejection checks',async()=>{
 const db=openStore(':memory:');try{
 const account=n=>privateKeyToAccount('0x'+n.toString(16).padStart(64,'0'));const owner=account(1),agent=account(2),attestor=account(3),address='0x'+'1'.repeat(40),id='0x'+'a'.repeat(64);let epoch=1n,spent=0n,broadcasts=0;
 const policy=()=>({owner:owner.address,agent:agent.address,attestor:attestor.address,epoch,expiry:2000n,perTxLimit:100000000n,humanThreshold:20000000n,paused:false});
 const chain={chainId:async()=>1874,policy:async()=>policy(),terms:async()=>({payout:address,registryVersion:'1',decimals:6}),remaining:async()=>50000000n-spent,verifyOwner:async(o,i,s)=>await recoverOwner(address,i,s)===o,simulatePay:async(i,_s,a)=>{if(i.amount+spent>50000000n)throw new Error('OverPeriod');if(i.amount>=policy().humanThreshold&&!a)throw new Error('approval required');return {gas:10n,maxFeePerGas:1n,intent:i};},broadcastPay:async prepared=>{spent+=prepared.intent.amount;broadcasts++;return '0x'+broadcasts.toString(16).padStart(64,'0');}};
 const service=new Facilitator({db,chain,mandateAddress:address,clock:()=>1000,guard:new GasGuard(db,{mandateAddress:address,dailyWei:1000n,mandateDailyWei:1000n,maxFeePerGas:2n})});
 const context={chain,account:agent,mandateId:id,merchantId:id,mandateAddress:address,clock:()=>1000};
 const fetchImpl=async(_u,init)=>{try{return Response.json(await service.settle(JSON.parse(init.body)),{status:202});}catch(error){const [kind,reason]=error.message.split(':');return Response.json({error:kind,reason},{status:409});}};
 let replay;
 const results=await runAll({print:()=>{},beforeReplay:async()=>{replay=await attackIntent({...context,name:'save-replay'});epoch++;},run:async step=>{
  if(['tamper-amount','tamper-payout','over-budget','replay-after-revoke'].includes(step)){const body=step==='replay-after-revoke'?replay:await attackIntent({...context,name:step});const result=await submitAttack({apiUrl:'http://localhost',fetchImpl,body,name:step});return {exitCode:0,output:JSON.stringify(result),fixtureOnly:true};}
  const body=await attackIntent({...context,name:'save-replay'});
  if(step==='buy-report'){assert.equal((await service.settle(body)).status,'submitted');return {exitCode:0,output:'fixture submitted, not real settlement',fixtureOnly:true};}
  body.intent.amount='40000000';body.agentSig=await agent.signTypedData({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentIntent',message:body.intent});
  const approvals=new Approvals(db),subject='0x'+'b'.repeat(64),approvalId=approvals.create({intent:body.intent,agentSig:body.agentSig,intentDigest:hashIntent(address,body.intent),approvalDigest:hashApproval(address,body.intent),ownerSubHash:subject},1000);
  // Explicit identity fixture, never a real World success.
  db.prepare("UPDATE approvals SET state='world_ok',auth_time=1000,world_sub_hash=owner_sub_hash WHERE id=?").run(approvalId);
  const signer=createAttestor({db,account:attestor,mandateAddress:address,clock:()=>1000});await signer.attest(approvalId);
  const signature=await owner.signTypedData({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentApproval',message:approvalFor(address,body.intent)});
  const owners=createOwnerSignatureService({db,chain,attestor:{attest:async()=>{}},executor:service,mandateAddress:address,clock:()=>1000});assert.equal((await owners.submit(approvalId,{signature})).status,'submitted');return {exitCode:0,output:'fixture approved/submitted, not real World or settlement',fixtureOnly:true};
 }});
 assert.equal(results.length,6);assert.equal(broadcasts,2);assert.equal(spent,40500000n);
 }finally{db.close();}
});
