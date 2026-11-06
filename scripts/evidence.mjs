import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const explorer='https://explorer.testnet.whitechain.io';
const address=v=>typeof v==='string'&&/^0x[\da-fA-F]{40}$/.test(v)&&!/^0x0{40}$/i.test(v);
const tx=v=>typeof v==='string'&&/^0x[\da-fA-F]{64}$/.test(v)&&!/^0x0{64}$/i.test(v);
export function evidence(data={}){
 if(data.chainId!==undefined&&data.chainId!==1874)throw new Error('testnet_chain_1874_required');
 for(const key of Object.keys(data))if(!['chainId','contracts','transactions','urls','steps','deployer','agent','setup'].includes(key))throw new Error('unsupported_evidence_field');
 const lines=['# Countersign evidence','', 'Human-recorded inputs only. Links have not been independently checked against RPC by this generator. Empty fields are TODO-HUMAN.',''];
 for(const name of ['MerchantRegistry','Mandate']){
  const contract=data.contracts?.[name]??{};
  if(contract.address&&!address(contract.address))throw new Error('invalid_contract_address');
  if(contract.deploymentTx&&!tx(contract.deploymentTx))throw new Error('invalid_deployment_tx');
  lines.push(`- ${name}: ${address(contract.address)?`[Explorer](${explorer}/address/${contract.address})`:'TODO-HUMAN address'}`);
  lines.push(`- ${name} deployment: ${tx(contract.deploymentTx)?`[Transaction](${explorer}/tx/${contract.deploymentTx})`:'TODO-HUMAN deployment transaction'}`);
  lines.push(`- ${name} source verification: ${contract.verified===true?'human reports verified; TODO-HUMAN independently review source':'TODO-HUMAN verify source'}`);
 }
 for(const name of ['createMandate','limitedAllowance','refund','firstPayment','tamperAmount','tamperPayout','registryChanged','overBudget','humanApprovedPayment','revoke','replayAfterRevoke','arbitraryRelayerCall']){
  const value=data.transactions?.[name];if(value&&!tx(value))throw new Error('invalid_demo_tx');
  lines.push(`- ${name}: ${tx(value)?`[Transaction](${explorer}/tx/${value})`:'TODO-HUMAN transaction or explicit API-only rejection proof (no tx)'}`);
 }
 for(const name of ['web','api','repo']){
  const value=data.urls?.[name];if(value){const parsed=new URL(value);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error('invalid_public_url');}
  lines.push(`- ${name}: ${value?`[Human-supplied URL](${value})`:'TODO-HUMAN public URL'}`);
 }
 lines.push('','TODO-HUMAN: real World success and denied evidence, two ordered demo runs, browser/video proof, source eligibility decision, final CI URL.','');
 return lines.join('\n');
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const input='docs/proof/deployed.json';const text=evidence(existsSync(input)?JSON.parse(readFileSync(input,'utf8')):{});
 writeFileSync('docs/proof/EVIDENCE.md',text);
 const file='README.md',start='<!-- COUNTERSIGN-EVIDENCE:START -->',end='<!-- COUNTERSIGN-EVIDENCE:END -->';
 let readme=readFileSync(file,'utf8');const section=`${start}\n${text.replace(/^# Countersign evidence/,'## Recorded deployment evidence')}\n${end}`;
 if(readme.includes(start)&&readme.includes(end))readme=readme.slice(0,readme.indexOf(start))+section+readme.slice(readme.indexOf(end)+end.length);else readme+='\n'+section+'\n';
 writeFileSync(file,readme);console.log(`Evidence generated from ${existsSync(input)?input:'missing input; all deployment fields TODO-HUMAN'}. No RPC verification claimed.`);
}
