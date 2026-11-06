/** Signed transactions are persisted before broadcasting. One relayer process only. */
export class RelayLedger {
 constructor({db,chain,clock=()=>Math.floor(Date.now()/1000)}){
  Object.assign(this,{db,chain,clock});
  db.exec(`CREATE TABLE IF NOT EXISTS relay_transactions(
   intent_id TEXT PRIMARY KEY,tx_hash TEXT NOT NULL UNIQUE,nonce TEXT NOT NULL UNIQUE,
   raw TEXT NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL,error TEXT
  )`);
 }
 async submit(id,prepared){
  if(await this.chain.chainId()!==1874)throw new Error('wrong_chain');
  const unresolved=this.db.prepare("SELECT intent_id FROM relay_transactions WHERE status IN ('prepared','submitted','unknown')").get();
  if(unresolved)throw new Error('relay_recovery_required');
  const signed=await this.chain.signPay(prepared);
  if(!/^0x[\da-fA-F]{64}$/.test(signed.hash)||!/^0x(?:[\da-fA-F]{2})+$/.test(signed.raw)||!/^\d+$/.test(String(signed.nonce)))throw new Error('invalid_signed_transaction');
  this.db.prepare("INSERT INTO relay_transactions VALUES (?,?,?,?,'prepared',?,NULL)").run(id,signed.hash,String(signed.nonce),signed.raw,this.clock());
  this.db.prepare("UPDATE gas_reservations SET tx_hash=? WHERE id=?").run(signed.hash,id);
  return this.broadcast(id,signed);
 }
 async broadcast(id,signed){
  try{
   const hash=await this.chain.broadcastRaw(signed.raw);
   if(hash.toLowerCase()!==signed.hash.toLowerCase())throw new Error('transaction_hash_mismatch');
   this.db.prepare("UPDATE relay_transactions SET status='submitted',error=NULL WHERE intent_id=?").run(id);
   return hash;
  }catch{
   this.db.prepare("UPDATE relay_transactions SET status='unknown',error='broadcast_outcome_unknown' WHERE intent_id=?").run(id);
   throw new Error('broadcast_outcome_unknown');
  }
 }
 async recover(){
  if(await this.chain.chainId()!==1874)throw new Error('wrong_chain');
  const rows=this.db.prepare("SELECT * FROM relay_transactions WHERE status IN ('prepared','submitted','unknown') ORDER BY created_at").all();
  for(const row of rows){
   const receipt=await this.chain.relayReceipt(row.tx_hash);
   if(receipt){
    const status=receipt.status==='success'?'included':'failed';
    this.db.prepare('UPDATE relay_transactions SET status=?,error=NULL WHERE intent_id=?').run(status,row.intent_id);
    // Inclusion does not establish settled status. Observer owns payment status.
    continue;
   }
   if(await this.chain.relayNonce()>BigInt(row.nonce)){
    this.db.prepare("UPDATE relay_transactions SET status='unknown',error='nonce_consumed_without_receipt' WHERE intent_id=?").run(row.intent_id);
    continue;
   }
   try{await this.broadcast(row.intent_id,{raw:row.raw,hash:row.tx_hash});}catch{/* retain unknown; never sign a replacement */}
  }
  return this.db.prepare("SELECT count(*) AS n FROM relay_transactions WHERE status IN ('prepared','submitted','unknown')").get().n;
 }
}
