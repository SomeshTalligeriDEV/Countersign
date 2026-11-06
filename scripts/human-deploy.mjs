import {readFileSync,writeFileSync,renameSync,existsSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createPublicClient,defineChain,http,encodeFunctionData,erc20Abi} from '../packages/shared/src/viem-runtime.mjs';
import {mandateIdFor,hashIntent,paymentId,resourceHash} from '../packages/shared/src/crypto.mjs';
const TOKEN='0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7',explorer='https://explorer.testnet.whitechain.io';
export async function resumeDeploy({steps,state,save,print=console.log}){
 state.steps??={};
 for(const step of steps){
  const prior=state.steps[step.id];
  if(prior?.status==='done'){await step.validate?.(prior.result);print(`PASS ${step.id}: already recorded`);continue;}
  if(prior?.status==='running'||prior?.status==='unknown'){
   const recovered=await step.recover?.();if(!recovered)throw new Error(`STOP ${step.id}: submission outcome unknown; reconcile chain/receipt before retrying`);
   step.apply?.(recovered);state.steps[step.id]={status:'done',result:recovered};save(state);print(`PASS ${step.id}: recovered chain evidence`);continue;
  }
  state.steps[step.id]={status:'running'};save(state);
  try{const result=await step.run();step.apply?.(result);state.steps[step.id]={status:'done',result};save(state);
   print(`PASS ${step.id}${result?.txHash?': '+explorer+'/tx/'+result.txHash:''}${result?.address?': '+explorer+'/address/'+result.address:''}`);
  }catch(error){state.steps[step.id]={status:error.safeToRetry?'failed':'unknown'};save(state);throw new Error(`STOP ${step.id}: ${error.safeToRetry?'preflight/verification failed; fix and rerun':'unknown transaction outcome; reconcile before rerunning'}`);}
 }
 return state;
}
function command(args,safeToRetry=false){
 const result=spawnSync(args[0],args.slice(1),{encoding:'utf8',stdio:['inherit','pipe','pipe'],maxBuffer:2*1024*1024});
 if(result.status!==0){const error=new Error('command_failed');error.safeToRetry=safeToRetry;throw error;}return result.stdout.trim();
}
async function main(){
 // --dry-run: run every read-only preflight, print the exact forge/cast commands, never broadcast or write state.
 const dry=process.argv.includes('--dry-run'),file='docs/proof/deployed.json',env=process.env;
 const check=(ok,msg)=>{if(ok)return;if(!dry)throw new Error(msg);console.log('WARN (dry-run) '+msg);};
 if(dry)console.log('DRY-RUN: no transaction is signed or broadcast; docs/proof/deployed.json is not written.');
 const required=['DEPLOYER_ACCOUNT','AGENT_ACCOUNT','OWNER_ADDRESS','AGENT_ADDRESS','DEMO_PAYOUT','ATTESTOR_ADDRESS'];
 for(const key of required)if(!env[key])throw new Error(`Missing ${key}; keys must remain in Foundry keystores`);
 for(const key of ['OWNER_ADDRESS','AGENT_ADDRESS','DEMO_PAYOUT','ATTESTOR_ADDRESS'])if(!/^0x[\da-fA-F]{40}$/.test(env[key])||/^0x0{40}$/i.test(env[key]))throw new Error(`Invalid ${key}`);
 if(env.OWNER_ADDRESS.toLowerCase()===env.DEMO_PAYOUT.toLowerCase())throw new Error('Payout must differ from treasury');
 const rpcUrl=env.WHITECHAIN_RPC_URL??'https://rpc.testnet.whitechain.io';
 if(new URL(rpcUrl).protocol!=='https:')throw new Error('HTTPS testnet RPC required');
 const chain=defineChain({id:1874,name:'Whitechain Sepolia',nativeCurrency:{name:'WBT',symbol:'WBT',decimals:18},rpcUrls:{default:{http:[rpcUrl]}}});
 const rpc=createPublicClient({chain,transport:http(rpcUrl,{timeout:10000,retryCount:0})});
 const assertChain=async()=>{if(await rpc.getChainId()!==1874)throw new Error('Wrong chain; testnet1874 required');};await assertChain();
 const state=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{chainId:1874,contracts:{},transactions:{},urls:{}};
 if(state.chainId!==1874)throw new Error('Saved evidence has wrong chain');
 state.contracts??={};state.transactions??={};
 if(state.deployer&&state.deployer.toLowerCase()!==env.OWNER_ADDRESS.toLowerCase())throw new Error('Saved deployer differs; do not reuse this state');
 state.deployer=env.OWNER_ADDRESS;state.agent=env.AGENT_ADDRESS;
 const save=dry?()=>{}:value=>{writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n',{mode:0o600});renameSync(file+'.tmp',file);};
 if(!state.setup){const salt='0x'+randomBytes(32).toString('hex');state.setup={salt,mandateId:mandateIdFor(env.OWNER_ADDRESS,salt),merchantId:resourceHash('GET','/demo/'+salt),orderId:resourceHash('GET','/report/'+salt),payout:env.DEMO_PAYOUT,attestor:env.ATTESTOR_ADDRESS};save(state);}
 if(state.setup.payout.toLowerCase()!==env.DEMO_PAYOUT.toLowerCase()||state.setup.attestor.toLowerCase()!==env.ATTESTOR_ADDRESS.toLowerCase())throw new Error('Saved setup differs from current payout/attestor');
 const addressFor=account=>command(['cast','wallet','address','--account',account]);
 if(dry){for(const [alias,addr] of [[env.DEPLOYER_ACCOUNT,env.OWNER_ADDRESS],[env.AGENT_ACCOUNT,env.AGENT_ADDRESS]]){let got=null;try{got=addressFor(alias);}catch{}console.log(got===null?`WARN (dry-run) keystore alias '${alias}' not found locally (cast wallet import ${alias} --interactive)`:`PASS keystore '${alias}' ${got.toLowerCase()===addr.toLowerCase()?'matches':'MISMATCHES'} ${addr}`);}}
 else if(addressFor(env.DEPLOYER_ACCOUNT).toLowerCase()!==env.OWNER_ADDRESS.toLowerCase()||addressFor(env.AGENT_ACCOUNT).toLowerCase()!==env.AGENT_ADDRESS.toLowerCase())throw new Error('Keystore account mismatch');
 if(!await rpc.getCode({address:TOKEN})||(await rpc.getCode({address:TOKEN}))==='0x')throw new Error('Official token absent');
 const decimals=await rpc.readContract({address:TOKEN,abi:erc20Abi,functionName:'decimals'});
 if(decimals<1||decimals>36)throw new Error('Unsupported official token decimals');
 const amount=5n*10n**BigInt(decimals-1);
 const wbt=await rpc.getBalance({address:env.OWNER_ADDRESS});check(wbt>0n,'Fund owner with test WBT');
 // A completed first payment need not retain the original token balance.
 const usdt=await rpc.readContract({address:TOKEN,abi:erc20Abi,functionName:'balanceOf',args:[env.OWNER_ADDRESS]});
 // --contracts-only: deploy + verify with WBT alone; payment steps resume later from the same saved state.
 const contractsOnly=process.argv.includes('--contracts-only');
 if(!state.transactions.firstPayment&&!contractsOnly)check(usdt>=amount,'Need at least0.50 official test USDT');
 if(dry)console.log(`PASS chain 1874, token ${TOKEN} decimals=${decimals}, owner WBT wei=${wbt}, owner USDT base=${usdt}, amount=${amount}`);
 command(['forge','build','--root','contracts'],true);
 const abi=name=>JSON.parse(readFileSync(`contracts/out/${name}.sol/${name}.json`,'utf8')).abi;
 const registryAbi=abi('MerchantRegistry'),mandateAbi=abi('Mandate');
 const registry=()=>state.contracts.MerchantRegistry.address,mandate=()=>state.contracts.Mandate.address;
 const read=(address,abi,functionName,args=[])=>rpc.readContract({address,abi,functionName,args});
 const code=async address=>{const value=address&&await rpc.getCode({address});if(!value||value==='0x')throw new Error('Saved contract code absent');};
 const send=async(to,data)=>{await assertChain();const output=command(['cast','send',to,'--data',data,'--rpc-url',rpcUrl,'--chain','1874','--account',env.DEPLOYER_ACCOUNT,'--confirmations','4','--json']);const result=JSON.parse(output),txHash=result.transactionHash;if(!/^0x[\da-fA-F]{64}$/.test(txHash??''))throw new Error('unknown_receipt');const receipt=await rpc.getTransactionReceipt({hash:txHash});if(receipt.status!=='success')throw new Error('reverted');return {txHash,block:receipt.blockNumber.toString()};};
 const encode=(abi,functionName,args)=>encodeFunctionData({abi,functionName,args});
 const deploy=name=>({id:'deploy'+name,validate:()=>code(state.contracts[name]?.address),recover:async()=>{const saved=state.contracts[name];if(!saved?.address||!saved?.deploymentTx)return null;await code(saved.address);const r=await rpc.getTransactionReceipt({hash:saved.deploymentTx});return r.status==='success'?{address:saved.address,txHash:saved.deploymentTx,block:r.blockNumber.toString()}:null;},run:async()=>{await assertChain();const saved=state.contracts[name];if(saved?.address){await code(saved.address);if(!saved.deploymentTx)throw new Error('Saved contract requires deployment receipt');const r=await rpc.getTransactionReceipt({hash:saved.deploymentTx});if(r.status!=='success')throw new Error('Saved deployment failed');return {address:saved.address,txHash:saved.deploymentTx,block:r.blockNumber.toString()};}const args=['forge','create','--root','contracts','--rpc-url',rpcUrl,'--chain','1874','--account',env.DEPLOYER_ACCOUNT,'--broadcast','--json',`src/${name}.sol:${name}`];if(name==='Mandate')args.push('--constructor-args',TOKEN,registry());const value=JSON.parse(command(args));await code(value.deployedTo);const receipt=await rpc.waitForTransactionReceipt({hash:value.transactionHash,confirmations:4});if(receipt.status!=='success')throw new Error('reverted');return {address:value.deployedTo,txHash:value.transactionHash,block:receipt.blockNumber.toString()};},apply:r=>{state.contracts[name]={address:r.address,deploymentTx:r.txHash,verified:false,block:r.block};}});
 const verify=name=>({id:'verify'+name,run:async()=>{await assertChain();const args=['forge','verify-contract',state.contracts[name].address,`src/${name}.sol:${name}`,'--root','contracts','--chain','1874','--verifier','blockscout','--verifier-url',explorer+'/api/','--watch'];if(name==='Mandate')args.push('--constructor-args',command(['cast','abi-encode','constructor(address,address)',TOKEN,registry()],true));command(args,true);return {verified:true};},apply:()=>{state.contracts[name].verified=true;}});
 if(dry){
  const R='$REGISTRY',M='$MANDATE',o=env.OWNER_ADDRESS,d=env.DEPLOYER_ACCOUNT,net=`--rpc-url ${rpcUrl} --chain 1874`;
  const cs=(to,data)=>`cast send ${to} --data ${data} ${net} --account ${d} --confirmations 4 --json`;
  const z='0x'+'0'.repeat(64),exp=BigInt(Math.floor(Date.now()/1000)+86400);
  const plan=[
   ['deployMerchantRegistry',`forge create --root contracts ${net} --account ${d} --broadcast --json src/MerchantRegistry.sol:MerchantRegistry   # -> REGISTRY`],
   ['deployMandate',`forge create --root contracts ${net} --account ${d} --broadcast --json src/Mandate.sol:Mandate --constructor-args ${TOKEN} ${R}   # -> MANDATE`],
   ['verifyMerchantRegistry',`forge verify-contract ${R} src/MerchantRegistry.sol:MerchantRegistry --root contracts --chain 1874 --verifier blockscout --verifier-url ${explorer}/api/ --watch`],
   ['verifyMandate',`forge verify-contract ${M} src/Mandate.sol:Mandate --root contracts --chain 1874 --verifier blockscout --verifier-url ${explorer}/api/ --watch --constructor-args $(cast abi-encode 'constructor(address,address)' ${TOKEN} ${R})`],
   ['registerMerchant',cs(R,encode(registryAbi,'register',[state.setup.merchantId,env.DEMO_PAYOUT]))],
   ['createMandate',cs(M,encode(mandateAbi,'createMandate',[{agent:env.AGENT_ADDRESS,attestor:env.ATTESTOR_ADDRESS,perTxLimit:amount*4n,periodLimit:amount*10n,humanThreshold:amount*2n,periodLength:86400n,expiry:exp,ensNamehash:z},state.setup.salt]))+'   # expiry recomputed at real run'],
   ['setLimits',cs(M,encode(mandateAbi,'updateLimits',[state.setup.mandateId,amount*4n,amount*10n,amount*2n]))],
   ['allowMerchant',cs(M,encode(mandateAbi,'setMerchant',[state.setup.mandateId,state.setup.merchantId,true]))],
   ['resetAllowance',`cast call ${TOKEN} 'allowance(address,address)(uint256)' ${o} ${M} ${net}   # if nonzero: `+`cast send ${TOKEN} 'approve(address,uint256)' ${M} 0 ${net} --account ${d} --confirmations 4 --json`],
   ['limitedAllowance',`cast send ${TOKEN} 'approve(address,uint256)' ${M} ${amount} ${net} --account ${d} --confirmations 4 --json`],
   ['firstPayment',`cast wallet sign --no-hash --account ${env.AGENT_ACCOUNT} <hashIntent(MANDATE,intent nonce=1 amount=${amount})>  then  cast send ${M} --data <pay(intent,sig,0x,{0,0,0},0x)> ${net} --account ${d} --confirmations 4 --json`]];
  for(const [id,cmd] of plan)console.log(`${state.steps?.[id]?.status==='done'?'SKIP (recorded)':'PLAN'} ${id}\n  ${cmd}`);
  console.log(`setup: mandateId=${state.setup.mandateId} merchantId=${state.setup.merchantId} (fresh salt each dry-run; real run persists it)`);
  console.log('DRY-RUN complete: nothing broadcast.');return;
 }
 const steps=[deploy('MerchantRegistry'),deploy('Mandate'),verify('MerchantRegistry'),verify('Mandate')];
 if(contractsOnly){await resumeDeploy({steps,state,save});console.log('Contracts deployed+verified. Rerun without --contracts-only once the deployer holds >=0.50 official test USDT.');return;}
 steps.push({id:'registerMerchant',run:async()=>send(registry(),encode(registryAbi,'register',[state.setup.merchantId,env.DEMO_PAYOUT]))});
 steps.push({id:'createMandate',run:async()=>send(mandate(),encode(mandateAbi,'createMandate',[{agent:env.AGENT_ADDRESS,attestor:env.ATTESTOR_ADDRESS,perTxLimit:amount*4n,periodLimit:amount*10n,humanThreshold:amount*2n,periodLength:86400n,expiry:BigInt(Math.floor(Date.now()/1000)+86400),ensNamehash:'0x'+'0'.repeat(64)},state.setup.salt]))});
 steps.push({id:'setLimits',run:async()=>send(mandate(),encode(mandateAbi,'updateLimits',[state.setup.mandateId,amount*4n,amount*10n,amount*2n]))});
 steps.push({id:'allowMerchant',run:async()=>send(mandate(),encode(mandateAbi,'setMerchant',[state.setup.mandateId,state.setup.merchantId,true]))});
 steps.push({id:'resetAllowance',run:async()=>{const value=await read(TOKEN,erc20Abi,'allowance',[env.OWNER_ADDRESS,mandate()]);return value===0n?{skipped:'already zero'}:send(TOKEN,encode(erc20Abi,'approve',[mandate(),0n]));}});
 steps.push({id:'limitedAllowance',run:async()=>send(TOKEN,encode(erc20Abi,'approve',[mandate(),amount]))});
 steps.push({id:'firstPayment',run:async()=>{
  await assertChain();if((await read(mandate(),mandateAbi,'usdt')).toLowerCase()!==TOKEN.toLowerCase())throw new Error('Wrong token');
  if((await read(mandate(),mandateAbi,'registry')).toLowerCase()!==registry().toLowerCase())throw new Error('Wrong registry');
  const p=await read(mandate(),mandateAbi,'policies',[state.setup.mandateId]);const intent={mandateId:state.setup.mandateId,merchantId:state.setup.merchantId,payout:env.DEMO_PAYOUT,registryVersion:1n,amount,orderId:state.setup.orderId,resourceHash:resourceHash('GET','/api/report'),nonce:1n,epoch:p[9],deadline:BigInt(Math.floor(Date.now()/1000)+180)};
  const signature=command(['cast','wallet','sign','--no-hash','--account',env.AGENT_ACCOUNT,hashIntent(mandate(),intent)]);if(!/^0x[\da-fA-F]{130}$/.test(signature))throw new Error('Invalid signer output');
  const result=await send(mandate(),encode(mandateAbi,'pay',[intent,signature,'0x',{approvalDigest:'0x'+'0'.repeat(64),ownerSubHash:'0x'+'0'.repeat(64),authTime:0n},'0x']));
  const payment=await read(mandate(),mandateAbi,'payments',[paymentId(intent)]);if(payment[3]!==amount)throw new Error('Payment state mismatch');return {...result,paymentId:paymentId(intent)};
 },apply:r=>{state.transactions.firstPayment=r.txHash;state.setup.paymentId=r.paymentId;}});
 await resumeDeploy({steps,state,save});console.log('Recorded all steps. Run pnpm evidence and inspect actual receipts/source verification.');
}
if(process.argv[1]===new URL(import.meta.url).pathname&&process.argv.includes('--dry-run'))main().catch(error=>{console.error(error.message);process.exitCode=1;});
else if(process.argv[1]===new URL(import.meta.url).pathname){let locked=false;const lock='docs/proof/deployed.lock';try{const fd=openSync(lock,'wx',0o600);writeFileSync(fd,String(process.pid));closeSync(fd);locked=true;}catch{console.error('Deployment lock exists. Inspect its PID and saved progress before removing a stale lock.');process.exitCode=1;}if(locked)main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>unlinkSync(lock));}
