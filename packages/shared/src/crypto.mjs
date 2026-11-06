import { hashTypedData, recoverTypedDataAddress, encodeAbiParameters, keccak256 } from 'viem';
import { paymentDomain, paymentTypes } from './index.ts';
export function hashIntent(address, intent) {
 return hashTypedData({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentIntent',message:intent});
}
export function recoverAgent(address,intent,signature) {
 return recoverTypedDataAddress({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentIntent',message:intent,signature});
}
export function paymentId(intent) {
 return keccak256(encodeAbiParameters([{type:'bytes32'},{type:'bytes32'},{type:'bytes32'}],[intent.mandateId,intent.merchantId,intent.orderId]));
}

// Hash the exact request body bytes and an unambiguous ABI tuple.
export function resourceHash(method, url, body = new Uint8Array()) {
 return keccak256(encodeAbiParameters([{type:'string'},{type:'string'},{type:'bytes32'}], [method.toUpperCase(),url,keccak256(body)]));
}
export function approvalFor(address,intent){
 return {intentDigest:hashIntent(address,intent),mandateId:intent.mandateId,merchantId:intent.merchantId,payout:intent.payout,amount:intent.amount,epoch:intent.epoch,deadline:intent.deadline};
}
export function hashApproval(address,intent){
 return hashTypedData({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentApproval',message:approvalFor(address,intent)});
}
export function recoverAttestor(address,attestation,signature){
 return recoverTypedDataAddress({domain:paymentDomain(address),types:paymentTypes,primaryType:'WorldAttestation',message:attestation,signature});
}
export function worldSubjectHash(issuer,subject){
 if(typeof issuer!=='string'||typeof subject!=='string'||!subject)throw new Error('invalid_world_subject');
 return keccak256(new TextEncoder().encode(issuer+subject));
}
export function recoverOwner(address,intent,signature){
 return recoverTypedDataAddress({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentApproval',message:approvalFor(address,intent),signature});
}
export function mandateIdFor(owner,salt){
 return keccak256(encodeAbiParameters([{type:'address'},{type:'bytes32'}],[owner,salt]));
}
export async function recoverWalletMessage(message,signature){
 const {recoverMessageAddress}=await import('viem');
 return recoverMessageAddress({message,signature});
}
