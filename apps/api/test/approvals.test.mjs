import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../src/store.mjs';
import { Approvals } from '../src/approvals.mjs';
const digest=`0x${'a'.repeat(64)}`;
function setup(){const db=openStore(':memory:');const service=new Approvals(db);const id=service.create({intentDigest:digest,approvalDigest:digest,intent:{deadline:1180},agentSig:'test-signature',ownerSubHash:digest},1000);const flow=service.begin(id,1000);return {db,service,id,flow};}
const config={issuer:'https://issuer.invalid',audience:'client',subjectHash:digest};
function claims(flow){return {iss:config.issuer,aud:'client',sub:'owner',nonce:flow.nonce,auth_time:1000,exp:1200};}
test('A-10 callback and attestation are single-use',()=>{const {db,service,id,flow}=setup();service.consume(flow.state,flow.browser,1001);assert.throws(()=>service.consume(flow.state,flow.browser,1001),/callback_used/);service.verifyClaims(id,claims(flow),config,1001);assert.equal(service.claimAttestation(id,1001).attested,1);assert.throws(()=>service.claimAttestation(id,1001),/refused/);db.close();});
test('A-06 binds callback to initiating browser',()=>{const {db,service,flow}=setup();assert.throws(()=>service.consume(flow.state,'other-browser',1001),/invalid_oauth/);assert.ok(service.consume(flow.state,flow.browser,1001));db.close();});
test('A-07 rejects another human',()=>{const {db,service,id,flow}=setup();service.consume(flow.state,flow.browser,1001);assert.throws(()=>service.verifyClaims(id,claims(flow),{...config,subjectHash:`0x${'b'.repeat(64)}`},1001),/wrong_human/);assert.throws(()=>service.claimAttestation(id,1001),/refused/);db.close();});
test('A-08 rejects future and stale authentication',()=>{for(const auth_time of [800,1002]){const {db,service,id,flow}=setup();service.consume(flow.state,flow.browser,1001);assert.throws(()=>service.verifyClaims(id,{...claims(flow),auth_time},config,1001),/stale_auth/);db.close();}});
test('A-09 expires at TTL and cannot attest',()=>{const {db,service,id}=setup();assert.equal(service.get(id,1120).state,'expired');assert.throws(()=>service.claimAttestation(id,1120),/refused/);db.close();});
test('A-05 denied approval cannot attest',()=>{const {db,service,id}=setup();assert.equal(service.deny(id,1001),true);assert.throws(()=>service.claimAttestation(id,1001),/refused/);db.close();});
test('durable digest uniqueness returns existing approval instead of creating a duplicate',()=>{
 const {db,service,id}=setup();try{
 const repeated=service.create({intentDigest:digest,approvalDigest:digest,intent:{deadline:1180},agentSig:'test-signature',ownerSubHash:digest},1000);
 assert.equal(repeated,id);assert.equal(db.prepare('SELECT count(*) AS n FROM approvals').get().n,1);
 }finally{db.close();}
});
