import { forwardHeaders } from '@/lib/countersign-forward';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const headers={'Cache-Control':'no-store'}, {id}=await params;
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Same-origin request required.'},{status:403,headers});
 if(!/^[a-f0-9-]{36}$/.test(id))return Response.json({error:'Invalid approval ID.'},{status:400,headers});
 const base=process.env.COUNTERSIGN_API_URL;if(!base)return Response.json({error:'Approval execution unavailable.'},{status:503,headers});
 try{const raw=await request.text();if(raw.length>10000)throw new Error('oversized');const body=JSON.parse(raw);
  const response=await fetch(new URL(`/v1/approvals/${id}/owner-signature`,base),{method:'POST',headers:forwardHeaders(request,{'content-type':'application/json'}),body:JSON.stringify({signature:body.signature}),redirect: 'manual',signal:AbortSignal.timeout(15000)});
  const data=await response.json();return Response.json(data,{status:response.status,headers});
 }catch{return Response.json({error:'Submission outcome unavailable. Check approval status before retrying.'},{status:503,headers});}
}
