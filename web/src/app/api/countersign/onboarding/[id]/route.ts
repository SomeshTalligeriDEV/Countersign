async function proxy(request:Request,id:string,method:'GET'|'POST'){
 const headers={'Cache-Control':'no-store'};
 if(!/^[a-f0-9-]{36}$/.test(id))return Response.json({error:'Invalid request ID.'},{status:400,headers});
 if(method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Same-origin request required.'},{status:403,headers});
 const base=process.env.COUNTERSIGN_API_URL;if(!base)return Response.json({error:'World onboarding unavailable.'},{status:503,headers});
 try{
  let body;
  if(method==='POST'){const raw=await request.text();if(raw.length>10000)throw new Error('too_large');const data=JSON.parse(raw);body=JSON.stringify({signature:data.signature});}
  const response=await fetch(new URL(`/v1/onboarding/${id}${method==='POST'?'/signature':''}`,base),{method,body,headers:body?{'content-type':'application/json'}:{},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('unavailable');return Response.json(await response.json(),{headers});
 }catch{return Response.json({error:'Onboarding is unavailable or expired. No identity binding is assumed.'},{status:503,headers});}
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return proxy(request,(await params).id,'GET');}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return proxy(request,(await params).id,'POST');}
