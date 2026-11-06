import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../src/store.mjs';
import {ChainObserver} from '../src/observer.mjs';
test('observer fast-forwards empty spans with ranged logs, then processes event blocks per-block',async()=>{
 const db=openStore(':memory:');
 const ranges=[],perBlock=[];
 const chain={chainId:async()=>1874,blockNumber:async()=>2003n,block:async n=>({hash:`h${n}`,parentHash:`h${n-1n}`}),
  logsInRange:async(a,b)=>{ranges.push([a,b]);return b>=1500n&&a<=1500n?[{blockNumber:1500n}]:[];},
  paymentLogs:async n=>{perBlock.push(n);return [];}};
 const obs=new ChainObserver({db,chain,name:'t',startBlock:'1000'});
 const r1=await obs.tick();
 assert.deepEqual(ranges[0],[1000n,1999n]);
 assert.equal(perBlock[0],1500n,'event block goes through the per-block path');
 assert.ok(!perBlock.includes(1499n),'empty span skipped');
 assert.ok(BigInt(r1.confirmedThrough)>=1500n);
 // a reorg of the cursor block is still detected before any jump
 chain.block=async n=>({hash:n===BigInt(r1.confirmedThrough)?'forked':`h${n}`,parentHash:`h${n-1n}`});
 await assert.rejects(obs.tick(),/observer_reorg/);
 db.close?.();
});
