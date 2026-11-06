import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../src/store.mjs';
import { ChainObserver } from '../src/observer.mjs';
function fixture() {
 const db=openStore(':memory:');
 const log={eventName:'PaymentExecuted',args:{paymentId:'payment',mandateId:'mandate',merchantId:'merchant',payout:'payout',amount:50n},blockNumber:10n,blockHash:'hash10',transactionHash:'tx',logIndex:0,removed:false};
 const chain={chainId:async()=>1874,blockNumber:async()=>12n,block:async n=>({hash:`hash${n}`,parentHash:`hash${n-1n}`}),paymentLogs:async n=>n===10n?[log]:[]};
 return {db,chain,log,observer:new ChainObserver({db,chain,name:'mandate',startBlock:10n})};
}
test('observer waits for confirmations and resumes without duplicate events or webhooks',async()=>{
 const {db,chain,observer}=fixture();
 try {
 assert.equal((await observer.tick()).processed,0);
 chain.blockNumber=async()=>13n;
 assert.equal((await observer.tick()).processed,1);
 const restarted=new ChainObserver({db,chain,name:'mandate',startBlock:10n});
 assert.equal((await restarted.tick()).processed,0);
 assert.equal(db.prepare('SELECT count(*) AS n FROM chain_events').get().n,1);
 assert.equal(db.prepare('SELECT count(*) AS n FROM outbox').get().n,1);
 assert.equal(JSON.parse(db.prepare('SELECT payload FROM outbox').get().payload).type,'payment.succeeded');
 } finally {db.close();}
});
test('observer rejects reorganized cursor without publishing additional events',async()=>{
 const {db,chain,observer}=fixture();
 try {
 chain.blockNumber=async()=>13n; await observer.tick();
 chain.block=async()=>({hash:'replacement'});
 await assert.rejects(observer.tick(),/observer_reorg/);
 assert.equal(db.prepare('SELECT count(*) AS n FROM outbox').get().n,1);
 } finally {db.close();}
});
test('observer rejects removed logs and wrong chain without advancing cursor',async()=>{
 const {db,chain,log,observer}=fixture();
 try {
 chain.blockNumber=async()=>13n; log.removed=true;
 await assert.rejects(observer.tick(),/invalid_observer_log/);
 assert.equal(db.prepare('SELECT count(*) AS n FROM observer_cursor').get().n,0);
 chain.chainId=async()=>1;
 await assert.rejects(observer.tick(),/wrong_chain/);
 } finally {db.close();}
});

test('confirmed refund updates payment and invalid refund rolls back cursor and outbox',async()=>{
 const {db,chain,observer}=fixture();
 try {
 chain.blockNumber=async()=>13n; await observer.tick();
 const refund={eventName:'PaymentRefunded',args:{paymentId:'payment',amount:20n,totalRefunded:20n},blockNumber:11n,blockHash:'hash11',transactionHash:'refund',logIndex:0};
 chain.paymentLogs=async()=>[refund];chain.blockNumber=async()=>14n;
 await observer.tick();
 let payment=db.prepare('SELECT * FROM confirmed_payments').get();
 assert.equal(payment.status,'partially_refunded');assert.equal(payment.refunded,'20');
 refund.blockNumber=12n;refund.blockHash='hash12';refund.transactionHash='badrefund';refund.args.totalRefunded=60n;
 chain.blockNumber=async()=>15n;
 await assert.rejects(observer.tick(),/invalid_refund_accounting/);
 assert.equal(db.prepare('SELECT block FROM observer_cursor').get().block,'11');
 assert.equal(db.prepare('SELECT count(*) AS n FROM outbox').get().n,2);
 }finally{db.close();}
});
