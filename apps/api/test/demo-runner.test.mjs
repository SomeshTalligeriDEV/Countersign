import {test} from 'node:test';import assert from 'node:assert/strict';
import {runAll,sixSteps} from '../../demo-agent/src/run-all.mjs';
import {createHttpApp} from '../src/http-app.mjs';import {openStore} from '../src/store.mjs';import {GasGuard} from '../src/gasguard.mjs';
test('run-all preserves six-step order and stops on a failed scenario',async()=>{
 const calls=[];let revoked=false;
 const results=await runAll({run:async step=>{calls.push(step);if(step==='replay-after-revoke')assert.equal(revoked,true);return {exitCode:0,output:'fixture-only'};},beforeReplay:async()=>{revoked=true;},print:()=>{}});
 assert.deepEqual(calls,sixSteps);assert.equal(results.length,6);
 let count=0;await assert.rejects(runAll({run:async()=>({exitCode:++count===2?1:0}),print:()=>{}}),/tamper-amount/);assert.equal(count,2);
});
test('arbitrary-relayer demo route is disabled by default and rejects at real GasGuard',async()=>{
 const db=openStore(':memory:');try{
 const guard=new GasGuard(db,{mandateAddress:'0x'+'1'.repeat(40),dailyWei:100n,mandateDailyWei:100n,maxFeePerGas:1n});
 const req=()=>new Request('http://localhost/v1/demo/gasguard',{method:'POST'});
 assert.equal((await createHttpApp({db})(req())).status,404);
 const response=await createHttpApp({db,demoGuard:guard})(req());assert.equal(response.status,409);assert.deepEqual(await response.json(),{error:'gasguard_rejected',reason:'not_allowlisted_call'});
 }finally{db.close();}
});
