// Real network: discovery + JWKS against WORLD_ISSUER (or WORLD_ENV issuer). No login, no secrets.
import {createRequire} from 'node:module';
const {createRemoteJWKSet}=await import(createRequire(new URL('../apps/api/package.json',import.meta.url)).resolve('jose')); // jose is an apps/api dep
import {worldEnv} from '../apps/api/src/world-env.mjs';
const {env,issuer}=worldEnv();
const checks=[];const check=(name,ok,detail='')=>{checks.push(ok);console.log(`${ok?'PASS':'FAIL'} ${name}${detail?' '+detail:''}`);};
console.log(`World smoke ${new Date().toISOString()} env=${env} issuer=${issuer}`);
try{
 const res=await fetch(`${issuer}/.well-known/openid-configuration`,{redirect:'error',signal:AbortSignal.timeout(10000)});
 check('discovery http',res.ok,String(res.status));
 const m=await res.json();
 check('issuer matches',m.issuer===issuer,m.issuer);
 for(const k of ['authorization_endpoint','token_endpoint','jwks_uri'])check(`${k} same origin`,new URL(m[k]).origin===issuer,m[k]);
 check('PKCE S256',m.code_challenge_methods_supported?.includes('S256'));
 check('RS256 id_token',m.id_token_signing_alg_values_supported?.includes('RS256'));
 check('auth_time claim',m.claims_supported?.includes('auth_time'));
 check('iss in authz response',m.authorization_response_iss_parameter_supported===true);
 check('device grant',m.grant_types_supported?.includes('urn:ietf:params:oauth:grant-type:device_code'),m.device_authorization_endpoint??'');
 const jwks=await (await fetch(m.jwks_uri,{redirect:'error',signal:AbortSignal.timeout(10000)})).json();
 const rsa=(jwks.keys??[]).filter(k=>k.kty==='RSA');
 check('JWKS has RSA keys',rsa.length>0,rsa.map(k=>k.kid).join(','));
 // Resolve a key through jose's remote set to prove the validator can load it.
 const set=createRemoteJWKSet(new URL(m.jwks_uri));
 const key=await set({alg:'RS256',kid:rsa[0]?.kid});
 check('jose remote JWKS resolves kid',Boolean(key));
}catch(e){check('unexpected error',false,e.message);}
const ok=checks.every(Boolean);console.log(ok?'RESULT PASS':'RESULT FAIL');process.exit(ok?0:1);
