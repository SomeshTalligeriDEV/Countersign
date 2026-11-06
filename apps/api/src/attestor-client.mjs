import {signWebhook} from '../../../packages/merchant/src/webhooks.mjs';
import {hashApproval,hashIntent,recoverAttestor} from '../../../packages/shared/src/crypto.mjs';
export function createAttestorClient({db,chain,mandateAddress,url='http://127.0.0.1:3002',secret,fetchImpl=fetch,clock=()=>Math.floor(Date.now()/1000)}){
 const endpoint=new URL(url);
 if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=='/')throw new Error('loopback_attestor_required');
 if(typeof secret!=='string'||Buffer.byteLength(secret)<32)throw new Error('attestor_secret_required');
 db.exec('CREATE TABLE IF NOT EXISTS attestor_signatures(approval_id TEXT PRIMARY KEY, payload TEXT NOT NULL)');
 async function validate(id,result){
  const row=db.prepare('SELECT * FROM approvals WHERE id=?').get(id),now=clock();
  if(!row||row.state!=='world_ok'||!row.attested||row.expires_at<=now||row.world_sub_hash!==row.owner_sub_hash||!Number.isInteger(row.auth_time)||row.auth_time>now||now-row.auth_time>120)throw new Error('approval_not_ready');
  const intent=JSON.parse(row.intent_json);
  if(BigInt(intent.deadline)<=BigInt(now))throw new Error('approval_expired');
  const digest=hashApproval(mandateAddress,intent);
  if(digest!==row.approval_digest||hashIntent(mandateAddress,intent)!==row.intent_digest)throw new Error('stored_digest_mismatch');
  const att=result?.attestation;
  if(!att||att.approvalDigest!==digest||att.ownerSubHash!==row.owner_sub_hash||String(att.authTime)!==String(row.auth_time)||!/^0x[\da-fA-F]{130}$/.test(result.signature??''))throw new Error('invalid_attestation');
  if(await chain.chainId()!==1874)throw new Error('wrong_chain');
  const policy=await chain.policy(intent.mandateId);
  if(policy.paused||policy.epoch!==BigInt(intent.epoch)||policy.expiry<=BigInt(now))throw new Error('stale_policy');
  const signer=await recoverAttestor(mandateAddress,att,result.signature);
  if(signer.toLowerCase()!==policy.attestor.toLowerCase())throw new Error('wrong_attestor');
  return result;
 }
 return {async attest(approvalId){
  if(typeof approvalId!=='string'||!/^[0-9a-f-]{36}$/.test(approvalId))throw new Error('invalid_approval_id');
  const saved=db.prepare('SELECT payload FROM attestor_signatures WHERE approval_id=?').get(approvalId);
  if(saved)return validate(approvalId,JSON.parse(saved.payload));
  const body=Buffer.from(JSON.stringify({approvalId}));
  try{
   const response=await fetchImpl(new URL('/attest',endpoint),{method:'POST',headers:{'content-type':'application/json','x-countersign-attestor-signature':signWebhook(secret,body,clock())},body,redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('attestor_unavailable');
   return await validate(approvalId,await response.json());
  }catch(error){
   // A lost HTTP response may follow a completed durable signature. Recover
   // that exact result, never clear a claim or ask the service to re-sign.
   const recovered=db.prepare('SELECT payload FROM attestor_signatures WHERE approval_id=?').get(approvalId);
   if(recovered)return validate(approvalId,JSON.parse(recovered.payload));
   throw error;
  }
 }};
}
