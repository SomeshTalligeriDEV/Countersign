import {verifyWorldToken} from './world-token.mjs';
/**
 * Headless agent flow: RFC 8628 device grant per auth.world.org/docs/guides/oidc.
 * ponytail: module + tests only; not routed in server.mjs until an agent-side approval route needs it.
 */
export function createWorldDevice({metadata,issuer,clientId,clientSecret,keys,acr,fetchImpl=fetch,clock=()=>Math.floor(Date.now()/1000),sleep=s=>new Promise(r=>setTimeout(r,s*1000))}){
 const post=(url,body)=>fetchImpl(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,...body}),redirect:'error',signal:AbortSignal.timeout(10000)});
 return {
  async start(){
   const params={scope:'openid'};if(acr)params.acr_values=acr;
   const res=await post(metadata.device_authorization_endpoint,params);
   if(!res.ok)throw new Error('world_device_start_failed');
   const data=await res.json();
   if(typeof data.device_code!=='string')throw new Error('world_device_start_failed');
   return {deviceCode:data.device_code,userCode:data.user_code,verificationUri:data.verification_uri_complete||data.verification_uri,interval:data.interval||5,expiresIn:data.expires_in};
  },
  async poll({deviceCode,interval=5,startedAt=clock()}){
   for(;;){
    await sleep(interval);
    const res=await post(metadata.token_endpoint,{grant_type:'urn:ietf:params:oauth:grant-type:device_code',device_code:deviceCode});
    if(res.status===503)throw new Error('world_unavailable'); // never treat as approval
    const data=await res.json().catch(()=>({}));
    if(res.ok){
     if(typeof data.id_token!=='string')throw new Error('world_id_token_missing');
     // Device tokens omit nonce (docs); freshness is bound to this attempt's start time instead.
     const payload=await verifyWorldToken({token:data.id_token,keys,issuer,clientId,nonce:null,acr,now:clock()});
     if(payload.auth_time<startedAt)throw new Error('stale_auth');
     return payload;
    }
    if(data.error==='authorization_pending')continue;
    if(data.error==='slow_down'){interval+=5;continue;}
    throw new Error(data.error==='access_denied'?'denied':'world_device_failed');
   }
  },
 };
}
