import { forwardHeaders } from '@/lib/countersign-forward';
async function proxy(request:Request,id:string,method:'GET'|'POST'){
 const headers={'Cache-Control':'no-store'};
 if(!/^0x[\da-fA-F]{64}$/.test(id))return Response.json({error:'Invalid merchant ID.'},{status:400,headers});
 if(method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Same-origin request required.'},{status:403,headers});
 const base=process.env.COUNTERSIGN_API_URL;if(!base)return Response.json({error:'Merchant service not configured.'},{status:503,headers});
 try{let body;if(method==='POST'){const raw=await request.text();if(raw.length>1000)throw new Error('too_large');body=JSON.stringify({...JSON.parse(raw),merchantId:id});}
  const response=await fetch(new URL(method==='GET'?`/v1/merchants/${id}`:'/v1/merchant/prepare',base),{method,body,headers:forwardHeaders(request,body?{'content-type':'application/json'}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return Response.json({error:'Merchant request failed. Check ownership, registration and network.'},{status:response.status,headers});return Response.json(await response.json(),{headers});
 }catch{return Response.json({error:'Merchant data unavailable. No transaction status is assumed.'},{status:503,headers});}
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return proxy(request,(await params).id,'GET');}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return proxy(request,(await params).id,'POST');}
