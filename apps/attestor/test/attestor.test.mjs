import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openStore} from '../../api/src/store.mjs';
import {Approvals} from '../../api/src/approvals.mjs';
import {createAttestor} from '../src/attestor.mjs';
import {hashIntent,hashApproval} from '../../../packages/shared/src/crypto.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/test-signing.mjs';
const vector=JSON.parse(readFileSync(new URL('../../../packages/shared/vectors/payment.json',import.meta.url)));
function setup(){
 const db=openStore(':memory:');const approvals=new Approvals(db);const intent={...vector.intent,deadline:1100};
 const id=approvals.create({intentDigest:hashIntent(vector.domain.verifyingContract,intent),approvalDigest:hashApproval(vector.domain.verifyingContract,intent),intent,agentSig:'fixture',ownerSubHash:vector.attestation.ownerSubHash},1000);
 const account=privateKeyToAccount('0x'+'0'.repeat(63)+'3');
 const service=createAttestor({db,account,mandateAddress:vector.domain.verifyingContract,clock:()=>1000});
 return {db,id,service};
}
test('attestor refuses pending identity and recomputes stored digest before signing once',async()=>{
 const {db,id,service}=setup();try{
 await assert.rejects(service.attest(id),/attestation_refused/);
 // Explicit fixture identity, NOT a verified World token.
 db.prepare("UPDATE approvals SET state='world_ok',auth_time=1000,world_sub_hash=owner_sub_hash WHERE id=?").run(id);
 const result=await service.attest(id);assert.match(result.signature,/^0x[0-9a-f]{130}$/);
 await assert.rejects(service.attest(id),/attestation_refused/);
 }finally{db.close();}
});
test('tampered stored digest cannot obtain attestation or consume claim',async()=>{
 const {db,id,service}=setup();try{
 db.prepare("UPDATE approvals SET state='world_ok',auth_time=1000,world_sub_hash=owner_sub_hash,approval_digest=? WHERE id=?").run('0x'+'0'.repeat(64),id);
 await assert.rejects(service.attest(id),/stored_digest_mismatch/);
 assert.equal(db.prepare('SELECT attested FROM approvals').get().attested,0);
 }finally{db.close();}
});
