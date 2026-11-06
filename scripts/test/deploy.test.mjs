import {test} from 'node:test';import assert from 'node:assert/strict';import {resumeDeploy} from '../human-deploy.mjs';
test('resumable deploy saves before mutation, skips completed fake-chain steps and never retries unknown submission',async()=>{
 const state={},writes=[];let calls=0;const save=value=>writes.push(structuredClone(value));
 const steps=['deployRegistry','deployMandate','verify','register','mandate','limits','allowance','pay'].map(id=>({id,run:async()=>{assert.equal(state.steps[id].status,'running');calls++;return {txHash:'0x'+'a'.repeat(64)};}}));
 await resumeDeploy({steps,state,save,print:()=>{}});await resumeDeploy({steps,state,save,print:()=>{}});assert.equal(calls,8);assert.equal(writes.length,16);
 const unknown={};let sends=0;const failing=[{id:'pay',run:async()=>{sends++;throw new Error('lost response');}}];
 await assert.rejects(resumeDeploy({steps:failing,state:unknown,save:()=>{},print:()=>{}}),/unknown/);
 await assert.rejects(resumeDeploy({steps:failing,state:unknown,save:()=>{},print:()=>{}}),/reconcile/);assert.equal(sends,1);
});
test('resumable deployment recovers an interrupted fake-chain step only with evidence',async()=>{
 const state={steps:{pay:{status:'unknown'}}};let sent=false;
 await resumeDeploy({state,save:()=>{},print:()=>{},steps:[{id:'pay',recover:async()=>({txHash:'0x'+'a'.repeat(64)}),run:async()=>{sent=true;}}]});
 assert.equal(sent,false);assert.equal(state.steps.pay.status,'done');
});
