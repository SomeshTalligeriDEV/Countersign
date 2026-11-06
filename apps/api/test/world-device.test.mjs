import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT,exportJWK,createLocalJWKSet} from 'jose';
import {worldEnv} from '../src/world-env.mjs';
import {createWorldDevice} from '../src/world-device.mjs';
const issuer='https://sandbox.auth.world.org',clientId='client';
test('WORLD_ENV selects issuer and rejects mismatches',()=>{
 assert.deepEqual(worldEnv({}),{env:'sandbox',issuer});
 assert.equal(worldEnv({WORLD_ENV:'production'}).issuer,'https://auth.world.org');
 assert.equal(worldEnv({WORLD_ISSUER:'https://auth.world.org'}).env,'production');
 assert.throws(()=>worldEnv({WORLD_ENV:'prod'}),/unsupported_world_env/);
 assert.throws(()=>worldEnv({WORLD_ENV:'sandbox',WORLD_ISSUER:'https://auth.world.org'}),/world_env_issuer_mismatch/);
});
// FIXTURE: locally generated RSA key and fake token endpoint; not a World-issued token.
test('FIXTURE device flow polls pending/slow_down, verifies nonce-less token, rejects 503 and denial',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk={...await exportJWK(publicKey),kid:'k',alg:'RS256'};
 const keys=createLocalJWKSet({keys:[jwk]});const now=1_800_000_000;
 const token=await new SignJWT({auth_time:now,amr:['face']}).setProtectedHeader({alg:'RS256',kid:'k'}).setIssuer(issuer).setAudience(clientId).setSubject('sub').setIssuedAt(now).setExpirationTime(now+300).sign(privateKey);
 const replies=[[400,{error:'authorization_pending'}],[400,{error:'slow_down'}],[200,{id_token:token}]];const waits=[];
 const fetchImpl=async url=>{const [s,b]=url.endsWith('device_authorization')?[200,{device_code:'d',user_code:'U',verification_uri:'https://x',interval:5}]:replies.shift();return new Response(JSON.stringify(b),{status:s});};
 const metadata={device_authorization_endpoint:`${issuer}/api/v1/device_authorization`,token_endpoint:`${issuer}/api/v1/token`};
 const device=createWorldDevice({metadata,issuer,clientId,clientSecret:'s',keys,fetchImpl,clock:()=>now,sleep:async s=>{waits.push(s);}});
 const start=await device.start();assert.equal(start.deviceCode,'d');
 assert.equal((await device.poll({deviceCode:'d',interval:start.interval,startedAt:now})).sub,'sub');
 assert.deepEqual(waits,[5,5,10]);
 replies.push([200,{id_token:token}]);await assert.rejects(device.poll({deviceCode:'d',startedAt:now+1}),/stale_auth/);
 replies.push([503,{}]);await assert.rejects(device.poll({deviceCode:'d',startedAt:now}),/world_unavailable/);
 replies.push([400,{error:'access_denied'}]);await assert.rejects(device.poll({deviceCode:'d',startedAt:now}),/denied/);
});
