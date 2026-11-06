export function approvalApi(apiUrl,webUrl,{fetchImpl=fetch}={}){
 for(const base of [apiUrl,webUrl]){const url=new URL(base);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))throw new Error('https_service_required');if(url.username||url.password)throw new Error('invalid_service_url');}
 async function request(path,body){
  const response=await fetchImpl(new URL(path,apiUrl),{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`approval_service_http_${response.status}`);return response.json();
 }
 return {async create(body){const result=await request('/v1/approvals',body);if(!/^[a-f0-9-]{36}$/.test(result.approvalId??''))throw new Error('invalid_approval_response');return {...result,approveUrl:new URL(`/approve/${result.approvalId}`,webUrl).href};},status:id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('invalid_approval_id');return request(`/v1/approvals/${id}`);}};
}
