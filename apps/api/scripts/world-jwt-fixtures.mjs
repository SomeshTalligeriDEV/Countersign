// Local signed identities only. This never contacts or impersonates the real issuer.
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT,createLocalJWKSet} from 'jose';
import {verifyWorldToken} from '../src/world-token.mjs';
import {Approvals} from '../src/approvals.mjs';
import {openStore} from '../src/store.mjs';
import {worldSubjectHash} from '../../../packages/shared/src/crypto.mjs';
const issuer='https://sandbox.auth.world.org',clientId='fixture-client',now=1000;
const {privateKey,publicKey}=await generateKeyPair('RS256');
const jwk=await exportJWK(publicKey);jwk.kid='fixture';
const keys=createLocalJWKSet({keys:[jwk]});
async function scenario(changes={},expected){
 const db=openStore(':memory:');try{
 const service=new Approvals(db),digest='0x'+'1'.repeat(64);
 const id=service.create({intentDigest:digest,approvalDigest:digest,intent:{deadline:1100},agentSig:'fixture',ownerSubHash:worldSubjectHash(issuer,'owner')},now);
 const flow=service.begin(id,now);service.consume(flow.state,flow.browser,now);
 const claims={iss:issuer,aud:clientId,sub:'owner',iat:now,exp:1100,auth_time:now,nonce:flow.nonce,...changes};
 const token=await new SignJWT(claims).setProtectedHeader({alg:'RS256',kid:'fixture'}).sign(privateKey);
 const verify=async()=>{const payload=await verifyWorldToken({token,keys,issuer,clientId,nonce:flow.nonce,now});service.verifyClaims(id,payload,{issuer,audience:clientId,subjectHash:worldSubjectHash(issuer,payload.sub)},now);};
 if(expected)await assert.rejects(verify,expected);else{await verify();assert.equal(service.get(id,now).state,'world_ok');}
 }finally{db.close();}
}
await scenario();await scenario({sub:'other'},/wrong_human/);await scenario({auth_time:800},/stale_auth/);
// Expired JWT must fail cryptographically.
await assert.rejects(scenario({exp:999}),/exp/);
await scenario({nonce:'wrong'},/invalid_nonce/);
console.log('Signed local JWT fixtures passed; NOT real World verification.');
