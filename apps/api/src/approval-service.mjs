import {Approvals} from './approvals.mjs';
import {parseIntent} from './facilitator.mjs';
import {hashIntent,hashApproval,approvalFor,recoverAgent} from '../../../packages/shared/src/crypto.mjs';
import {paymentDomain,paymentTypes} from '../../../packages/shared/src/index.ts';
export function createApprovalService({db,chain,mandateAddress,ownerBinding,clock=()=>Math.floor(Date.now()/1000)}){
 const approvals=new Approvals(db);
 return {
  async create(body){
   if(!body||Object.keys(body).some(k=>!['intent','agentSig'].includes(k)))throw new Error('invalid_request');
   const intent=parseIntent(body.intent),now=clock();
   if(typeof body.agentSig!=='string'||!/^0x[\da-fA-F]{130}$/.test(body.agentSig))throw new Error('bad_intent_sig');
   if(await chain.chainId()!==1874)throw new Error('wrong_chain');
   const policy=await chain.policy(intent.mandateId);
   let signer;try{signer=await recoverAgent(mandateAddress,intent,body.agentSig);}catch{throw new Error('bad_intent_sig');}
   if(signer.toLowerCase()!==policy.agent.toLowerCase())throw new Error('bad_intent_sig');
   if(policy.paused)throw new Error('Paused');
   if(intent.epoch!==policy.epoch)throw new Error('StaleEpoch');
   if(policy.expiry<=BigInt(now))throw new Error('MandateExpired');
   if(intent.deadline<=BigInt(now)||intent.deadline>BigInt(now+180))throw new Error('invalid_deadline');
   if(intent.amount<=0n||intent.amount>policy.perTxLimit)throw new Error('OverPerTx');
   if(intent.amount<policy.humanThreshold)throw new Error('approval_not_required');
   // Must be backed by verified owner onboarding, never request JSON.
   const binding=await ownerBinding(intent.mandateId,policy.owner);
   if(!binding||binding.owner.toLowerCase()!==policy.owner.toLowerCase())throw new Error('owner_not_onboarded');
   const intentDigest=hashIntent(mandateAddress,intent);
   const existing=db.prepare('SELECT id FROM approvals WHERE intent_digest=?').get(intentDigest);
   if(existing)return this.get(existing.id);
   const normalized=Object.fromEntries(Object.entries(intent).map(([k,v])=>[k,typeof v==='bigint'?v.toString():v]));
   const id=approvals.create({intent:normalized,agentSig:body.agentSig,intentDigest,approvalDigest:hashApproval(mandateAddress,intent),ownerSubHash:binding.subjectHash},now);
   return this.get(id);
  },
  get(id){const row=approvals.get(id,clock());return {approvalId:row.id,status:row.state,expiresAt:row.expires_at};},
  terms(id){
   const row=approvals.get(id,clock()),intent=JSON.parse(row.intent_json);
   return {...this.get(id),intent,approvalDigest:row.approval_digest,typedData:{domain:paymentDomain(mandateAddress),types:paymentTypes,primaryType:'PaymentApproval',message:approvalFor(mandateAddress,intent)}};
  },
 };
}
