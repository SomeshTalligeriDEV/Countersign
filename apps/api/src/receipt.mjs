import { paymentId } from '../../../packages/shared/src/crypto.mjs';
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
export async function confirmedReceipt({db,chain,observerName,id}){
 const row=db.prepare('SELECT * FROM confirmed_payments WHERE observer=? AND payment_id=?').get(observerName,id);
 if(!row)return null;
 if(await chain.chainId()!==1874)throw new Error('wrong_chain');
 const events=db.prepare("SELECT * FROM chain_events WHERE tx_hash=? AND event='PaymentExecuted'").all(row.tx_hash);
 const source=events.find(e=>e.id.startsWith(`${observerName}:`)&&same(JSON.parse(e.payload).paymentId,id));
 if(!source)throw new Error('receipt_event_missing');
 const event=JSON.parse(source.payload);
 const tx=await chain.paymentTransaction(row.tx_hash);
 const block=await chain.block(BigInt(source.block));
 if(!same(tx.hash,row.tx_hash)||!same(tx.blockHash,source.block_hash)||!same(block.hash,source.block_hash)||tx.blockNumber!==BigInt(source.block))throw new Error('receipt_reorg');
 if(await chain.blockNumber()<BigInt(source.block)+3n)throw new Error('receipt_unconfirmed');
 const intent=tx.intent;
 if(!same(paymentId(intent),id))throw new Error('receipt_intent_mismatch');
 for(const key of ['mandateId','merchantId','payout','orderId'])if(!same(intent[key],event[key]))throw new Error('receipt_intent_mismatch');
 if(BigInt(intent.amount)!==BigInt(event.amount)||BigInt(row.amount)!==BigInt(event.amount))throw new Error('receipt_intent_mismatch');
 return {paymentId:id,mandateId:event.mandateId,merchantId:event.merchantId,payout:event.payout,amount:row.amount,refunded:row.refunded,status:row.status,orderId:event.orderId,resourceHash:intent.resourceHash,humanApproved:event.humanApproved,txHash:row.tx_hash,explorerUrl:`https://explorer.testnet.whitechain.io/tx/${row.tx_hash}`};
}
