import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAttestorHttp} from '../src/http-app.mjs';
import {signWebhook} from '../../../packages/merchant/src/webhooks.mjs';
const secret='a'.repeat(32),id='12345678-1234-1234-1234-123456789012';
test('attestor HTTP authenticates raw body and never accepts caller-supplied digest',async()=>{
 let calls=0;
 const app=createAttestorHttp({secret,clock:()=>1000,service:{attest:async approvalId=>{calls++;assert.equal(approvalId,id);return {signature:'fixture'};}}});
 const request=(body,header)=>new Request('http://localhost/attest',{method:'POST',headers:header?{'x-countersign-attestor-signature':header}:{},body});
 const body=Buffer.from(JSON.stringify({approvalId:id}));const header=signWebhook(secret,body,1000);
 assert.equal((await app(request(body))).status,401);
 assert.equal((await app(request(body,header))).status,200);
 assert.equal((await app(request(Buffer.from('{}'),header))).status,401);
 const injected=Buffer.from(JSON.stringify({approvalId:id,approvalDigest:'evil'}));
 assert.equal((await app(request(injected,signWebhook(secret,injected,1000)))).status,400);
 assert.equal((await app(request(body,signWebhook(secret,body,1)))).status,401);
 assert.equal(calls,1);
});
