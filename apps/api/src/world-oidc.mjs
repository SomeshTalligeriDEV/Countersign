import {verifyWorldToken} from './world-token.mjs';
import {worldSubjectHash} from '../../../packages/shared/src/crypto.mjs';
/** Production verifier is always jose; no injectable bypass for JWT validation. */
export async function createWorldOidc({approvals,issuer,clientId,clientSecret,redirectUri,acr,fetchImpl=fetch,clock=()=>Math.floor(Date.now()/1000)}){
 if(!['https://sandbox.auth.world.org','https://auth.world.org'].includes(issuer))throw new Error('unsupported_world_issuer');
 if(!clientId||!clientSecret)throw new Error('world_credentials_required');
 const redirect=new URL(redirectUri);
 if(redirect.protocol!=='https:'&&!(redirect.protocol==='http:'&&['127.0.0.1','localhost'].includes(redirect.hostname)))throw new Error('invalid_world_redirect');
 if(redirect.username||redirect.password||redirect.hash)throw new Error('invalid_world_redirect');
 const {createRemoteJWKSet}=await import('jose');
 const response=await fetchImpl(`${issuer}/.well-known/openid-configuration`,{redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('world_discovery_unavailable');
 const metadata=await response.json();
 if(metadata.issuer!==issuer)throw new Error('world_issuer_mismatch');
 for(const key of ['authorization_endpoint','token_endpoint','jwks_uri']){
  const endpoint=new URL(metadata[key]);
  if(endpoint.origin!==issuer||endpoint.username||endpoint.password||endpoint.hash)throw new Error('untrusted_world_endpoint');
 }
 const keys=createRemoteJWKSet(new URL(metadata.jwks_uri),{timeoutDuration:10000});
 return {
  start(approvalId){
   const flow=approvals.begin(approvalId,clock());
   const url=new URL(metadata.authorization_endpoint);
   const params={client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:'openid',state:flow.state,nonce:flow.nonce,code_challenge:flow.challenge,code_challenge_method:'S256',max_age:'0'};
   if(acr)params.acr_values=acr;
   for(const [key,value]of Object.entries(params))url.searchParams.set(key,value);
   return {url:url.href,browser:flow.browser};
  },
  async callback({state,browser,iss,code,error}){
   if(iss!==issuer)throw new Error('world_issuer_mismatch');
   const row=approvals.consume(state,browser,clock());
   if(error){approvals.deny(row.id,clock());throw new Error(error==='access_denied'?'denied':'world_authorization_failed');}
   try{
    if(typeof code!=='string'||!code||code.length>4096)throw new Error('invalid_authorization_code');
    const tokenResponse=await fetchImpl(metadata.token_endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code,code_verifier:row.verifier}),redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!tokenResponse.ok)throw new Error('world_token_exchange_failed');
    const tokens=await tokenResponse.json();
    if(typeof tokens.id_token!=='string')throw new Error('world_id_token_missing');
    const payload=await verifyWorldToken({token:tokens.id_token,keys,issuer,clientId,nonce:row.nonce,acr,now:clock()});
    approvals.verifyClaims(row.id,payload,{issuer,audience:clientId,subjectHash:worldSubjectHash(issuer,payload.sub)},clock());
    return {approvalId:row.id,status:'world_ok'};
   }catch(error){
    // Preserve specific wrong_human/stale_auth states set by verifyClaims.
    if(approvals.fail)approvals.fail(row.id);
    else approvals.db.prepare("UPDATE approvals SET state='failed' WHERE id=? AND state='pending_human'").run(row.id);
    throw error;
   }
  },
 };
}
