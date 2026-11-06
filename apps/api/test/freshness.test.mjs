import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observerFreshness} from '../src/freshness.mjs';
import {openStore} from '../src/store.mjs';
import {createHttpApp} from '../src/http-app.mjs';
test('observer is unavailable while starting/backfilling, stale or failed',()=>{
 let now=100000;const state=observerFreshness({clock:()=>now});
 assert.equal(state.healthy(),false);assert.equal(state.status().state,'starting');
 state.success({head:'100',confirmedThrough:'50',caughtUp:false});assert.equal(state.status().state,'backfilling');
 state.success({head:'100',confirmedThrough:'97',caughtUp:true});assert.equal(state.healthy(),true);
 now+=15001;assert.equal(state.status().state,'stale');assert.equal(state.healthy(),false);
 state.failure();assert.equal(state.status().state,'stopped');
});
test('RPC connectivity alone does not make settlement readiness healthy',async()=>{
 const db=openStore(':memory:');try{
 const app=createHttpApp({db,networkStatus:async()=>({chainId:1874,observer:{state:'current'},settlementEnabled:false})});
 assert.equal((await app(new Request('http://localhost/v1/network'))).status,200);
 assert.equal((await app(new Request('http://localhost/health/ready'))).status,503);
 assert.equal((await app(new Request('http://localhost/health/live'))).status,200);
 }finally{db.close();}
});
