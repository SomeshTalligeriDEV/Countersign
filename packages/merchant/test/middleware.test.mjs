import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {countersign} from '../src/index.mjs';
const hash='0x'+'1'.repeat(64),address='0x'+'2'.repeat(40);
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};}
test('HTTP middleware serves only confirmed receipt and polls without repeating submission',async()=>{
 const db=new DatabaseSync(':memory:');let receipt=null,calls=0,nextCalls=0;
 try{
 const api={terms:async()=>({chainId:1874,merchantId:hash,payout:address,registryVersion:'1',decimals:6}),receipt:async()=>receipt,settle:async()=>{calls++;return {txHash:hash};}};
 const charge=countersign({db,merchantId:hash,api,clock:()=>1000}).charge({amount:'0.50'});
 const req={method:'GET',url:'/api/report',headers:{}};let res=response();const next=()=>{nextCalls++;};
 await charge(req,res,next);assert.equal(res.statusCode,402);
 const terms=res.body;
 req.headers['x-payment']=Buffer.from(JSON.stringify({intent:{...terms,mandateId:hash},agentSig:'fixture'})).toString('base64url');
 res=response();await charge(req,res,next);assert.equal(res.statusCode,202);assert.equal(nextCalls,0);
 res=response();await charge(req,res,next);assert.equal(res.statusCode,202);assert.equal(calls,1);
 receipt={status:'settled',amount:terms.amount,merchantId:hash,resourceHash:terms.resourceHash,txHash:hash};
 res=response();await charge(req,res,next);assert.equal(nextCalls,1);assert.equal(req.countersign.txHash,hash);assert.ok(res.headers['x-payment-response']);
 }finally{db.close();}
});
test('middleware rejects malformed payment header and requires exact POST body bytes',async()=>{
 const db=new DatabaseSync(':memory:');try{
 const charge=countersign({db,merchantId:hash,api:{}}).charge({amount:'1'});
 let res=response();await charge({method:'GET',url:'/',headers:{'x-payment':'???'}},res,()=>assert.fail());assert.equal(res.statusCode,400);
 res=response();await charge({method:'POST',url:'/',headers:{},body:{total:1}},res,()=>assert.fail());assert.equal(res.body.error,'raw_body_required');
 }finally{db.close();}
});
