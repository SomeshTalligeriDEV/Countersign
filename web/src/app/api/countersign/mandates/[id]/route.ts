import { forwardHeaders } from '@/lib/countersign-forward';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const {id}=await params; const headers={'Cache-Control':'no-store'};
 if(!/^0x[\da-fA-F]{64}$/.test(id))return Response.json({error:'Enter a valid mandate ID.'},{status:400,headers});
 const base=process.env.COUNTERSIGN_API_URL;
 if(!base)return Response.json({error:'Mandate service is not configured.'},{status:503,headers});
 try{
  const response=await fetch(new URL(`/v1/mandates/${id}`,base),{headers: forwardHeaders(request), cache:'no-store',redirect: 'manual',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('unavailable');
  const data=await response.json();
  if(data.chainId!==1874||!/^0x[\da-fA-F]{40}$/.test(data.owner)||!Number.isInteger(data.decimals)||data.decimals<0||data.decimals>255||typeof data.paused!=='boolean')throw new Error('invalid_snapshot');
  for(const key of ['remaining','perTxLimit','periodLimit','epoch','block'])if(!/^\d+$/.test(data[key]))throw new Error('invalid_snapshot');
  if(!/^0x[\da-fA-F]{40}$/.test(data.mandateAddress)||data.mandateId?.toLowerCase()!==id.toLowerCase())throw new Error('invalid_contract');
  for(const key of ['pause','unpause','revoke'])if(!/^0x[\da-fA-F]+$/.test(data.actions?.[key]))throw new Error('invalid_calldata');
  return Response.json(data,{headers});
 }catch{return Response.json({error:'Cannot read this mandate from Whitechain. Check its ID and connection.'},{status:503,headers});}
}
