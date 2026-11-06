import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openStore} from '../src/store.mjs';
import {Approvals} from '../src/approvals.mjs';
import {createOwnerSignatureService} from '../src/owner-signature.mjs';
import {hashIntent,hashApproval,approvalFor,recoverOwner} from '../../../packages/shared/src/crypto.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/test-signing.mjs';
import {paymentDomain,paymentTypes} from '../../../packages/shared/src/index.ts';
const vector=JSON.parse(readFileSync(new URL('../../../packages/shared/vectors/payment.json',import.meta.url)));
test('owner authorization requires fresh attestation and exact owner signature; never claims settlement',async()=>{
 const db=openStore(':memory:');try{
 const address=vector.domain.verifyingContract,intent={...vector.intent,deadline:1100},account=privateKeyToAccount('0x'+'0'.repeat(63)+'1');
 const approvals=new Approvals(db);const id=approvals.create({intentDigest:hashIntent(address,intent),approvalDigest:hashApproval(address,intent),intent,agentSig:'fixture',ownerSubHash:vector.attestation.ownerSubHash},1000);
 const service=createOwnerSignatureService({db,mandateAddress:address,clock:()=>1000,attestor:{attest:async()=>{}},chain:{chainId:async()=>1874,policy:async()=>({owner:account.address,epoch:3n,expiry:2000n,paused:false}),verifyOwner:async(owner,i,sig)=>{try{return await recoverOwner(address,i,sig)===owner;}catch{return false;}}}});
 const signature=await account.signTypedData({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentApproval',message:approvalFor(address,intent)});
 await assert.rejects(service.submit(id,{signature}),/approval_not_ready/);
 // Fixture verification state: not a real World issuer success.
 db.prepare("UPDATE approvals SET state='world_ok',attested=1,auth_time=1000,world_sub_hash=owner_sub_hash WHERE id=?").run(id);
 await assert.rejects(service.submit(id,{signature:'0x1234'}),/bad_owner_signature/);
 assert.deepEqual(await service.submit(id,{signature}),{approvalId:id,status:'owner_signed',settled:false});
 await assert.rejects(service.submit(id,{signature}),/approval_not_ready/);
 assert.equal(db.prepare('SELECT count(*) AS n FROM owner_signatures').get().n,1);
 }finally{db.close();}
});
