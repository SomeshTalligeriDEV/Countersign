import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../src/store.mjs';
import {createHttpApp} from '../src/http-app.mjs';
import {paymentCsv} from '../src/payment-history.mjs';
import {runObserver} from '../src/observer-runner.mjs';
test('history is scoped to configured contract and mandate; CSV and query validation',async()=>{
 const db=openStore(':memory:');const mandate='0x'+'a'.repeat(64);
 try{
 const insert=db.prepare('INSERT INTO confirmed_payments VALUES (?,?,?,?,?,?,?,?,?,?)');
 insert.run('active','pay',mandate,'merchant','payout','500000','0','settled','0x123','{}');
 insert.run('other','hidden',mandate,'merchant','payout','900000','0','settled','0x456','{}');
 const unavailable=createHttpApp({db,observerName:'active',observerHealthy:()=>false});
 assert.equal((await unavailable(new Request(`http://localhost/v1/payments?mandateId=${mandate}`))).status,503);
 const app=createHttpApp({db,observerName:'active'});
 const response=await app(new Request(`http://localhost/v1/payments?mandateId=${mandate}`));
 const body=await response.json();assert.equal(body.payments.length,1);assert.equal(body.payments[0].amount,'500000');assert.equal(body.nextOffset,null);
 assert.equal((await app(new Request('http://localhost/v1/payments?mandateId=bad'))).status,400);
 assert.equal((await app(new Request(`http://localhost/v1/payments?mandateId=${mandate}&offset=-1`))).status,400);
 const csv=await app(new Request(`http://localhost/v1/payments.csv?mandateId=${mandate}`));
 assert.match(csv.headers.get('content-type'),/text\/csv/);assert.match(await csv.text(),/500000/);
 assert.match(paymentCsv([{paymentId:'=HYPERLINK("evil")'}]),/'=HYPERLINK/);
 }finally{db.close();}
});
test('observer runner stops after error and shutdown waits for in-flight tick',async()=>{
 let finish;let failed=false;
 const stop=runObserver({tick:()=>new Promise((_,reject)=>{finish=reject;})},{onError:()=>{failed=true;}});
 let stopped=false;const shutdown=stop().then(()=>{stopped=true;});
 await Promise.resolve();assert.equal(stopped,false);
 finish(new Error('reorg'));await shutdown;assert.equal(failed,true);assert.equal(stopped,true);
});
