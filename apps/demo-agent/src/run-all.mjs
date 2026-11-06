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
// --dry-run: validate config shape and print the six-step plan; no key use, no network, no files.
export function dryRunPlan(env=process.env){
 const errors=[],hex=(v,n)=>new RegExp(`^0x[0-9a-fA-F]{${n}}$`).test(v??'');
 if(!hex(env.AGENT_KEY,64))errors.push('AGENT_KEY missing or not 32-byte hex (value never printed)');
 for(const k of ['MANDATE_ADDRESS','REGISTRY_ADDRESS'])if(!hex(env[k],40))errors.push(`${k} missing or not an address`);
 for(const k of ['MANDATE_ID','MERCHANT_ID'])if(!hex(env[k],64))errors.push(`${k} missing or not bytes32`);
 if(!/^[1-9]\d*$/.test(env.MAX_AMOUNT_BASE_UNITS??''))errors.push('MAX_AMOUNT_BASE_UNITS missing or not a positive integer');
 for(const k of ['WHITECHAIN_RPC_URL','COUNTERSIGN_API','COUNTERSIGN_WEB','REPORT_URL','ORDER_URL'])if(env[k]){try{new URL(env[k]);}catch{errors.push(`${k} is not a URL`);}}
 const api=env.COUNTERSIGN_API??'http://127.0.0.1:3001',report=env.REPORT_URL??'http://127.0.0.1:4000/api/report',order=env.ORDER_URL??'http://127.0.0.1:4000/api/order-priced-report';
 const lines=[`config: rpc=${env.WHITECHAIN_RPC_URL??'https://rpc.testnet.whitechain.io'} api=${api} web=${env.COUNTERSIGN_WEB??'http://127.0.0.1:3000'} mandate=${env.MANDATE_ADDRESS} registry=${env.REGISTRY_ADDRESS} mandateId=${env.MANDATE_ID} merchantId=${env.MERCHANT_ID} max=${env.MAX_AMOUNT_BASE_UNITS}`,
  `PLAN buy-report: agent pays ${report} under the mandate (expect LIVE PASS, tx on explorer)`,
  `PLAN tamper-amount: signed intent with altered amount -> ${api} (expect rejection)`,
  `PLAN tamper-payout: signed intent with altered payout -> ${api} (expect rejection)`,
  `PLAN order-40: ${order} above humanThreshold -> pending_human, owner approves via World on web, then settles`,
  `PLAN over-budget: intent above perTx/period limit (expect rejection)`,
  `PLAN replay-after-revoke: save-replay, owner revokes mandate in wallet (epoch change, 120s wait), replay -> expect rejection`];
 return {ok:errors.length===0,errors,lines};
}
if(process.argv[1]===new URL(import.meta.url).pathname&&process.argv.includes('--dry-run')){
 const {ok,errors,lines}=dryRunPlan();console.log('DRY-RUN demo:all: nothing signed, sent or written.');
 for(const e of errors)console.log('FAIL config '+e);if(ok)for(const l of lines)console.log(l);
 console.log(ok?'DRY-RUN complete: config valid.':'DRY-RUN failed: fix config.');process.exitCode=ok?0:1;
}
else if(process.argv[1]===new URL(import.meta.url).pathname){
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
