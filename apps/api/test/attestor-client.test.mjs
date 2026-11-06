import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openStore} from '../src/store.mjs';
import {Approvals} from '../src/approvals.mjs';
import {createAttestorClient} from '../src/attestor-client.mjs';
import {createAttestor} from '../../attestor/src/attestor.mjs';
import {createAttestorHttp} from '../../attestor/src/http-app.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/test-signing.mjs';
import {hashIntent,hashApproval} from '../../../packages/shared/src/crypto.mjs';
const vector=JSON.parse(readFileSync(new URL('../../../packages/shared/vectors/payment.json',import.meta.url)));
test('API authenticates attestor, verifies signature and recovers lost response without re-signing',async()=>{
 const db=openStore(':memory:');try{
 const account=privateKeyToAccount('0x'+'0'.repeat(63)+'3'),address=vector.domain.verifyingContract,secret='a'.repeat(32);
 const intent={...vector.intent,deadline:1100};const approvals=new Approvals(db);
 const id=approvals.create({intentDigest:hashIntent(address,intent),approvalDigest:hashApproval(address,intent),intent,agentSig:'fixture',ownerSubHash:vector.attestation.ownerSubHash},1000);
 // Fixture identity only; no real issuer has verified this row.
 db.prepare("UPDATE approvals SET state='world_ok',auth_time=1000,world_sub_hash=owner_sub_hash WHERE id=?").run(id);
 let signatures=0,requests=0;
 const service=createAttestor({db,mandateAddress:address,clock:()=>1000,account:{signTypedData:async data=>{signatures++;return account.signTypedData(data);}}});
 const handle=createAttestorHttp({service,secret,clock:()=>1000});
 let epoch=3n;
 const client=createAttestorClient({db,mandateAddress:address,secret,clock:()=>1000,chain:{chainId:async()=>1874,policy:async()=>({attestor:account.address,epoch,expiry:2000n,paused:false})},fetchImpl:async(url,init)=>{requests++;assert.equal((await handle(new Request(url,init))).status,200);throw new Error('lost_response');}});
 const first=await client.attest(id);const second=await client.attest(id);
 assert.equal(first.signature,second.signature);assert.equal(signatures,1);assert.equal(requests,1);
 epoch=4n;await assert.rejects(client.attest(id),/stale_policy/);
 }finally{db.close();}
});
test('attestor client rejects non-loopback configuration',()=>{
 assert.throws(()=>createAttestorClient({url:'https://example.com'}),/loopback_attestor_required/);
});
