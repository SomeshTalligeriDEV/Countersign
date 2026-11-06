import {test} from 'node:test';import assert from 'node:assert/strict';import {doctor} from '../doctor.mjs';
test('doctor reports fixes without secrets and fails closed on wrong chain',async()=>{
 const output=[];let reads=0;const results=await doctor({env:{RELAYER_KEY:'DO_NOT_PRINT',WORLD_CLIENT_SECRET:'NEVER_PRINT'},rpc:{getChainId:async()=>1,getCode:async()=>{reads++;}},fetchImpl:async()=>{throw new Error('network');},git:()=>({status:0,stdout:' M file'}),print:line=>output.push(line)});
 assert.equal(reads,0);assert.ok(results.some(r=>!r.ok));assert.ok(output.every(line=>line.startsWith('FAIL')||line.startsWith('PASS')));assert.equal(output.join().includes('DO_NOT_PRINT'),false);assert.match(output.join(),/FIX:/);
});
