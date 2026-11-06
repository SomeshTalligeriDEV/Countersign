import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HttpRequestError,RpcRequestError} from '../../../packages/shared/src/viem-runtime.mjs';
import {openStore} from '../src/store.mjs';
import {RelayLedger} from '../src/relay-ledger.mjs';
import {classifyRpcError} from '../src/relay-errors.mjs';
import {WhitechainRpc} from '../src/rpc.mjs';
import {whitechainSepolia,withRpc,explorerTx,explorerAddress,USDT_ADDRESS} from '../../../packages/shared/src/chain.mjs';
const hash='0x'+'b'.repeat(64);
// FIXTURE errors shaped like viem's real wrappers around Whitechain RPC responses.
const http429=()=>new HttpRequestError({url:'https://rpc.testnet.whitechain.io',status:429,headers:new Headers({'retry-after':'1'}),details:'Too Many Requests'});
const rpcErr=message=>new RpcRequestError({body:{},url:'https://rpc.testnet.whitechain.io',error:{code:-32000,message}});
test('classifies real RPC error shapes',()=>{
 assert.deepEqual(classifyRpcError(http429()),{kind:'rate_limited',retryMs:1000});
 assert.equal(classifyRpcError(new Error('wrapped',{cause:rpcErr('nonce too low: next nonce 8, tx nonce 7')})).kind,'nonce_too_low');
 assert.equal(classifyRpcError(rpcErr('replacement transaction underpriced')).kind,'replacement_underpriced');
 assert.equal(classifyRpcError(rpcErr('already known')).kind,'already_known');
 assert.equal(classifyRpcError(new Error('socket hang up')).kind,'unknown');
});
function ledgerWith(broadcastRaw){
 const db=openStore(':memory:');const sleeps=[];
 const chain={chainId:async()=>1874,signPay:async()=>({hash,raw:'0xabcd',nonce:3}),broadcastRaw,relayReceipt:async()=>null,relayNonce:async()=>3n};
 return {db,sleeps,ledger:new RelayLedger({db,chain,sleep:async ms=>{sleeps.push(ms);}})};
}
test('429 rebroadcasts identical bytes after Retry-After, then submits',async()=>{
 let calls=0;const raws=[];
 const {db,ledger,sleeps}=ledgerWith(async raw=>{raws.push(raw);if(++calls<3)throw http429();return hash;});
 try{assert.equal(await ledger.submit('i',{}),hash);assert.deepEqual(sleeps,[1000,1000]);assert.deepEqual(raws,['0xabcd','0xabcd','0xabcd']);
 assert.equal(db.prepare('SELECT status FROM relay_transactions').get().status,'submitted');}finally{db.close();}
});
test('persistent 429 leaves outcome unknown for recovery, no new signature',async()=>{
 const {db,ledger,sleeps}=ledgerWith(async()=>{throw http429();});
 try{await assert.rejects(ledger.submit('i',{}),/broadcast_rate_limited/);assert.equal(sleeps.length,3);
 const row=db.prepare('SELECT status,error FROM relay_transactions').get();assert.deepEqual({...row},{status:'unknown',error:'rate_limited'});}finally{db.close();}
});
test('nonce too low and replacement underpriced are recorded, never retried or re-signed',async()=>{
 for(const [msg,code] of [['nonce too low','nonce_too_low'],['replacement transaction underpriced','replacement_underpriced']]){
  let calls=0;const {db,ledger,sleeps}=ledgerWith(async()=>{calls++;throw rpcErr(msg);});
  try{await assert.rejects(ledger.submit('i',{}),new RegExp(`broadcast_${code}`));assert.equal(calls,1);assert.equal(sleeps.length,0);
  assert.equal(db.prepare('SELECT error FROM relay_transactions').get().error,code);
  await assert.rejects(ledger.submit('j',{}),/relay_recovery_required/);}finally{db.close();}
 }
});
test('already known means the same signed tx is in the mempool',async()=>{
 const {db,ledger}=ledgerWith(async()=>{throw rpcErr('already known');});
 try{assert.equal(await ledger.submit('i',{}),hash);assert.equal(db.prepare('SELECT status FROM relay_transactions').get().status,'submitted');}finally{db.close();}
});
test('read-only RPC surfaces 429 distinctly',async()=>{
 const rpc=new WhitechainRpc('https://test.invalid',async()=>({ok:false,status:429}));
 await assert.rejects(rpc.call('eth_chainId'),/rpc_rate_limited/);
});
test('single chain definition matches official Whitechain Sepolia docs',()=>{
 assert.equal(whitechainSepolia.id,1874);
 assert.equal(whitechainSepolia.rpcUrls.default.http[0],'https://rpc.testnet.whitechain.io');
 assert.equal(withRpc('https://example.invalid').blockExplorers.default.url,'https://explorer.testnet.whitechain.io');
 assert.equal(USDT_ADDRESS,'0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7');
 assert.equal(explorerTx(hash),`https://explorer.testnet.whitechain.io/tx/${hash}`);
 assert.equal(explorerAddress(USDT_ADDRESS),`https://explorer.testnet.whitechain.io/address/${USDT_ADDRESS}`);
 assert.throws(()=>explorerTx('0x12'),/invalid_tx_hash/);
});
