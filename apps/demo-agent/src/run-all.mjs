import {mkdtempSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {createChainAdapter} from '../../api/src/chain.mjs';
export const sixSteps=['buy-report','tamper-amount','tamper-payout','order-40','over-budget','replay-after-revoke'];
export async function runAll({run,beforeReplay=async()=>{},print=console.log}){
 const results=[];
 for(const step of sixSteps){
  try{
   if(step==='replay-after-revoke')await beforeReplay();
   const result=await run(step);const label=result.fixtureOnly?'FIXTURE':'LIVE';
   results.push({step,...result});print(`${label} ${result.exitCode===0?'PASS':'FAIL'} ${step}: ${result.output??'no result details'}`);
   if(result.exitCode!==0)throw new Error(`Demo stopped at ${step}; no success claimed`);
  }catch(error){if(!results.some(r=>r.step===step))print(`FAIL ${step}: ${error.message}`);throw error;}
 }
 return results;
}
export function runCommand(command,{env=process.env}={}){return new Promise(resolve=>{
 const child=spawn(process.execPath,[new URL('./cli.mjs',import.meta.url).pathname,command],{env,stdio:['ignore','pipe','pipe']});let output='';
 const collect=data=>{output+=data.toString();if(output.length>16000)child.kill();};child.stdout.on('data',collect);child.stderr.on('data',collect);child.on('error',()=>resolve({exitCode:1,output:'Could not launch scenario'}));child.on('close',code=>resolve({exitCode:code??1,output:output.slice(0,16000)}));
});}
if(process.argv[1]===new URL(import.meta.url).pathname){
 mkdirSync('.demo-runs',{recursive:true,mode:0o700});
 const directory=mkdtempSync('.demo-runs/run-');
 const runEnv={...process.env,REPLAY_FILE:`${directory}/unused-${randomUUID()}.json`};
 const chain=createChainAdapter({rpcUrl:process.env.WHITECHAIN_RPC_URL??'https://rpc.testnet.whitechain.io',mandateAddress:process.env.MANDATE_ADDRESS,registryAddress:process.env.REGISTRY_ADDRESS});
 runAll({run:command=>runCommand(command,{env:runEnv}),beforeReplay:async()=>{
  const saved=await runCommand('save-replay',{env:runEnv});if(saved.exitCode!==0)throw new Error('Could not save unused intent; existing replay file must be reconciled first');
  const epoch=(await chain.policy(process.env.MANDATE_ID)).epoch;console.log('Revoke the mandate in the owner wallet now. Waiting up to 120 seconds for epoch change.');
  for(let attempt=0;attempt<60;attempt++){if((await chain.policy(process.env.MANDATE_ID)).epoch!==epoch)return;await delay(2000);}throw new Error('No revocation observed');
 }}).catch(error=>{console.error(error.message);process.exitCode=1;});
}
