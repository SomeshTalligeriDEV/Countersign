import {parseHumanAmount} from '../../shared/src/amount.mjs';
import { randomBytes } from 'node:crypto';
import { resourceHash, paymentId } from '../../shared/src/crypto.mjs';

function units(amount,decimals){
 const value=parseHumanAmount(amount,decimals);
 if(BigInt(value)<=0n)throw new Error('invalid_price');
 return value;
}
/** Framework-neutral charge core; DB and facilitator transport are server-owned. */
export function createCharge({db,merchantId,api,clock=()=>Math.floor(Date.now()/1000)}){
 db.exec('CREATE TABLE IF NOT EXISTS merchant_submissions(payment_id TEXT PRIMARY KEY, tx_hash TEXT NOT NULL)');
 db.exec('CREATE TABLE IF NOT EXISTS merchant_quotes(order_id TEXT PRIMARY KEY, terms TEXT NOT NULL, expires INTEGER NOT NULL)');
 return async function charge({method,url,body=new Uint8Array(),amount,payment,approvalWindow=false}){
  const resource=resourceHash(method,url,body);
  if(!payment){
   const current=await api.terms(merchantId);
   if(current.chainId!==1874||current.merchantId.toLowerCase()!==merchantId.toLowerCase())throw new Error('invalid_chain_terms');
   const deadline=clock()+(approvalWindow?180:60);
   const terms={...current,scheme:'countersign-v1',amount:units(amount,current.decimals),resourceHash:resource,orderId:`0x${randomBytes(32).toString('hex')}`,deadline:String(deadline)};
   db.prepare('DELETE FROM merchant_quotes WHERE expires<?').run(clock()-3600);
   db.prepare('INSERT INTO merchant_quotes VALUES (?,?,?)').run(terms.orderId,JSON.stringify(terms),deadline);
   return {status:402,body:terms};
  }
  if(!payment.intent||typeof payment.agentSig!=='string')return {status:400,body:{error:'invalid_payment'}};
  const intent=payment.intent;
  const row=db.prepare('SELECT * FROM merchant_quotes WHERE order_id=?').get(intent.orderId);
  if(!row)return {status:400,body:{error:'unknown_order'}};
  const terms=JSON.parse(row.terms);
  for(const key of ['merchantId','payout','registryVersion','amount','orderId','resourceHash','deadline']){
   if(String(intent[key]).toLowerCase()!==String(terms[key]).toLowerCase())return {status:400,body:{error:'payment_terms_mismatch'}};
  }
  if(resource!==terms.resourceHash||units(amount,terms.decimals)!==terms.amount)return {status:400,body:{error:'resource_mismatch'}};
  const id=paymentId(intent);
  // Always check confirmed receipt first: submitted signatures are retryable,
  // but neither a tx hash nor an HTTP 202 grants the resource.
  const receipt=await api.receipt(id);
  if(receipt){
   if(receipt.status!=='settled'||receipt.amount!==terms.amount||receipt.merchantId.toLowerCase()!==merchantId.toLowerCase()||receipt.resourceHash!==resource)return {status:409,body:{error:'receipt_mismatch'}};
   return {status:200,body:{paymentId:id,txHash:receipt.txHash,orderId:terms.orderId}};
  }
  const submitted=db.prepare('SELECT tx_hash FROM merchant_submissions WHERE payment_id=?').get(id);
  if(submitted)return {status:202,body:{paymentId:id,status:'pending_confirmation',txHash:submitted.tx_hash}};
  if(clock()>row.expires)return {status:410,body:{error:'quote_expired'}};
  const result=await api.settle(payment);
  if(result.error==='needs_approval')return {status:402,body:{...terms,needsApproval:true}};
  if(result.error)return {status:409,body:result};
  if(typeof result.txHash!=='string'||!/^0x[\da-fA-F]{64}$/.test(result.txHash))throw new Error('invalid_submission_response');
  db.prepare('INSERT OR IGNORE INTO merchant_submissions VALUES (?,?)').run(id,result.txHash);
  return {status:202,body:{paymentId:id,status:'pending_confirmation',txHash:result.txHash}};
 };
}
