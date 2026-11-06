import {hashApproval,hashIntent} from '../../../packages/shared/src/crypto.mjs';
import {paymentDomain,paymentTypes} from '../../../packages/shared/src/index.ts';
/** Internal service core. Transport must authenticate requests before calling attest. */
export function createAttestor({db,account,mandateAddress,clock=()=>Math.floor(Date.now()/1000)}){
 const domain=paymentDomain(mandateAddress);
 db.exec('CREATE TABLE IF NOT EXISTS attestor_claims(approval_id TEXT PRIMARY KEY,mandate_id TEXT NOT NULL,at INTEGER NOT NULL)');
 db.exec('CREATE TABLE IF NOT EXISTS attestor_signatures(approval_id TEXT PRIMARY KEY, payload TEXT NOT NULL)');
 return {async attest(approvalId){
  if(typeof approvalId!=='string'||approvalId.length>100)throw new Error('invalid_approval_id');
  const now=clock();let attestation;
  db.exec('BEGIN IMMEDIATE');
  try{
   const row=db.prepare('SELECT * FROM approvals WHERE id=?').get(approvalId);
   if(!row||row.state!=='world_ok'||row.attested||row.expires_at<=now||!Number.isInteger(row.auth_time)||row.auth_time>now||now-row.auth_time>120||row.world_sub_hash!==row.owner_sub_hash)throw new Error('attestation_refused');
   const intent=JSON.parse(row.intent_json);
   if(BigInt(intent.deadline)<BigInt(now))throw new Error('attestation_refused');
   const approvalDigest=hashApproval(mandateAddress,intent);
   if(approvalDigest!==row.approval_digest||hashIntent(mandateAddress,intent)!==row.intent_digest)throw new Error('stored_digest_mismatch');
   const count=db.prepare('SELECT count(*) AS n FROM attestor_claims WHERE mandate_id=? AND at>?').get(intent.mandateId,now-3600).n;
   if(count>=5)throw new Error('attestor_rate_limited');
   db.prepare('INSERT INTO attestor_claims VALUES (?,?,?)').run(approvalId,intent.mandateId,now);
   db.prepare('UPDATE approvals SET attested=1 WHERE id=?').run(approvalId);
   attestation={approvalDigest,ownerSubHash:row.owner_sub_hash,authTime:BigInt(row.auth_time)};
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  // Claim is intentionally consumed if signing fails: never silently sign twice.
  const signature=await account.signTypedData({domain,types:paymentTypes,primaryType:'WorldAttestation',message:attestation});
  const result={attestation,signature};
  db.prepare('INSERT INTO attestor_signatures VALUES (?,?)').run(approvalId,JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v));
  return result;
 }};
}
