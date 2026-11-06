export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Same-origin request required.'},{status:403,headers});
 const base=process.env.COUNTERSIGN_API_URL,publicBase=process.env.COUNTERSIGN_PUBLIC_API_URL??base;
 if(!base||!publicBase)return Response.json({error:'World onboarding is not configured.'},{status:503,headers});
 try{
  const raw=await request.text();if(raw.length>200)return Response.json({error:'Request too large.'},{status:413,headers});
  const body=JSON.parse(raw);if(!/^0x[\da-fA-F]{64}$/.test(body.mandateId))throw new Error('invalid_id');
  const response=await fetch(new URL('/v1/onboarding',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mandateId:body.mandateId}),redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('unavailable');const data=await response.json();
  if(!/^[a-f0-9-]{36}$/.test(data.onboardingId))throw new Error('invalid_response');
  const start=new URL('/auth/world/onboard/start',publicBase);start.searchParams.set('approvalId',data.onboardingId);
  if(start.protocol!=='https:'&&!(start.protocol==='http:'&&['localhost','127.0.0.1'].includes(start.hostname)))throw new Error('invalid_origin');
  return Response.json({...data,startUrl:start.href},{headers});
 }catch{return Response.json({error:'Cannot start verified owner onboarding. Check World configuration and mandate.'},{status:503,headers});}
}
