import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createCharge} from '../src/charge.mjs';
const hash='0x'+'1'.repeat(64),address='0x'+'2'.repeat(40);
test('merchant binds quote to exact resource and never serves on submission',async()=>{
 const db=new DatabaseSync(':memory:');let receipt=null,calls=0;
 const api={terms:async()=>({chainId:1874,merchantId:hash,payout:address,registryVersion:'1',decimals:6}),receipt:async()=>receipt,settle:async()=>{calls++;return {txHash:hash};}};
 try{
 const charge=createCharge({db,merchantId:hash,api,clock:()=>1000});
 const request={method:'GET',url:'/api/report',amount:'0.50'};
 const quote=await charge(request);assert.equal(quote.status,402);assert.equal(quote.body.amount,'500000');
 const payment={intent:{...quote.body,mandateId:hash},agentSig:'fixture'};
 assert.equal((await charge({...request,payment})).status,202);assert.equal(calls,1);
 assert.equal((await charge({...request,url:'/api/other',payment})).status,400);
 assert.equal((await charge({...request,payment:{...payment,intent:{...payment.intent,amount:'1'}}})).status,400);
 assert.equal(calls,1);
 receipt={status:'settled',amount:'500000',merchantId:hash,resourceHash:quote.body.resourceHash,txHash:hash};
 assert.equal((await charge({...request,payment})).status,200);
 receipt.status='refunded';assert.equal((await charge({...request,payment})).status,409);
 }finally{db.close();}
});
