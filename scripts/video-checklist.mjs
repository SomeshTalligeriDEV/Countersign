import {readFileSync,existsSync} from 'node:fs';
import {evidence} from './evidence.mjs';
export function videoChecklist(data={}){
 evidence(data);const tx=name=>data.transactions?.[name]?`https://explorer.testnet.whitechain.io/tx/${data.transactions[name]}`:`TODO-HUMAN ${name} proof`;
 const web=data.urls?.web??'http://127.0.0.1:3000 (local preview, not hosted proof)';
 return [
 ['0:00-0:15','Hook: bounded authorization problem','docs/ONE-PAGE-BRIEF.md','Read the prototype/limitations statement; omit unverified historical-incident figures','TODO-HUMAN final recording'],
 ['0:15-0:35','Architecture', 'docs/ONE-PAGE-BRIEF.md Mermaid diagram','Show agent → merchant → API → contract and owner approval boundary','README security/source links'],
 ['0:35-0:55','Owner limits/allowance',`${web}/owner`,'Connect owner; review limits and explicit limited allowance; confirm actual wallet steps',tx('createMandate')],
 ['0:55-1:20','Automatic0.50 payment',`${web}/demo and terminal`,'pnpm --dir apps/demo-agent start buy-report; show actual agent WBT/USDT balances, not assumed zero',tx('firstPayment')],
 ['1:20-2:05','Exact World approval and denied path',`${web}/approve/<real-id>`,'pnpm --dir apps/demo-agent start order-40; fresh World sign-in; wallet sign; second request denied','TODO-HUMAN real World success/denied proof; '+tx('humanApprovedPayment')],
 ['2:05-2:35','Tamper and budget',`${web}/demo and explorer`,'pnpm --dir apps/demo-agent start tamper-amount; pnpm --dir apps/demo-agent start over-budget','API rejection is not an explorer revert: '+tx('tamperAmount')+'; '+tx('overBudget')],
 ['2:35-2:55','Revoke/replay',`${web}/owner and /demo`,'save-replay; owner revokes; replay-after-revoke within deadline',tx('revoke')+'; '+tx('replayAfterRevoke')],
 ['2:55-3:15','Merchant/refund/integration',`${web}/merchant; apps/demo-merchant/src/server.mjs`,'Show confirmed incoming payment; original payout wallet refund; do not show nonexistent webhook delivery',tx('refund')+'; TODO-HUMAN actual integration line count/video'],
 ['3:15-3:30','Business, limits and team','README limitations / one-page brief','Billing is proposed. State testnet, fixture/live distinction and unresolved provenance','TODO-HUMAN team names and final video URL'],
 ].map(([time,scene,screen,command,proof])=>`${time} ${scene}\n SCREEN: ${screen}\n ACTION: ${command}\n EVIDENCE: ${proof}`).join('\n\n')+'\n\nExtra: arbitrary-relayer-call; show GasGuard reason. Do not claim an onchain tx for that rejection.\n';
}
if(process.argv[1]===new URL(import.meta.url).pathname)console.log(videoChecklist(existsSync('docs/proof/deployed.json')?JSON.parse(readFileSync('docs/proof/deployed.json','utf8')):{}));
