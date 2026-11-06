const errors=new Set(['denied','wrong_human','stale_auth','approval_not_pending','approval_not_found','callback_used_or_expired','invalid_oauth_state','world_issuer_mismatch']);
export function createWorldHttp({oidc,publicOrigin,pathPrefix='/auth/world'}){
 const origin=new URL(publicOrigin);
 const secure=origin.protocol==='https:';
 if(!secure&&!(origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname)))throw new Error('https_world_origin_required');
 if(origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('invalid_world_origin');
 const name=secure?'__Host-countersign-world':'countersign-world-local';
 const cookie=(value,age)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure?'; Secure':''}`;
 const respond=(data,status,clear=false)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...(clear?{'set-cookie':cookie('',0)}:{})}});
 return async request=>{
  const url=new URL(request.url),path=url.pathname;
  if(![`${pathPrefix}/start`,`${pathPrefix}/callback`].includes(path))return null;
  if(request.method!=='GET')return respond({error:'method_not_allowed'},405);
  if(!oidc)return respond({error:'world_not_configured'},503);
  for(const key of url.searchParams.keys())if(url.searchParams.getAll(key).length!==1)return respond({error:'ambiguous_parameters'},400);
  try{
   if(path.endsWith('/start')){
    const id=url.searchParams.get('approvalId');
    if(!/^[0-9a-f-]{36}$/.test(id??''))return respond({error:'invalid_approval_id'},400);
    const flow=oidc.start(id);
    if(!/^[A-Za-z0-9_-]{43}$/.test(flow.browser))throw new Error('invalid_browser_binding');
    const destination=new URL(flow.url);
    if(!['https://sandbox.auth.world.org','https://auth.world.org'].includes(destination.origin))throw new Error('invalid_authorization_url');
    return new Response(null,{status:302,headers:{location:flow.url,'set-cookie':cookie(flow.browser,120),'cache-control':'no-store','referrer-policy':'no-referrer'}});
   }
   const cookies=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));
   if(cookies.length!==1)return respond({error:'invalid_oauth_state'},400,true);
   const browser=cookies[0].slice(name.length+1);
   const state=url.searchParams.get('state');
   if(!/^[A-Za-z0-9_-]{43}$/.test(browser)||!state||state.length>256)return respond({error:'invalid_oauth_state'},400,true);
   if(url.searchParams.has('code')&&url.searchParams.has('error'))return respond({error:'ambiguous_parameters'},400,true);
   const result=await oidc.callback({browser,state,iss:url.searchParams.get('iss'),code:url.searchParams.get('code'),error:url.searchParams.get('error')});
   return respond({approvalId:result.approvalId,status:result.status,next:'owner_wallet_signature_required'},200,true);
  }catch(error){return respond({error:errors.has(error.message)?error.message:'world_verification_failed'},400,path.endsWith('/callback'));}
 };
}
