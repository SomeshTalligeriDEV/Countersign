import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openStore} from '../src/store.mjs';
import {confirmedReceipt} from '../src/receipt.mjs';
import {paymentId} from '../../../packages/shared/src/crypto.mjs';
const vector=JSON.parse(readFileSync(new URL('../../../packages/shared/vectors/payment.json',import.meta.url)));
function fixture(){
 const db=openStore(':memory:');const intent={...vector.intent};const id=paymentId(intent);
 const event={...intent,paymentId:id,humanApproved:false};
 db.prepare('INSERT INTO confirmed_payments VALUES (?,?,?,?,?,?,?,?,?,?)').run('obs',id,intent.mandateId,intent.merchantId,intent.payout,String(intent.amount),'0','settled','0xtx',JSON.stringify(event));
 db.prepare('INSERT INTO chain_events VALUES (?,?,?,?,?,?,?)').run('obs:0xtx:0','10','0xblock','0xtx',0,'PaymentExecuted',JSON.stringify(event));
 const tx={hash:'0xtx',blockHash:'0xblock',blockNumber:10n,intent};
 const chain={chainId:async()=>1874,paymentTransaction:async()=>tx,block:async()=>({hash:'0xblock'}),blockNumber:async()=>13n};
 return {db,chain,tx,id,observerName:'obs'};
}
test('receipt exposes resource binding only from confirmed transaction intent',async()=>{
 const x=fixture();try{
 const receipt=await confirmedReceipt(x);assert.equal(receipt.resourceHash,vector.intent.resourceHash);assert.equal(receipt.status,'settled');
 x.tx.intent.amount++;await assert.rejects(confirmedReceipt(x),/receipt_intent_mismatch/);
 }finally{x.db.close();}
});
test('receipt rejects replaced block and insufficient confirmation depth',async()=>{
 const x=fixture();try{
 x.tx.blockHash='0xother';await assert.rejects(confirmedReceipt(x),/receipt_reorg/);
 x.tx.blockHash='0xblock';x.chain.blockNumber=async()=>12n;await assert.rejects(confirmedReceipt(x),/receipt_unconfirmed/);
 }finally{x.db.close();}
});
