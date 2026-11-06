/** Server-configured facilitator URL; never derive it from a request header. */
export function facilitatorApi(apiUrl,{fetchImpl=fetch}={}){
 const base=new URL(apiUrl);
 if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname)))throw new Error('https_facilitator_required');
 if(base.username||base.password||base.search||base.hash)throw new Error('invalid_facilitator_url');
 async function request(path,body){
  const response=await fetchImpl(new URL(path,base),{method:body?'POST':'GET',headers:{accept:'application/json',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(response.status===404&&path.startsWith('/v1/payments/'))return null;
  if(!(response.headers.get('content-type')??'').includes('application/json'))throw new Error('invalid_facilitator_response');
  const data=await response.json();
  if(!response.ok&&!(response.status===409&&data.error))throw new Error('facilitator_unavailable');
  return data;
 }
 return {terms:id=>request(`/v1/terms/${encodeURIComponent(id)}`),receipt:id=>request(`/v1/payments/${encodeURIComponent(id)}`),settle:body=>request('/v1/settle',body)};
}
