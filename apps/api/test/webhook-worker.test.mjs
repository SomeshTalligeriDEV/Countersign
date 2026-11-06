import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../src/store.mjs';
import { WebhookWorker } from '../src/webhook-worker.mjs';
import { verifyWebhook } from '../../../packages/merchant/src/webhooks.mjs';
test('webhook retries durable outbox and signs exact transmitted bytes',async()=>{
 const db=openStore(':memory:');let now=1000;let calls=0;const secret='x'.repeat(32);
 try{
 db.prepare('INSERT INTO chain_events VALUES (?,?,?,?,?,?,?)').run('obs:tx:0','1','hash','tx',0,'PaymentExecuted','{}');
 db.prepare('INSERT INTO confirmed_payments VALUES (?,?,?,?,?,?,?,?,?,?)').run('obs','pay','mandate','merchant','payout','50','0','settled','tx','{}');
 db.prepare('INSERT INTO outbox(id,event_id,payload,next_at) VALUES (?,?,?,?)').run('obs:tx:0','obs:tx:0',JSON.stringify({type:'payment.succeeded',data:{paymentId:'pay',observer:'obs'}}),now);
 const worker=new WebhookWorker({db,clock:()=>now,resolveMerchant:async id=>{assert.equal(id,'merchant');return {secret};},deliver:async({body,headers})=>{
 calls++;assert.equal(verifyWebhook(secret,body,headers['x-countersign-signature'],now),true);
 assert.equal(headers['idempotency-key'],'pay');return {ok:calls>1};
 }});
 await worker.tick();assert.equal(db.prepare('SELECT next_at FROM outbox').get().next_at,1060);
 await worker.tick();assert.equal(calls,1);
 now=1060;await worker.tick();await worker.tick();assert.equal(calls,2);
 assert.equal(db.prepare('SELECT status FROM outbox').get().status,'delivered');
 }finally{db.close();}
});
