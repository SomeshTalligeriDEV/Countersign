import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../src/store.mjs';
import {createOwnerBinding} from '../src/owner-binding.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/test-signing.mjs';
import {recoverWalletMessage} from '../../../packages/shared/src/crypto.mjs';
const issuer='https://sandbox.auth.world.org',mandate='0x'+'a'.repeat(64);
test('owner binding requires verified identity plus matching wallet and forbids rebinding',async()=>{
 const db=openStore(':memory:');try{
 const wallet=privateKeyToAccount('0x'+'0'.repeat(63)+'1');
 const service=createOwnerBinding({db,issuer,clientId:'client',clock:()=>1000,chain:{chainId:async()=>1874,policy:async()=>({owner:wallet.address}),verifyWalletMessage:async(owner,message,signature)=>{try{return await recoverWalletMessage(message,signature)===owner;}catch{return false;}}}});
 const first=await service.create(mandate);assert.equal(service.lookup(mandate,wallet.address),null);assert.throws(()=>service.terms(first.onboardingId),/identity_not_verified/);
 async function verify(id,sub){const flow=service.begin(id);service.consume(flow.state,flow.browser);service.verifyClaims(id,{iss:issuer,aud:'client',sub,nonce:flow.nonce,auth_time:1000,exp:1100});}
 // Explicit claim fixture only; signed JWT path is tested separately.
 await verify(first.onboardingId,'owner');const terms=service.terms(first.onboardingId);
 await assert.rejects(service.complete(first.onboardingId,'0x1234'),/bad_owner_signature/);
 const signature=await wallet.signMessage({message:terms.message});assert.equal((await service.complete(first.onboardingId,signature)).status,'bound');
 assert.ok(service.lookup(mandate,wallet.address));
 await assert.rejects(service.complete(first.onboardingId,signature),/identity_not_verified/);
 const next=await service.create(mandate);await verify(next.onboardingId,'another-human');const other=service.terms(next.onboardingId);
 await assert.rejects(service.complete(next.onboardingId,await wallet.signMessage({message:other.message})),/identity_rebinding_forbidden/);
 }finally{db.close();}
});
