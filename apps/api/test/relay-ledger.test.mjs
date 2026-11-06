import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../src/store.mjs';
import {RelayLedger} from '../src/relay-ledger.mjs';
const hash='0x'+'a'.repeat(64);
test('relay persists before broadcast and restart rebroadcasts identical signed bytes',async()=>{
 const db=openStore(':memory:');let signatures=0,calls=0,receipt=null;
 try{
 const chain={chainId:async()=>1874,signPay:async()=>{signatures++;return {hash,raw:'0x1234',nonce:7};},broadcastRaw:async raw=>{calls++;assert.equal(raw,'0x1234');assert.equal(db.prepare('SELECT tx_hash FROM relay_transactions').get().tx_hash,hash);if(calls===1)throw new Error('timeout');return hash;},relayReceipt:async()=>receipt,relayNonce:async()=>7n};
 const ledger=new RelayLedger({db,chain});
 await assert.rejects(ledger.submit('intent',{}),/broadcast_outcome_unknown/);
 const restarted=new RelayLedger({db,chain});assert.equal(await restarted.recover(),1);assert.equal(signatures,1);assert.equal(calls,2);
 await assert.rejects(restarted.submit('another',{}),/relay_recovery_required/);
 receipt={status:'success'};assert.equal(await restarted.recover(),0);assert.equal(db.prepare('SELECT status FROM relay_transactions').get().status,'included');
 }finally{db.close();}
});
test('recovery retains unknown nonce outcome instead of signing or spending again',async()=>{
 const db=openStore(':memory:');try{
 const chain={chainId:async()=>1874,relayReceipt:async()=>null,relayNonce:async()=>8n,broadcastRaw:async()=>assert.fail()};
 const ledger=new RelayLedger({db,chain});db.prepare('INSERT INTO relay_transactions VALUES (?,?,?,?,?,?,?)').run('id',hash,'7','0x1234','unknown',1,null);
 assert.equal(await ledger.recover(),1);assert.equal(db.prepare('SELECT error FROM relay_transactions').get().error,'nonce_consumed_without_receipt');
 }finally{db.close();}
});
