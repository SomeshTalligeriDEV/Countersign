import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { privateKeyToAccount } from '../../../packages/shared/src/test-signing.mjs';
import { paymentDomain,paymentTypes } from '../../../packages/shared/src/index.ts';
import { Facilitator } from '../src/facilitator.mjs';
import { openStore } from '../src/store.mjs';
import { GasGuard } from '../src/gasguard.mjs';
const vector=JSON.parse(readFileSync(new URL('../../../packages/shared/vectors/payment.json',import.meta.url)));
const address=vector.domain.verifyingContract;
async function setup(){
 const account=privateKeyToAccount(`0x${'0'.repeat(63)}2`);
 const intent=Object.fromEntries(Object.entries(vector.intent).map(([k,v])=>[k,typeof v==='number'?String(v):v]));
 const agentSig=await account.signTypedData({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentIntent',message:intent});
 const db=openStore(':memory:');let broadcasts=0;let rejectSimulation=false;
 const policy={agent:account.address,paused:false,expiry:1800000100n,epoch:3n,perTxLimit:1000000n,humanThreshold:900000n};
 const chain={chainId:async()=>1874,policy:async()=>policy,simulatePay:async()=>{if(rejectSimulation)throw new Error('RegistryMismatch');return {gas:10n,maxFeePerGas:1n};},broadcastPay:async()=>{broadcasts++;return `0x${'8'.repeat(64)}`;}};
 const guard=new GasGuard(db,{mandateAddress:address,dailyWei:10000n,mandateDailyWei:1000n,maxFeePerGas:2n});
 const service=new Facilitator({chain,guard,db,mandateAddress:address,clock:()=>1799999990});
 return {service,db,body:{intent,agentSig},policy,get broadcasts(){return broadcasts;},failSimulation(){rejectSimulation=true;}};
}
test('A-01 tampered signed intent never broadcasts',async()=>{const x=await setup();try{await assert.rejects(x.service.settle({...x.body,intent:{...x.body.intent,amount:'500001'}}),/bad_intent_sig/);assert.equal(x.broadcasts,0);}finally{x.db.close();}});
test('A-03 authoritative simulation rejection never broadcasts',async()=>{const x=await setup();try{x.failSimulation();await assert.rejects(x.service.settle(x.body),/would_revert/);assert.equal(x.broadcasts,0);}finally{x.db.close();}});
test('successful broadcast is submitted, never prematurely settled; duplicate is blocked',async()=>{const x=await setup();try{const result=await x.service.settle(x.body);assert.equal(result.status,'submitted');await assert.rejects(x.service.settle(x.body),/duplicate_intent/);assert.equal(x.broadcasts,1);}finally{x.db.close();}});
test('threshold payment cannot use automatic path',async()=>{const x=await setup();try{x.policy.humanThreshold=500000n;await assert.rejects(x.service.settle(x.body),/needs_approval/);assert.equal(x.broadcasts,0);}finally{x.db.close();}});
