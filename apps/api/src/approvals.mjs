import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');

/** Internal persistence boundary. Callers must verify the agent signature and owner binding first. */
export class Approvals {
  constructor(db) {
    this.db=db;
    db.exec(`CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY, intent_digest TEXT NOT NULL UNIQUE, approval_digest TEXT NOT NULL,
      intent_json TEXT NOT NULL, agent_sig TEXT NOT NULL, owner_sub_hash TEXT NOT NULL,
      state TEXT NOT NULL, expires_at INTEGER NOT NULL, oauth_state_hash TEXT UNIQUE,
      browser_hash TEXT, nonce TEXT, verifier TEXT, callback_used INTEGER NOT NULL DEFAULT 0,
      auth_time INTEGER, world_sub_hash TEXT, attested INTEGER NOT NULL DEFAULT 0
    )`);
  }
  create({intentDigest,approvalDigest,intent,agentSig,ownerSubHash},now=Math.floor(Date.now()/1000)) {
    for(const value of [intentDigest,approvalDigest,ownerSubHash])if(!/^0x[0-9a-fA-F]{64}$/.test(value))throw new Error('invalid_digest');
    if(!/^\d+$/.test(String(intent.deadline)))throw new Error('invalid_deadline');
    const deadline=Number(intent.deadline);
    if(!Number.isSafeInteger(deadline)||deadline<=now||deadline>now+180)throw new Error('invalid_deadline');
    const id=randomUUID();
    this.db.prepare(`INSERT INTO approvals(id,intent_digest,approval_digest,intent_json,agent_sig,owner_sub_hash,state,expires_at)
      VALUES(?,?,?,?,?,?,'pending_human',?)`).run(id,intentDigest,approvalDigest,JSON.stringify(intent),agentSig,ownerSubHash,Math.min(now+120,deadline));
    return id;
  }
  get(id,now=Math.floor(Date.now()/1000)) {
    this.db.prepare("UPDATE approvals SET state='expired' WHERE id=? AND expires_at<=? AND state IN ('pending_human','world_ok')").run(id,now);
    const row=this.db.prepare('SELECT * FROM approvals WHERE id=?').get(id);
    if(!row)throw new Error('approval_not_found');
    return row;
  }
  begin(id,now=Math.floor(Date.now()/1000)) {
    const row=this.get(id,now);
    if(row.state!=='pending_human'||row.callback_used)throw new Error('approval_not_pending');
    const state=randomBytes(32).toString('base64url');
    const browser=randomBytes(32).toString('base64url');
    const verifier=randomBytes(32).toString('base64url');
    const nonce=createHash('sha256').update(row.approval_digest).update(randomBytes(32)).digest('base64url');
    this.db.prepare('UPDATE approvals SET oauth_state_hash=?,browser_hash=?,nonce=?,verifier=? WHERE id=?').run(hash(state),hash(browser),nonce,verifier,id);
    return {state,browser,nonce,verifier,challenge:createHash('sha256').update(verifier).digest('base64url')};
  }
  consume(state,browser,now=Math.floor(Date.now()/1000)) {
    if(typeof state!=='string'||typeof browser!=='string')throw new Error('invalid_oauth_state');
    const row=this.db.prepare('SELECT * FROM approvals WHERE oauth_state_hash=?').get(hash(state));
    if(!row||!row.browser_hash||!timingSafeEqual(Buffer.from(row.browser_hash),Buffer.from(hash(browser))))throw new Error('invalid_oauth_state');
    const result=this.db.prepare("UPDATE approvals SET callback_used=1 WHERE id=? AND callback_used=0 AND state='pending_human' AND expires_at>?").run(row.id,now);
    if(result.changes!==1)throw new Error('callback_used_or_expired');
    return row;
  }
  /** Only pass claims returned by server-side cryptographic JWT verification. */
  verifyClaims(id,claims,{issuer,audience,subjectHash},now=Math.floor(Date.now()/1000)) {
    const row=this.get(id,now);
    if(row.state!=='pending_human'||!row.callback_used)throw new Error('invalid_approval_state');
    const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
    let failure;
    if(claims.iss!==issuer||!aud.includes(audience)||(aud.length>1&&claims.azp!==audience)||claims.nonce!==row.nonce||typeof claims.sub!=='string'||!claims.sub||!Number.isInteger(claims.exp)||claims.exp<=now)failure='invalid_claims';
    else if(!Number.isInteger(claims.auth_time)||claims.auth_time>now||now-claims.auth_time>120)failure='stale_auth';
    else if(subjectHash!==row.owner_sub_hash)failure='wrong_human';
    if(failure){this.db.prepare('UPDATE approvals SET state=? WHERE id=?').run(failure,id);throw new Error(failure);}
    this.db.prepare("UPDATE approvals SET state='world_ok',auth_time=?,world_sub_hash=? WHERE id=?").run(claims.auth_time,subjectHash,id);
  }
  claimAttestation(id,now=Math.floor(Date.now()/1000)) {
    const result=this.db.prepare(`UPDATE approvals SET attested=1 WHERE id=? AND state='world_ok' AND attested=0
      AND expires_at>? AND auth_time<=? AND auth_time>=? AND world_sub_hash=owner_sub_hash RETURNING *`).get(id,now,now,now-120);
    if(!result)throw new Error('attestation_refused');
    return result;
  }
  deny(id,now=Math.floor(Date.now()/1000)) {
    this.get(id,now);
    return this.db.prepare("UPDATE approvals SET state='denied' WHERE id=? AND state='pending_human'").run(id).changes===1;
  }
}
