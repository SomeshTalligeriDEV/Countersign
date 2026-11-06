import { hashIntent, hashApproval, recoverAttestor, recoverAgent, paymentId } from '../../../packages/shared/src/crypto.mjs';
import { RelayQueue } from './relay-queue.mjs';
const fields=['mandateId','merchantId','payout','registryVersion','amount','orderId','resourceHash','nonce','epoch','deadline'];
export function parseIntent(value) {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!fields.includes(k)))throw new Error('invalid_intent');
 const i={};
 for(const key of fields){
  const v=value[key];
  if(['mandateId','merchantId','orderId','resourceHash'].includes(key)){
   if(typeof v!=='string'||!/^0x[\da-fA-F]{64}$/.test(v))throw new Error('invalid_intent');i[key]=v;
  }else if(key==='payout'){
   if(typeof v!=='string'||!/^0x[\da-fA-F]{40}$/.test(v))throw new Error('invalid_intent');i[key]=v;
  }else{
   if(typeof v!=='string'||! /^(0|[1-9]\d{0,77})$/.test(v))throw new Error('invalid_intent');
   const n=BigInt(v);const bits=['registryVersion','epoch','deadline'].includes(key)?64n:256n;
   if(n>=(1n<<bits))throw new Error('invalid_intent');i[key]=n;
  }
 }
 return i;
}
/** Injectable chain adapter owns RPC simulation and signing. No client-supplied calldata or gas. */
export class Facilitator {
 constructor({chain,guard,db,mandateAddress,ledger,clock=()=>Math.floor(Date.now()/1000)}){
  this.ledger=ledger;this.chain=chain;this.guard=guard;this.db=db;this.address=mandateAddress;this.clock=clock;this.queue=new RelayQueue();
 }
 async settleApproved(approvalId){
  const row=this.db.prepare("SELECT * FROM approvals WHERE id=? AND state='owner_signed'").get(approvalId);
  if(!row)throw new Error('approval_not_ready');
  const owner=this.db.prepare('SELECT signature FROM owner_signatures WHERE approval_id=?').get(approvalId);
  const att=this.db.prepare('SELECT payload FROM attestor_signatures WHERE approval_id=?').get(approvalId);
  if(!owner||!att)throw new Error('approval_not_ready');
  return this.settle({intent:JSON.parse(row.intent_json),agentSig:row.agent_sig},{row,ownerSig:owner.signature,...JSON.parse(att.payload)});
 }
 async settle(body,approval){
  if(!body||Object.keys(body).some(k=>!['intent','agentSig'].includes(k)))throw new Error('invalid_request');
  const i=parseIntent(body.intent);
  if(typeof body.agentSig!=='string'||!/^0x[\da-fA-F]{130}$/.test(body.agentSig))throw new Error('bad_intent_sig');
  return this.queue.run(async()=>{
   if(await this.chain.chainId()!==1874)throw new Error('wrong_chain');
   const p=await this.chain.policy(i.mandateId);
   let signer;
   try{signer=await recoverAgent(this.address,i,body.agentSig);}catch{throw new Error('bad_intent_sig');}
   if(signer.toLowerCase()!==p.agent.toLowerCase())throw new Error('bad_intent_sig');
   if(p.paused)throw new Error('Paused');
   const now=this.clock();
   if(i.deadline<BigInt(now))throw new Error('Expired');
   if(p.expiry<=BigInt(now))throw new Error('MandateExpired');
   if(i.epoch!==p.epoch)throw new Error('StaleEpoch');
   if(i.amount===0n||i.amount>p.perTxLimit)throw new Error('OverPerTx');
   if(i.amount>=p.humanThreshold&&!approval)throw new Error('needs_approval');
   if(approval){
    const row=this.db.prepare("SELECT * FROM approvals WHERE id=? AND state='owner_signed'").get(approval.row.id);
    if(!row||row.expires_at<=now||!row.attested||row.world_sub_hash!==row.owner_sub_hash||row.auth_time>now||now-row.auth_time>120||hashIntent(this.address,i)!==row.intent_digest||hashApproval(this.address,i)!==row.approval_digest)throw new Error('approval_not_ready');
    const att=approval.attestation;
    if(att.approvalDigest!==row.approval_digest||att.ownerSubHash!==row.owner_sub_hash||String(att.authTime)!==String(row.auth_time))throw new Error('invalid_attestation');
    if((await recoverAttestor(this.address,att,approval.signature)).toLowerCase()!==p.attestor.toLowerCase())throw new Error('wrong_attestor');
    if(!await this.chain.verifyOwner(p.owner,i,approval.ownerSig))throw new Error('bad_owner_signature');
   }
   // Simulation remains authoritative for registry, allowance, nonce, order and period checks.
   const id=hashIntent(this.address,i);
   let prepared;
   try{prepared=await this.chain.simulatePay(i,body.agentSig,approval);}catch{this.guard.reject(i.mandateId,'would_revert',now);}
   if(this.ledger&&await this.ledger.recover())throw new Error('relay_recovery_required');
   this.guard.reserve({id,mandateId:i.mandateId,to:this.address,functionName:'pay',gas:prepared.gas,maxFeePerGas:prepared.maxFeePerGas,simulationSucceeded:true},now);
   // If submission outcome is unknown, retain the reservation and do not automatically retry.
   const txHash=this.ledger?await this.ledger.submit(id,prepared):await this.chain.broadcastPay(prepared);
   if(!/^0x[\da-fA-F]{64}$/.test(txHash))throw new Error('invalid_transaction_response');
   this.db.prepare("UPDATE gas_reservations SET status='submitted',tx_hash=? WHERE id=? AND status='reserved'").run(txHash,id);
   if(approval)this.db.prepare("UPDATE approvals SET state='submitted' WHERE id=? AND state='owner_signed'").run(approval.row.id);
   return {status:'submitted',txHash,paymentId:paymentId(i)};
  });
 }
}
