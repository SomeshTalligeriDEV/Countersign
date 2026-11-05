import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WhitechainRpc } from '../src/rpc.mjs';
function rpc(values) {
 return new WhitechainRpc('https://test.invalid',async (_, options) => {
  const {method}=JSON.parse(options.body);
  return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:values[method]})};
 });
}
test('reads token decimals from RPC rather than assuming six',async()=>{
 const client=rpc({eth_chainId:'0x752',eth_blockNumber:'0x10',eth_call:`0x${(18).toString(16).padStart(64,'0')}`,eth_getCode:'0x6080'});
 const state=await client.status(); assert.equal(state.tokenDecimals,18); assert.equal(state.block,'16');
});
test('fails closed on wrong chain and missing token',async()=>{
 await assert.rejects(rpc({eth_chainId:'0x1'}).status(),/wrong_chain/);
 await assert.rejects(rpc({eth_chainId:'0x752',eth_blockNumber:'0x10',eth_call:`0x${'0'.repeat(64)}`,eth_getCode:'0x'}).status(),/invalid_token/);
});
