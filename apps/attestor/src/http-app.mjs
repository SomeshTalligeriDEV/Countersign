import {verifyWebhook} from '../../../packages/merchant/src/webhooks.mjs';
const json=(value,status)=>new Response(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export function createAttestorHttp({service,secret,clock=()=>Math.floor(Date.now()/1000)}){
 if(typeof secret!=='string'||Buffer.byteLength(secret)<32)throw new Error('attestor_secret_required');
 return async request=>{
  if(request.method!=='POST'||new URL(request.url).pathname!=='/attest')return json({error:'not_found'},404);
  const reader=request.body?.getReader();if(!reader)return json({error:'invalid_request'},400);
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return json({error:'body_too_large'},413);}chunks.push(value);}
  const raw=Buffer.concat(chunks);
  // Distinct secret and fixed endpoint prevent cross-service signature reuse.
  if(!verifyWebhook(secret,raw,request.headers.get('x-countersign-attestor-signature'),clock()))return json({error:'unauthorized'},401);
  let body;try{body=JSON.parse(raw.toString('utf8'));}catch{return json({error:'invalid_json'},400);}
  if(!body||typeof body!=='object'||Object.keys(body).length!==1||!Object.hasOwn(body,'approvalId')||typeof body.approvalId!=='string'||!/^[0-9a-f-]{36}$/.test(body.approvalId))return json({error:'invalid_request'},400);
  try{return json(await service.attest(body.approvalId),200);}catch{return json({error:'attestation_refused'},409);}
 };
}
