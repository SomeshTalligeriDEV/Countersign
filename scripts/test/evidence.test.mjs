import {test} from 'node:test';import assert from 'node:assert/strict';import {evidence} from '../evidence.mjs';
test('evidence never fills missing claims and accepts only testnet input',()=>{
 assert.match(evidence({}),/TODO-HUMAN address/);assert.throws(()=>evidence({chainId:1}),/testnet/);assert.throws(()=>evidence({privateKey:'never-log'}),/unsupported/);
 const output=evidence({chainId:1874,contracts:{Mandate:{address:'0x'+'1'.repeat(40)}},transactions:{firstPayment:'0x'+'a'.repeat(64)}});
 assert.ok(output.includes('https://explorer.testnet.whitechain.io/tx/0x'+'a'.repeat(64)));assert.match(output,/not been independently checked/);
 assert.throws(()=>evidence({transactions:{firstPayment:'fake'}}),/invalid_demo_tx/);
});
