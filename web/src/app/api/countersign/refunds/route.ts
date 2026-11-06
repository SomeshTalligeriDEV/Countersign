import { forwardHeaders } from '@/lib/countersign-forward';
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Same-origin request required.'},{status:403,headers});
 const base=process.env.COUNTERSIGN_API_URL;
 if(!base)return Response.json({error:'Setup service is not configured.'},{status:503,headers});
 try{
  const reader=request.body?.getReader();if(!reader)throw new Error('missing_body');let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return Response.json({error:'Request too large.'},{status:413,headers});}chunks.push(value);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const response=await fetch(new URL('/v1/refunds',base),{method:'POST',headers:forwardHeaders(request,{'content-type':'application/json'}),body:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return Response.json({error:'Cannot prepare refund. Use the original payout wallet and an amount within the unrefunded balance.'},{status:response.status===400?400:503,headers});
  return Response.json(await response.json(),{headers});
 }catch{return Response.json({error:'Setup is unavailable. No transaction was sent.'},{status:503,headers});}
}
