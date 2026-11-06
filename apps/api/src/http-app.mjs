import { confirmedReceipt } from './receipt.mjs';
import { paymentHistory, paymentCsv } from './payment-history.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const badRequest=new Set(['OverRefund','NotPayout','NotMerchantOwner','merchant_already_registered','NotOwner','invalid_setup','invalid_amount','amount_precision','amount_overflow','invalid_request','invalid_intent','bad_intent_sig','UnknownMandate','Expired','MandateExpired','StaleEpoch','OverPerTx','Paused']);
export function createHttpApp({chain,facilitator,approvalService,ownerSignatures,ownerSetup,worldHttp,ownerWorldHttp,ownerBinding,merchants,demoGuard,db,networkStatus,observerName,observerHealthy=()=>true,clock=()=>Math.floor(Date.now()/1000)}){
 db.exec('CREATE TABLE IF NOT EXISTS request_limits (key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL)');
 function rateLimit(key){
  const window=Math.floor(clock()/60);
  const row=db.prepare(`INSERT INTO request_limits(key,window,count) VALUES(?,?,1)
   ON CONFLICT(key) DO UPDATE SET window=excluded.window,count=CASE WHEN request_limits.window=excluded.window THEN request_limits.count+1 ELSE 1 END RETURNING count`).get(key,window);
  db.prepare('DELETE FROM request_limits WHERE window<?').run(window-2);
  return row.count<=10;
 }
 return async function handle(request,{ip='unknown'}={}){
  const url=new URL(request.url);
  const path=url.pathname;
  try{
   if(path.startsWith('/auth/world/onboard/')){
    if(!ownerWorldHttp)return json({error:'world_not_configured'},503);
    const response=await ownerWorldHttp(request);if(response)return response;
   }
   if(path.startsWith('/auth/world/')){
    if(!worldHttp)return json({error:'world_not_configured'},503);
    const response=await worldHttp(request);if(response)return response;
   }
   if(request.method==='POST'&&path==='/v1/demo/gasguard'){
    if(!demoGuard)return json({error:'demo_disabled'},404);
    if(!rateLimit(`${path}|${ip}`))return json({error:'rate_limited'},429);
    demoGuard.reserve({id:'demo-arbitrary',mandateId:'demo',to:'0x0000000000000000000000000000000000000001',functionName:'transfer',gas:1n,maxFeePerGas:1n,simulationSucceeded:true},clock());
    return json({error:'unexpected_guard_acceptance'},500);
   }
   if(request.method==='GET'&&path==='/health/live')return json({status:'alive'});
   if(request.method==='GET'&&(path==='/v1/network'||path==='/health/ready')){
    const status=await networkStatus();
    const ready=status.observer?.state==='current'&&status.settlementEnabled===true;
    return json(status,path==='/health/ready'&&!ready?503:200);
   }
   if(request.method==='GET'&&(path==='/v1/payments'||path==='/v1/payments.csv')){
    if(!observerName)return json({error:'observer_not_configured'},503);
    if(!observerHealthy())return json({error:'observer_unavailable'},503);
    const mandateId=url.searchParams.get('mandateId');
    const offset=url.searchParams.get('offset')??'0';
    if(!/^0x[\da-fA-F]{64}$/.test(mandateId??'')||! /^(0|[1-9][0-9]{0,6})$/.test(offset))return json({error:'invalid_query'},400);
    const history=paymentHistory(db,observerName,mandateId,Number(offset));
    if(path.endsWith('.csv'))return new Response(paymentCsv(history.payments),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="payments.csv"','cache-control':'no-store','x-content-type-options':'nosniff',...(history.nextOffset===null?{}:{'x-next-offset':String(history.nextOffset)})}});
    return json(history);
   }
   const merchantMatch=/^\/v1\/merchants\/(0x[\da-fA-F]{64})$/.exec(path);
   if(request.method==='GET'&&merchantMatch){if(!merchants)return json({error:'merchant_service_not_configured'},503);return json(await merchants.profile(merchantMatch[1]));}
   const mandateMatch=/^\/v1\/mandates\/(0x[\da-fA-F]{64})$/.exec(path);
   if(request.method==='GET'&&mandateMatch){
    if(!chain)return json({error:'chain_not_configured'},503);
    return json(await chain.mandateSnapshot(mandateMatch[1]));
   }
   const approvalMatch=/^\/v1\/approvals\/([a-f0-9-]{36})(\/terms)?$/.exec(path);
   if(request.method==='GET'&&approvalMatch){
    if(!approvalService)return json({error:'approvals_not_configured'},503);
    return json(approvalMatch[2]?approvalService.terms(approvalMatch[1]):approvalService.get(approvalMatch[1]));
   }
   const receiptMatch=/^\/v1\/payments\/(0x[\da-fA-F]{64})$/.exec(path);
   if(request.method==='GET'&&receiptMatch){
    if(!chain||!observerName||!observerHealthy())return json({error:'observer_unavailable'},503);
    const receipt=await confirmedReceipt({db,chain,observerName,id:receiptMatch[1].toLowerCase()});
    return receipt?json(receipt):json({error:'not_found'},404);
   }
   const match=/^\/v1\/terms\/(0x[\da-fA-F]{64})$/.exec(path);
   if(request.method==='GET'&&match){if(!chain)return json({error:'chain_not_configured'},503);return json(await chain.terms(match[1]));}
   const onboardingMatch=/^\/v1\/onboarding\/([a-f0-9-]{36})(\/signature)?$/.exec(path);
   if(request.method==='GET'&&onboardingMatch&&!onboardingMatch[2]){if(!ownerBinding)return json({error:'world_not_configured'},503);const status=ownerBinding.status(onboardingMatch[1]);return json(status.status==='world_ok'?{...status,...ownerBinding.terms(onboardingMatch[1])}:status);}
   const ownerMatch=/^\/v1\/approvals\/([a-f0-9-]{36})\/owner-signature$/.exec(path);
   if(request.method==='POST'&&(path==='/v1/settle'||path==='/v1/approvals'||path==='/v1/owner/setup'||path==='/v1/owner/merchant'||path==='/v1/refunds'||path==='/v1/merchant/prepare'||path==='/v1/onboarding'||onboardingMatch?.[2]||ownerMatch)){
    if((path==='/v1/owner/setup'||path==='/v1/owner/merchant')&&!ownerSetup)return json({error:'owner_setup_not_configured'},503);
    if((path==='/v1/merchant/prepare'||path==='/v1/refunds')&&!merchants)return json({error:'merchant_service_not_configured'},503);
    if((path==='/v1/onboarding'||onboardingMatch?.[2])&&!ownerBinding)return json({error:'world_not_configured'},503);
    if(ownerMatch&&!ownerSignatures)return json({error:'owner_signatures_not_configured'},503);
    if(path==='/v1/approvals'&&!approvalService)return json({error:'approvals_not_configured'},503);
    if(path==='/v1/settle'&&!facilitator)return json({error:'relayer_not_configured'},503);
    if(!rateLimit(`${path}|${ip}`))return json({error:'rate_limited'},429);
    if(!(request.headers.get('content-type')??'').startsWith('application/json'))return json({error:'json_required'},415);
    const reader=request.body?.getReader();if(!reader)return json({error:'invalid_request'},400);
    const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();return json({error:'body_too_large'},413);}chunks.push(value);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json({error:'invalid_json'},400);}
    if(path==='/v1/refunds')return json(await merchants.refund(body));
    if(path==='/v1/merchant/prepare')return json(await merchants.prepare(body));
    if(path==='/v1/onboarding'){if(!body||Object.keys(body).length!==1||typeof body.mandateId!=='string')return json({error:'invalid_request'},400);return json(await ownerBinding.create(body.mandateId),201);}
    if(onboardingMatch?.[2]){if(!body||Object.keys(body).length!==1)return json({error:'invalid_request'},400);return json(await ownerBinding.complete(onboardingMatch[1],body.signature));}
    if(path==='/v1/owner/merchant')return json(await ownerSetup.merchant(body));
    if(path==='/v1/owner/setup')return json(await ownerSetup.prepare(body));
    if(ownerMatch)return json(await ownerSignatures.submit(ownerMatch[1],body));
    return path==='/v1/approvals'?json(await approvalService.create(body),201):json(await facilitator.settle(body),202);
   }
   return json({error:'not_found'},404);
  }catch(error){
   if(error.message==='approval_not_found')return json({error:'not_found'},404);
   if(['approval_not_ready','bad_owner_signature','invalid_owner_signature','stale_policy','owner_not_onboarded','approval_not_required','invalid_deadline'].includes(error.message))return json({error:error.message},409);
   if(error.message==='needs_approval')return json({error:'needs_approval'},409);
   if(badRequest.has(error.message))return json({error:error.message},400);
   if(error.message.startsWith('gasguard_rejected:'))return json({error:'gasguard_rejected',reason:error.message.slice(18)},409);
   return json({error:'service_unavailable'},503);
  }
 };
}
