import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createPublicClient,defineChain,http,erc20Abi} from '../packages/shared/src/viem-runtime.mjs';
const token='0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7';
export async function doctor({env=process.env,saved={},rpc,fetchImpl=fetch,git=()=>spawnSync('git',['status','--porcelain'],{encoding:'utf8'}),print=console.log}){
 const results=[];
 const check=async(name,fn,fix)=>{try{const detail=await fn();if(detail===false)throw new Error('failed');results.push({name,ok:true});print(`PASS ${name}${typeof detail==='string'?': '+detail:''}`);}catch{results.push({name,ok:false});print(`FAIL ${name}. FIX: ${fix}`);}};
 const owner=env.OWNER_ADDRESS??saved.deployer,mandate=env.MANDATE_ADDRESS??saved.contracts?.Mandate?.address,registry=env.REGISTRY_ADDRESS??saved.contracts?.MerchantRegistry?.address;
 let chainOK=false,decimals;
 await check('RPC / chain1874',async()=>{chainOK=await rpc.getChainId()===1874;return chainOK;},'Configure a reachable WHITECHAIN_RPC_URL for Whitechain Sepolia; never use mainnet.');
 const requireChain=()=>{if(!chainOK)throw new Error('chain_unverified');};
 await check('Official USDT code and runtime decimals',async()=>{requireChain();const code=await rpc.getCode({address:token});if(!code||code==='0x')return false;decimals=await rpc.readContract({address:token,abi:erc20Abi,functionName:'decimals'});return Number.isInteger(decimals)&&decimals>=0&&decimals<=255?`decimals=${decimals}`:false;},'Check official USDT address and RPC. Do not deploy a replacement token.');
 await check('Deployer WBT',async()=>{requireChain();if(!/^0x[\da-fA-F]{40}$/.test(owner??''))return false;const balance=await rpc.getBalance({address:owner});return balance>0n?`${balance} wei`:false;},'Set public OWNER_ADDRESS; fund it from the Whitechain test WBT faucet.');
 await check('Deployer USDT',async()=>{requireChain();if(decimals===undefined||decimals===0||!owner)return false;const balance=await rpc.readContract({address:token,abi:erc20Abi,functionName:'balanceOf',args:[owner]});return balance>=5n*10n**BigInt(decimals-1)?`${balance} base units`:false;},'Ask Whitechain booth for at least0.50 official test USDT to OWNER_ADDRESS.');
 for(const [name,address]of[['Mandate',mandate],['Registry',registry]])await check(`${name} code`,async()=>{requireChain();if(!/^0x[\da-fA-F]{40}$/.test(address??''))return false;const code=await rpc.getCode({address});return !!code&&code!=='0x';},`Deploy/record ${name} in docs/proof/deployed.json or the matching env address.`);
 await check('Limited allowance',async()=>{requireChain();if(!owner||!mandate)return false;const allowance=await rpc.readContract({address:token,abi:erc20Abi,functionName:'allowance',args:[owner,mandate]});return allowance>0n&&allowance<(1n<<128n)?`${allowance} base units`:false;},'Set an explicit limited USDT allowance; zero after the first payment may be expected and needs replenishment for another demo.');
 await check('Remaining mandate budget',async()=>{requireChain();const id=env.MANDATE_ID??saved.setup?.mandateId;if(!mandate||!id)return false;const value=await rpc.readContract({address:mandate,abi:[{type:'function',name:'remaining',stateMutability:'view',inputs:[{type:'bytes32'}],outputs:[{type:'uint256'}]}],functionName:'remaining',args:[id]});return value>0n?`${value} base units`:false;},'Record MANDATE_ID; inspect remaining(), period and policy. Do not reset historical spent.');
 await check('World discovery and JWKS',async()=>{const issuer=env.WORLD_ISSUER;if(!['https://sandbox.auth.world.org','https://auth.world.org'].includes(issuer))return false;const metadata=await fetchImpl(`${issuer}/.well-known/openid-configuration`,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!metadata.ok)return false;const data=await metadata.json();if(data.issuer!==issuer||new URL(data.jwks_uri).origin!==issuer)return false;const keys=await fetchImpl(data.jwks_uri,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!keys.ok)return false;const jwks=await keys.json();return Array.isArray(jwks.keys)&&jwks.keys.length>0;},'Configure WORLD_ISSUER, confirm provider endpoints and network. This check does not establish sign-in.');
 await check('API health',async()=>{const response=await fetchImpl(new URL('/health/live',env.COUNTERSIGN_API??'http://127.0.0.1:3001'),{signal:AbortSignal.timeout(5000)});return response.ok;},'Start the API with its service-local env; inspect startup errors.');
 await check('Attestor health',async()=>{const response=await fetchImpl('http://127.0.0.1:3002/health/live',{signal:AbortSignal.timeout(5000)});return response.ok;},'Start the separate attestor on loopback with its own key/HMAC config and shared database.');
 await check('Relayer flag state',async()=>env.RELAYER_ENABLED==='1'&&env.RELAYER_PAUSED!=='1','Set RELAYER_ENABLED=1 only after dedicated signer, budgets, deployments and observer config. RELAYER_PAUSED must not be1.');
 await check('Git clean',async()=>{const result=git();return result.status===0&&!result.stdout.trim();},'Review changes and commit genuine working increments in the normal laptop terminal.');
 return results;
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const chain=defineChain({id:1874,name:'Whitechain Sepolia',nativeCurrency:{name:'WBT',symbol:'WBT',decimals:18},rpcUrls:{default:{http:[process.env.WHITECHAIN_RPC_URL??'https://rpc.testnet.whitechain.io']}}});
 const rpc=createPublicClient({chain,transport:http(chain.rpcUrls.default.http[0],{timeout:8000,retryCount:0})});
 const saved=existsSync('docs/proof/deployed.json')?JSON.parse(readFileSync('docs/proof/deployed.json','utf8')):{};
 const results=await doctor({rpc,saved});process.exitCode=results.every(r=>r.ok)?0:1;
}
