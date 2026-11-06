import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorldOidc} from '../src/world-oidc.mjs';
test('World configuration fails closed before any network or token handling',async()=>{
 await assert.rejects(createWorldOidc({issuer:'https://evil.invalid'}),/unsupported_world_issuer/);
 await assert.rejects(createWorldOidc({issuer:'https://sandbox.auth.world.org'}),/world_credentials_required/);
 await assert.rejects(createWorldOidc({issuer:'https://sandbox.auth.world.org',clientId:'id',clientSecret:'secret',redirectUri:'http://public.example/callback'}),/invalid_world_redirect/);
});
