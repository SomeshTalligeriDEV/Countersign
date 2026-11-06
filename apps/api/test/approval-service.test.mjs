import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openStore} from '../src/store.mjs';
import {createApprovalService} from '../src/approval-service.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/test-signing.mjs';
import {paymentDomain,paymentTypes} from '../../../packages/shared/src/index.ts';
const vector=JSON.parse(readFileSync(new URL('../../../packages/shared/vectors/payment.json',import.meta.url)));
async function fixture(){
 const db=openStore(':memory:');const account=privateKeyToAccount('0x'+'0'.repeat(63)+'2');
 const intent=Object.fromEntries(Object.entries({...vector.intent,deadline:1100}).map(([k,v])=>[k,String(v)]));
 const agentSig=await account.signTypedData({domain:paymentDomain(vector.domain.verifyingContract),types:paymentTypes,primaryType:'PaymentIntent',message:intent});
 const options={db,mandateAddress:vector.domain.verifyingContract,clock:()=>1000,chain:{chainId:async()=>1874,policy:async()=>({owner:account.address,agent:account.address,epoch:3n,expiry:2000n,perTxLimit:1000000n,humanThreshold:500000n,paused:false})},ownerBinding:async()=>({owner:account.address,subjectHash:vector.attestation.ownerSubHash})};
 return {db,options,body:{intent,agentSig}};
}
test('approval requests authenticate signed intent and expose only safe polling/terms fields',async()=>{
 const {db,options,body}=await fixture();try{
 const service=createApprovalService(options);const result=await service.create(body);
 assert.equal(result.status,'pending_human');assert.equal((await service.create(body)).approvalId,result.approvalId);
 const terms=service.terms(result.approvalId);assert.equal(terms.typedData.primaryType,'PaymentApproval');assert.equal(terms.intent.amount,'500000');
 for(const secret of ['agent_sig','owner_sub_hash','verifier','nonce','oauth_state_hash'])assert.equal(secret in terms,false);
 await assert.rejects(service.create({...body,intent:{...body.intent,amount:'500001'}}),/bad_intent_sig/);
 }finally{db.close();}
});
test('missing verified owner binding cannot create a human approval',async()=>{
 const {db,options,body}=await fixture();try{
 const service=createApprovalService({...options,ownerBinding:async()=>null});
 await assert.rejects(service.create(body),/owner_not_onboarded/);
 assert.equal(db.prepare('SELECT count(*) AS n FROM approvals').get().n,0);
 }finally{db.close();}
});
