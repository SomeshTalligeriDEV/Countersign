import {test} from 'node:test';import assert from 'node:assert/strict';
import {openStore} from '../src/store.mjs';import {createHttpApp} from '../src/http-app.mjs';
function fixture(facilitator){const db=openStore(':memory:');return {db,app:createHttpApp({db,facilitator,clock:()=>1000,networkStatus:async()=>({chainId:1874}),chain:{terms:async(id)=>({merchantId:id})}})};}
const request=body=>new Request('http://localhost/v1/settle',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('HTTP maps bad signature and approval-required responses',async()=>{for(const [error,status]of[['bad_intent_sig',400],['needs_approval',409]]){const x=fixture({settle:async()=>{throw new Error(error)}});assert.equal((await x.app(request({}))).status,status);x.db.close();}});
test('HTTP limits body and rate without calling settlement',async()=>{let calls=0;const x=fixture({settle:async()=>{calls++;return {status:'submitted'}}});assert.equal((await x.app(request('a'.repeat(17000)),{ip:'a'})).status,413);assert.equal(calls,0);for(let n=0;n<10;n++)await x.app(request({}),{ip:'b'});assert.equal((await x.app(request({}),{ip:'b'})).status,429);assert.equal(calls,10);x.db.close();});
test('HTTP cannot pretend settlement is configured',async()=>{const x=fixture(null);assert.equal((await x.app(request({}))).status,503);x.db.close();});
