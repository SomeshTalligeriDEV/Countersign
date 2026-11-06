import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attackIntent,submitAttack} from '../../demo-agent/src/attacks.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/test-signing.mjs';
import {Facilitator} from '../src/facilitator.mjs';
import {openStore} from '../src/store.mjs';
import {GasGuard} from '../src/gasguard.mjs';
const address='0x'+'1'.repeat(40),id='0x'+'a'.repeat(64);
test('CLI attack scenarios execute actual signing and reject before fixture-chain broadcast',async()=>{
 const db=openStore(':memory:');try{
 const account=privateKeyToAccount('0x'+'0'.repeat(63)+'2');let epoch=1n,broadcasts=0;
 const chain={chainId:async()=>1874,policy:async()=>({agent:account.address,epoch,perTxLimit:10000000n,humanThreshold:10000000n,expiry:2000n,paused:false}),terms:async()=>({payout:address,registryVersion:'1',decimals:6}),remaining:async()=>500000n,simulatePay:async()=>{throw new Error('OverPeriod');},broadcastPay:async()=>{broadcasts++;}};
 const facilitator=new Facilitator({db,chain,guard:new GasGuard(db,{mandateAddress:address,dailyWei:10000n,mandateDailyWei:10000n,maxFeePerGas:2n}),mandateAddress:address,clock:()=>1000});
 const fetchImpl=async(_url,init)=>{try{return Response.json(await facilitator.settle(JSON.parse(init.body)),{status:202});}catch(error){const [kind,reason]=error.message.split(':');return Response.json({error:kind,reason},{status:409});}};
 for(const name of ['tamper-amount','tamper-payout','over-budget']){
  const body=await attackIntent({name,chain,account,mandateId:id,merchantId:id,mandateAddress:address,clock:()=>1000});assert.equal((await submitAttack({name,body,apiUrl:'http://localhost',fetchImpl})).status,'rejected');
 }
 const saved=await attackIntent({name:'save-replay',chain,account,mandateId:id,merchantId:id,mandateAddress:address,clock:()=>1000});epoch++;
 assert.equal((await submitAttack({name:'replay-after-revoke',body:saved,apiUrl:'http://localhost',fetchImpl})).error,'StaleEpoch');assert.equal(broadcasts,0);
 }finally{db.close();}
});
