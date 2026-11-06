import test from 'node:test';
import assert from 'node:assert/strict';
import {runObserver,isTransientRpcError} from '../src/observer-runner.mjs';
test('observer retries transient RPC errors and still halts on non-transient ones',async()=>{
 assert.equal(isTransientRpcError(Object.assign(new Error('x'),{cause:Object.assign(new Error('The request timed out.'),{name:'TimeoutError'})})),true);
 assert.equal(isTransientRpcError(new Error('reorg detected')),false);
 const results=['timeout','ok','reorg'];let calls=0,retries=0,ok=0,halted=null;
 const done=new Promise(resolve=>{
  runObserver({tick:async()=>{const r=results[calls++];if(r==='timeout')throw Object.assign(new Error('fetch failed'),{name:'HttpRequestError'});if(r==='reorg')throw new Error('reorg detected');return {head:1};}},
   {intervalMs:1,onRetry:()=>{retries++;},onSuccess:()=>{ok++;},onError:e=>{halted=e.message;resolve();}});
 });
 await done;
 assert.equal(retries,1);assert.equal(ok,1);assert.equal(halted,'reorg detected');assert.equal(calls,3);
});
