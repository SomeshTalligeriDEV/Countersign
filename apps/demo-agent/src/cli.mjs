import {readFileSync,writeFileSync} from 'node:fs';
import {attackIntent,submitAttack} from './attacks.mjs';
import {approvalApi} from '../../../packages/agent/src/approvals.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import {createAgent} from '../../../packages/agent/src/index.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/viem-runtime.mjs';
import {createChainAdapter} from '../../api/src/chain.mjs';
async function main(){
 const command=process.argv[2];if(!['buy-report','order-40','tamper-amount','tamper-payout','over-budget','save-replay','replay-after-revoke','arbitrary-relayer-call'].includes(command))throw new Error('Unknown scenario');
 for(const key of ['AGENT_KEY','MANDATE_ID','MANDATE_ADDRESS','REGISTRY_ADDRESS','MERCHANT_ID','MAX_AMOUNT_BASE_UNITS'])if(!process.env[key])throw new Error(`Missing ${key}`);
 if(command==='arbitrary-relayer-call'){const response=await fetch(new URL('/v1/demo/gasguard',process.env.COUNTERSIGN_API??'http://127.0.0.1:3001'),{method:'POST',headers:{'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});const result=await response.json();if(result.error!=='gasguard_rejected'||result.reason!=='not_allowlisted_call')throw new Error('Expected rejection not demonstrated');console.log(JSON.stringify({scenario:command,status:'rejected',...result,evidence:'GasGuard decision; no transaction broadcast'}));return;}
 const chain=createChainAdapter({rpcUrl:process.env.WHITECHAIN_RPC_URL??'https://rpc.testnet.whitechain.io',mandateAddress:process.env.MANDATE_ADDRESS,registryAddress:process.env.REGISTRY_ADDRESS});
 if(!['buy-report','order-40'].includes(command)){
  const path=process.env.REPLAY_FILE??'.countersign-replay.json';
  const body=command==='replay-after-revoke'?JSON.parse(readFileSync(path,'utf8')):await attackIntent({name:command,chain,account:privateKeyToAccount(process.env.AGENT_KEY),mandateId:process.env.MANDATE_ID,merchantId:process.env.MERCHANT_ID,mandateAddress:process.env.MANDATE_ADDRESS});
  if(command==='save-replay'){writeFileSync(path,JSON.stringify(body),{mode:0o600,flag:'wx'});console.log('Unused signed intent saved locally. Revoke the mandate before replaying it within its deadline.');return;}
  console.log(JSON.stringify(await submitAttack({name:command,body,apiUrl:process.env.COUNTERSIGN_API??'http://127.0.0.1:3001'})));return;
 }
 const agent=createAgent({account:privateKeyToAccount(process.env.AGENT_KEY),mandateId:process.env.MANDATE_ID,mandateAddress:process.env.MANDATE_ADDRESS,merchantIds:[process.env.MERCHANT_ID],maxAmount:process.env.MAX_AMOUNT_BASE_UNITS,approvalApi:approvalApi(process.env.COUNTERSIGN_API??'http://127.0.0.1:3001',process.env.COUNTERSIGN_WEB??'http://127.0.0.1:3000'),readPolicy:async id=>({...await chain.policy(id),remaining:await chain.remaining(id)})});
 let result=await agent.fetch(command==='order-40'?(process.env.ORDER_URL??'http://127.0.0.1:4000/api/order-priced-report'):(process.env.REPORT_URL??'http://127.0.0.1:4000/api/report'));
 if(result.status==='pending_human'){console.log(JSON.stringify({status:'pending_human',approvalId:result.approvalId,approveUrl:result.approveUrl}));let confirmed=false;for(let attempt=0;attempt<90;attempt++){const approval=await result.check();if(approval.status==='settled'){confirmed=true;break;}if(['denied','expired','wrong_human','stale_auth','failed'].includes(approval.status))throw new Error(`Approval failed: ${approval.status}`);await delay(2000);}if(!confirmed){console.log('Approval or confirmation is still pending.');process.exitCode=2;return;}result=await result.retry();}
 for(let attempt=0;result.status==='pending_confirmation'&&attempt<60;attempt++){
  console.log(JSON.stringify({status:result.status,paymentId:result.details.paymentId,txHash:result.details.txHash}));
  await delay(2000);result=await result.retry();
 }
 if(result.status==='approval_required'){console.log('Owner approval required. World approval integration is not yet available.');process.exitCode=2;return;}
 if(result.status==='pending_confirmation'){console.log('Still awaiting confirmation; no success claimed.');process.exitCode=2;return;}
 if(!result.response.ok){console.log(`Merchant returned HTTP ${result.response.status}; no success claimed.`);process.exitCode=1;return;}
 console.log(await result.response.text());
}
main().catch(()=>{console.error('Scenario failed or was not demonstrated. Check configuration, policy, deadline and API readiness. No success claimed; keys/signatures are never printed.');process.exitCode=1;});
