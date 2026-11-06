import test from 'node:test';import assert from 'node:assert/strict';
import {cimdDocument} from '../src/world-cimd.mjs';
test('CIMD document is a public client listing both callbacks on the client_id origin',()=>{
 const d=cimdDocument('https://x.example/.well-known/world-client.json','https://x.example/auth/world/callback');
 assert.equal(d.client_id,'https://x.example/.well-known/world-client.json');
 assert.deepEqual(d.redirect_uris,['https://x.example/auth/world/callback','https://x.example/auth/world/onboard/callback']);
 assert.equal(d.token_endpoint_auth_method,'none');
 assert.throws(()=>cimdDocument('https://a.example/c.json','https://b.example/auth/world/callback'),/cimd_origin_mismatch/);
});
