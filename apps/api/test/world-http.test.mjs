import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorldHttp} from '../src/world-http.mjs';
const id='12345678-1234-1234-1234-123456789012',browser='a'.repeat(43);
test('World browser routes set secure binding cookie and clear it on callback',async()=>{
 let received;
 // Transport fixture only; does not validate a World token.
 const route=createWorldHttp({publicOrigin:'https://api.example',oidc:{start:()=>({browser,url:'https://sandbox.auth.world.org/authorize'}),callback:async data=>{received=data;return {approvalId:id,status:'world_ok'};}}});
 const start=await route(new Request(`https://api.example/auth/world/start?approvalId=${id}`));
 assert.equal(start.status,302);const cookie=start.headers.get('set-cookie');
 for(const flag of ['__Host-','HttpOnly','SameSite=Lax','Secure','Max-Age=120'])assert.ok(cookie.includes(flag));
 const response=await route(new Request('https://api.example/auth/world/callback?state=state&iss=https://sandbox.auth.world.org&code=code',{headers:{cookie:`__Host-countersign-world=${browser}`}}));
 assert.equal(response.status,200);assert.equal(received.browser,browser);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal((await response.json()).next,'owner_wallet_signature_required');
});
test('World callback rejects missing browser cookie and duplicate parameters before verifier',async()=>{
 let calls=0;const route=createWorldHttp({publicOrigin:'https://api.example',oidc:{callback:async()=>{calls++;}}});
 assert.equal((await route(new Request('https://api.example/auth/world/callback?state=a'))).status,400);
 assert.equal((await route(new Request('https://api.example/auth/world/callback?state=a&state=b'))).status,400);assert.equal(calls,0);
 const disabled=createWorldHttp({publicOrigin:'http://localhost:3001'});assert.equal((await disabled(new Request('http://localhost:3001/auth/world/start'))).status,503);
});
