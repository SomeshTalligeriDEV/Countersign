import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {worldSubjectHash} from '../../../packages/shared/src/crypto.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
/** Internal OIDC persistence adapter; verifyClaims receives jose-verified claims only. */
export function createOwnerBinding({db,chain,issuer,clientId,clock=()=>Math.floor(Date.now()/1000)}){
 db.exec(`CREATE TABLE IF NOT EXISTS owner_bindings(mandate_id TEXT PRIMARY KEY,owner TEXT NOT NULL,subject_hash TEXT NOT NULL,issuer TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS onboarding(id TEXT PRIMARY KEY,mandate_id TEXT NOT NULL,owner TEXT NOT NULL,expires INTEGER NOT NULL,state TEXT NOT NULL,oauth_hash TEXT UNIQUE,browser_hash TEXT,nonce TEXT,verifier TEXT,used INTEGER NOT NULL DEFAULT 0,subject_hash TEXT,auth_time INTEGER);`);
 const get=id=>{const row=db.prepare('SELECT * FROM onboarding WHERE id=?').get(id);if(!row||row.expires<=clock())throw new Error('onboarding_expired');return row;};
 return {db,
  fail(id){db.prepare("UPDATE onboarding SET state='failed' WHERE id=? AND state='pending_human'").run(id);},
  async create(mandateId){
   if(!/^0x[\da-fA-F]{64}$/.test(mandateId))throw new Error('invalid_mandate');
   if(await chain.chainId()!==1874)throw new Error('wrong_chain');
   const policy=await chain.policy(mandateId),id=randomUUID();
   db.prepare("INSERT INTO onboarding(id,mandate_id,owner,expires,state) VALUES (?,?,?,?,'pending_human')").run(id,mandateId,policy.owner,clock()+120);
   return {onboardingId:id,expiresAt:clock()+120};
  },
  begin(id){
   const row=get(id);if(row.state!=='pending_human'||row.used)throw new Error('onboarding_not_pending');
   const state=randomBytes(32).toString('base64url'),browser=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
   const nonce=createHash('sha256').update(`${row.id}:${row.mandate_id}:${row.owner}`).update(randomBytes(32)).digest('base64url');
   db.prepare('UPDATE onboarding SET oauth_hash=?,browser_hash=?,nonce=?,verifier=? WHERE id=?').run(hash(state),hash(browser),nonce,verifier,id);
   return {state,browser,verifier,nonce,challenge:createHash('sha256').update(verifier).digest('base64url')};
  },
  consume(state,browser){
   if(typeof state!=='string'||typeof browser!=='string')throw new Error('invalid_oauth_state');
   const row=db.prepare('SELECT * FROM onboarding WHERE oauth_hash=?').get(hash(state));
   if(!row||!row.browser_hash||!timingSafeEqual(Buffer.from(row.browser_hash),Buffer.from(hash(browser))))throw new Error('invalid_oauth_state');
   if(db.prepare("UPDATE onboarding SET used=1 WHERE id=? AND used=0 AND state='pending_human' AND expires>?").run(row.id,clock()).changes!==1)throw new Error('callback_used_or_expired');return row;
  },
  verifyClaims(id,claims){
   const row=get(id),now=clock(),aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
   if(!row.used||row.state!=='pending_human')throw new Error('invalid_approval_state');
   if(claims.iss!==issuer||!aud.includes(clientId)||(aud.length>1&&claims.azp!==clientId)||claims.nonce!==row.nonce||typeof claims.sub!=='string'||!claims.sub||!Number.isInteger(claims.exp)||claims.exp<=now)throw new Error('invalid_claims');
   if(!Number.isInteger(claims.auth_time)||claims.auth_time>now||now-claims.auth_time>120)throw new Error('stale_auth');
   db.prepare("UPDATE onboarding SET state='world_ok',subject_hash=?,auth_time=? WHERE id=?").run(worldSubjectHash(issuer,claims.sub),claims.auth_time,id);
  },
  deny(id){return db.prepare("UPDATE onboarding SET state='denied' WHERE id=? AND state='pending_human'").run(id).changes===1;},
  status(id){const row=get(id);return {onboardingId:id,status:row.state,expiresAt:row.expires};},
  terms(id){const row=get(id);if(row.state!=='world_ok')throw new Error('identity_not_verified');return {onboardingId:id,owner:row.owner,message:`Countersign owner identity binding\nChain: 1874\nMandate: ${row.mandate_id}\nOwner: ${row.owner}\nIdentity: ${row.subject_hash}\nRequest: ${id}\nExpires: ${row.expires}`};},
  async complete(id,signature){
   const row=get(id),terms=this.terms(id);
   if(clock()-row.auth_time>120)throw new Error('stale_auth');
   if(typeof signature!=='string'||!/^0x(?:[\da-fA-F]{2}){1,4096}$/.test(signature))throw new Error('invalid_signature');
   if(await chain.chainId()!==1874)throw new Error('wrong_chain');
   const policy=await chain.policy(row.mandate_id);
   if(policy.owner.toLowerCase()!==row.owner.toLowerCase()||!await chain.verifyWalletMessage(row.owner,terms.message,signature))throw new Error('bad_owner_signature');
   db.exec('BEGIN IMMEDIATE');try{
    if(db.prepare("UPDATE onboarding SET state='bound' WHERE id=? AND state='world_ok' AND expires>?").run(id,clock()).changes!==1)throw new Error('onboarding_expired');
    const previous=db.prepare('SELECT * FROM owner_bindings WHERE mandate_id=?').get(row.mandate_id);
    if(previous&&(previous.owner.toLowerCase()!==row.owner.toLowerCase()||previous.subject_hash!==row.subject_hash||previous.issuer!==issuer))throw new Error('identity_rebinding_forbidden');
    db.prepare('INSERT OR IGNORE INTO owner_bindings VALUES (?,?,?,?,?)').run(row.mandate_id,row.owner,row.subject_hash,issuer,clock());db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   return {status:'bound',mandateId:row.mandate_id};
  },
  lookup(id,owner){const row=db.prepare('SELECT * FROM owner_bindings WHERE mandate_id=? AND issuer=?').get(id,issuer);return row&&row.owner.toLowerCase()===owner.toLowerCase()?{owner:row.owner,subjectHash:row.subject_hash}:null;},
 };
}
