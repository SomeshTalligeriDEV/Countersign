import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHumanAmount,formatBaseUnits} from '../../shared/src/amount.mjs';
test('amount conversion uses runtime decimals and exact integers',()=>{
 for(const decimals of [0,6,18,36,255]){
 const input=decimals===0?'1':`0.${'0'.repeat(decimals-1)}1`;
 assert.equal(parseHumanAmount(input,decimals),'1');
 assert.equal(formatBaseUnits('1',decimals),input);
 }
 assert.equal(parseHumanAmount('0.50',6),'500000');assert.equal(parseHumanAmount('0.50',18),'500000000000000000');
});
test('amount conversion rejects missing precision, overflow and floating-point inputs',()=>{
 assert.throws(()=>parseHumanAmount('1'),/invalid_token_decimals/);
 for(const amount of ['1e6','-1','NaN',1.5])assert.throws(()=>parseHumanAmount(amount,6));
 assert.throws(()=>parseHumanAmount('0.0000001',6),/amount_precision/);
 assert.throws(()=>parseHumanAmount((1n<<256n).toString(),0),/amount_overflow/);
});
