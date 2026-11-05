import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../src/store.mjs';
import { GasGuard } from '../src/gasguard.mjs';
const address = `0x${'1'.repeat(40)}`;
const config = { mandateAddress: address, dailyWei: 1000n, mandateDailyWei: 100n, maxFeePerGas: 10n };
const request = {id:'a',mandateId:'m',to:address,functionName:'pay',gas:5n,maxFeePerGas:10n,simulationSucceeded:true};
test('A-02/A-03 deny arbitrary calls and failed simulations with audit records', () => {
 const db=openStore(':memory:'); const guard=new GasGuard(db,config);
 assert.throws(()=>guard.reserve({...request,functionName:'approve'},1000),/not_allowlisted/);
 assert.throws(()=>guard.reserve({...request,simulationSucceeded:false},1000),/would_revert/);
 assert.equal(db.prepare('SELECT count(*) n FROM gasguard_log').get().n,2); db.close();
});
test('A-04 reservations survive restart and prevent budget overspend and duplicates', () => {
 const dir=mkdtempSync(join(tmpdir(),'countersign-'));
 try {
  let db=openStore(join(dir,'state.sqlite')); new GasGuard(db,config).reserve(request,1000); db.close();
  db=openStore(join(dir,'state.sqlite')); const guard=new GasGuard(db,config);
  assert.throws(()=>guard.reserve(request,1001),/duplicate_intent/);
  guard.reserve({...request,id:'b'},1001);
  assert.throws(()=>guard.reserve({...request,id:'c'},1002),/budget/);
  db.close();
 } finally {rmSync(dir,{recursive:true,force:true});}
});
test('pause, fee caps and global budget fail closed', () => {
 const db=openStore(':memory:');
 assert.throws(()=>new GasGuard(db,{...config,paused:true}).reserve(request,1000),/relayer_unavailable/);
 assert.throws(()=>new GasGuard(db,config).reserve({...request,maxFeePerGas:11n},1000),/gas_price/);
 assert.throws(()=>new GasGuard(db,{...config,dailyWei:49n}).reserve(request,1000),/relayer_unavailable/);
 db.close();
});
