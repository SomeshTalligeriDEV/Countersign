import {hashApproval,hashIntent} from '../../../packages/shared/src/crypto.mjs';
/** Records authorization only; the relayer must still simulate before execution. */
export function createOwnerSignatureService({db,chain,attestor,mandateAddress,executor,clock=()=>Math.floor(Date.now()/1000)}){
 db.exec('CREATE TABLE IF NOT EXISTS owner_signatures(approval_id TEXT PRIMARY KEY,signature TEXT NOT NULL,created_at INTEGER NOT NULL)');
 return {async submit(id,body){
  if(!body||Object.keys(body).length!==1||typeof body.signature!=='string'||!/^0x(?:[\da-fA-F]{2}){1,4096}$/.test(body.signature))throw new Error('invalid_owner_signature');
  const row=db.prepare('SELECT * FROM approvals WHERE id=?').get(id);
  if(!row||row.state!=='world_ok'||row.expires_at<=clock())throw new Error('approval_not_ready');
  const intent=JSON.parse(row.intent_json);
  if(hashApproval(mandateAddress,intent)!==row.approval_digest||hashIntent(mandateAddress,intent)!==row.intent_digest)throw new Error('stored_digest_mismatch');
  await attestor.attest(id); // This client validates the persisted World attestation.
  if(await chain.chainId()!==1874)throw new Error('wrong_chain');
  const policy=await chain.policy(intent.mandateId);
  if(policy.paused||policy.epoch!==BigInt(intent.epoch)||policy.expiry<=BigInt(clock()))throw new Error('stale_policy');
  if(!await chain.verifyOwner(policy.owner,intent,body.signature))throw new Error('bad_owner_signature');
  db.exec('BEGIN IMMEDIATE');
  try{
   const now=clock();
   const changed=db.prepare("UPDATE approvals SET state='owner_signed' WHERE id=? AND state='world_ok' AND attested=1 AND expires_at>? AND auth_time<=? AND auth_time>=? AND world_sub_hash=owner_sub_hash").run(id,now,now,now-120);
   if(changed.changes!==1)throw new Error('approval_not_ready');
   db.prepare('INSERT INTO owner_signatures VALUES (?,?,?)').run(id,body.signature,now);
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  if(executor)return {approvalId:id,...await executor.settleApproved(id),settled:false};
  return {approvalId:id,status:'owner_signed',settled:false};
 }};
}
