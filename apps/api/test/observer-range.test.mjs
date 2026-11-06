import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../src/store.mjs';
import {ChainObserver} from '../src/observer.mjs';
test('observer fast-forwards empty spans with ranged logs, then processes event blocks per-block',async()=>{
 const db=openStore(':memory:');
 const ranges=[],perBlock=[];
 const chain={chainId:async()=>1874,blockNumber:async()=>2003n,block:async n=>({hash:`h${n}`,parentHash:`h${n-1n}`}),
  logsInRange:async(a,b)=>{ranges.push([a,b]);return b>=1500n&&a<=1500n?[{blockNumber:1500n,removed:false}]:[];},
  paymentLogs:async n=>{perBlock.push(n);return [];}};
 const obs=new ChainObserver({db,chain,name:'t',startBlock:'1000'});
 const r1=await obs.tick();
 assert.deepEqual(ranges[0],[1000n,1939n],'range capped at head-64 (2003-64)');
 assert.equal(perBlock[0],1500n,'event block goes through the per-block path');
 assert.ok(!perBlock.includes(1499n),'empty span skipped');
 assert.ok(BigInt(r1.confirmedThrough)>=1500n);
 // a reorg of the cursor block is still detected before any jump
 chain.block=async n=>({hash:n===BigInt(r1.confirmedThrough)?'forked':`h${n}`,parentHash:`h${n-1n}`});
 await assert.rejects(obs.tick(),/observer_reorg/);
 // removed (reorged) logs in a range are rejected
 const db2=openStore(':memory:');
 const chain2={...chain,block:async n=>({hash:`h${n}`,parentHash:`h${n-1n}`}),logsInRange:async()=>[{blockNumber:1200n,removed:true}]};
 await assert.rejects(new ChainObserver({db:db2,chain:chain2,name:'t2',startBlock:'1000'}).tick(),/observer_reorg/);
 // target hash changing during the range query is rejected
 let flip=0;const chain3={...chain2,logsInRange:async()=>[],block:async n=>({hash:n===1999n||n===1939n?`x${flip++}`:`h${n}`,parentHash:`h${n-1n}`})};
 await assert.rejects(new ChainObserver({db:openStore(':memory:'),chain:chain3,name:'t3',startBlock:'1000'}).tick(),/observer_reorg/);
});
