import {recoverWalletMessage,hashApproval,recoverOwner} from '../../../packages/shared/src/crypto.mjs';
import { readFileSync } from 'node:fs';
import { hashMessage,keccak256,encodeFunctionData,decodeFunctionData,createPublicClient,createWalletClient,defineChain,http,zeroHash,zeroAddress,erc20Abi } from '../../../packages/shared/src/viem-runtime.mjs';
const token='0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7';
export function createChainAdapter({rpcUrl,mandateAddress,registryAddress,account}) {
 for(const address of [mandateAddress,registryAddress])if(!/^0x[\da-fA-F]{40}$/.test(address)||address.toLowerCase()===zeroAddress)throw new Error('invalid_contract_address');
 const url=new URL(rpcUrl);
 if(url.protocol!=='https:')throw new Error('https_rpc_required');
 const abi=JSON.parse(readFileSync(new URL('../../../contracts/out/Mandate.sol/Mandate.json',import.meta.url))).abi;
 const registryAbi=JSON.parse(readFileSync(new URL('../../../contracts/out/MerchantRegistry.sol/MerchantRegistry.json',import.meta.url))).abi;
 const chain=defineChain({id:1874,name:'Whitechain Sepolia',nativeCurrency:{name:'WBT',symbol:'WBT',decimals:18},rpcUrls:{default:{http:[rpcUrl]}}});
 const client=createPublicClient({chain,transport:http(rpcUrl,{timeout:10000,retryCount:1})});
 const wallet=account?createWalletClient({account,chain,transport:http(rpcUrl,{timeout:10000,retryCount:0})}):null;
 async function assertChain(){if(await client.getChainId()!==1874)throw new Error('wrong_chain');}
 return {
  chainId:()=>client.getChainId(),
  blockNumber:()=>client.getBlockNumber({cacheTime:0}),
  block:number=>client.getBlock({blockNumber:number}),
  async paymentLogs(block){
   await assertChain();
   const events=abi.filter(item=>item.type==='event'&&['PaymentExecuted','PaymentRefunded','Revoked'].includes(item.name));
   return client.getLogs({address:mandateAddress,events,fromBlock:block,toBlock:block,strict:true});
  },
  async paymentTransaction(hash){
   await assertChain();
   const tx=await client.getTransaction({hash});
   if(tx.to?.toLowerCase()!==mandateAddress.toLowerCase())throw new Error('wrong_transaction_target');
   const decoded=decodeFunctionData({abi,data:tx.input});
   if(decoded.functionName!=='pay')throw new Error('wrong_transaction_method');
   return {hash:tx.hash,blockHash:tx.blockHash,blockNumber:tx.blockNumber,intent:decoded.args[0]};
  },
  async setupContext(owner){
   await assertChain();
   if((await client.readContract({address:mandateAddress,abi,functionName:'usdt'})).toLowerCase()!==token.toLowerCase())throw new Error('wrong_token');
   const [decimals,allowance]=await Promise.all([client.readContract({address:token,abi:erc20Abi,functionName:'decimals'}),client.readContract({address:token,abi:erc20Abi,functionName:'allowance',args:[owner,mandateAddress]})]);
   return {chainId:1874,token,decimals,allowance};
  },
  async verifyWalletMessage(owner,message,signature){
   await assertChain();
   const code=await client.getCode({address:owner});
   if(!code||code==='0x'){try{return (await recoverWalletMessage(message,signature)).toLowerCase()===owner.toLowerCase();}catch{return false;}}
   try{return await client.readContract({address:owner,abi:[{type:'function',name:'isValidSignature',stateMutability:'view',inputs:[{name:'hash',type:'bytes32'},{name:'signature',type:'bytes'}],outputs:[{name:'magicValue',type:'bytes4'}]}],functionName:'isValidSignature',args:[hashMessage(message),signature]})==='0x1626ba7e';}catch{return false;}
  },
  async verifyOwner(owner,intent,signature){
   await assertChain();
   const code=await client.getCode({address:owner});
   if(!code||code==='0x'){
    try{return (await recoverOwner(mandateAddress,intent,signature)).toLowerCase()===owner.toLowerCase();}catch{return false;}
   }
   try{
    const result=await client.readContract({address:owner,abi:[{type:'function',name:'isValidSignature',stateMutability:'view',inputs:[{name:'hash',type:'bytes32'},{name:'signature',type:'bytes'}],outputs:[{name:'magicValue',type:'bytes4'}]}],functionName:'isValidSignature',args:[hashApproval(mandateAddress,intent),signature]});
    return result==='0x1626ba7e';
   }catch{return false;}
  },
  async policy(id){
   await assertChain();
   const values=await client.readContract({address:mandateAddress,abi,functionName:'policies',args:[id]});
   const names=['owner','agent','attestor','perTxLimit','periodLimit','humanThreshold','start','periodLength','expiry','epoch','ensNamehash','paused'];
   const p=Object.fromEntries(names.map((name,index)=>[name,values[index]]));
   if(p.owner.toLowerCase()===zeroAddress)throw new Error('UnknownMandate');
   return p;
  },
  async mandateSnapshot(id){
   await assertChain();
   const blockNumber=await client.getBlockNumber({cacheTime:0});
   const [values,remaining,decimals]=await Promise.all([
    client.readContract({address:mandateAddress,abi,functionName:'policies',args:[id],blockNumber}),
    client.readContract({address:mandateAddress,abi,functionName:'remaining',args:[id],blockNumber}),
    client.readContract({address:token,abi:erc20Abi,functionName:'decimals',blockNumber}),
   ]);
   if(values[0].toLowerCase()===zeroAddress)throw new Error('UnknownMandate');
   return {actions:{pause:encodeFunctionData({abi,functionName:'setPaused',args:[id,true]}),unpause:encodeFunctionData({abi,functionName:'setPaused',args:[id,false]}),revoke:encodeFunctionData({abi,functionName:'revoke',args:[id]})},chainId:1874,mandateId:id,mandateAddress,owner:values[0],agent:values[1],perTxLimit:values[3],periodLimit:values[4],humanThreshold:values[5],expiry:values[8],epoch:values[9],paused:values[11],remaining,decimals,block:blockNumber.toString(),checkedAt:new Date().toISOString()};
  },
  async remaining(id){await assertChain();return client.readContract({address:mandateAddress,abi,functionName:'remaining',args:[id]});},
  async refundContext(id,owner){
   await assertChain();
   const [payment,context]=await Promise.all([client.readContract({address:mandateAddress,abi,functionName:'payments',args:[id]}),this.setupContext(owner)]);
   return {...context,payout:payment[2],amount:payment[3],refunded:payment[4]};
  },
  async merchantProfile(id){
   await assertChain();
   const blockNumber=await client.getBlockNumber({cacheTime:0});
   const [merchant,decimals]=await Promise.all([client.readContract({address:registryAddress,abi:registryAbi,functionName:'merchants',args:[id],blockNumber}),client.readContract({address:token,abi:erc20Abi,functionName:'decimals',blockNumber})]);
   return {chainId:1874,merchantId:id,registryAddress,owner:merchant[0],payout:merchant[1],version:merchant[2].toString(),active:merchant[3],registered:merchant[0].toLowerCase()!==zeroAddress,decimals,block:blockNumber.toString()};
  },
  async terms(id){
   await assertChain();
   const [payout,version,active]=await client.readContract({address:registryAddress,abi:registryAbi,functionName:'get',args:[id]});
   if(!active)throw new Error('merchant_inactive');
   const decimals=await client.readContract({address:token,abi:erc20Abi,functionName:'decimals'});
   return {chainId:1874,mandateContract:mandateAddress,merchantId:id,payout,registryVersion:version.toString(),token,decimals};
  },
  async simulatePay(intent,signature,approval){
   await assertChain(); if(!account)throw new Error('relayer_not_configured');
   if((await client.readContract({address:mandateAddress,abi,functionName:'usdt'})).toLowerCase()!==token.toLowerCase())throw new Error('wrong_token');
   if((await client.readContract({address:mandateAddress,abi,functionName:'registry'})).toLowerCase()!==registryAddress.toLowerCase())throw new Error('wrong_registry');
   const fees=await client.estimateFeesPerGas();
   const call={address:mandateAddress,abi,functionName:'pay',account,args:[intent,signature,approval?.ownerSig??'0x',approval?{...approval.attestation,authTime:BigInt(approval.attestation.authTime)}:{approvalDigest:zeroHash,ownerSubHash:zeroHash,authTime:0n},approval?.signature??'0x']};
   const {request}=await client.simulateContract(call);
   const estimated=await client.estimateContractGas(call);
   const gas=(estimated*120n+99n)/100n;
   if(!fees.maxFeePerGas||fees.maxPriorityFeePerGas===undefined)throw new Error('fee_estimate_unavailable');
   return {request:{...request,...fees,gas},gas,maxFeePerGas:fees.maxFeePerGas};
  },
  async signPay(prepared){
   await assertChain();if(!wallet)throw new Error('relayer_not_configured');
   const r=prepared.request;
   const request=await wallet.prepareTransactionRequest({account,chain,to:mandateAddress,data:encodeFunctionData({abi,functionName:'pay',args:r.args}),value:0n,gas:r.gas,maxFeePerGas:r.maxFeePerGas,maxPriorityFeePerGas:r.maxPriorityFeePerGas,nonce:await client.getTransactionCount({address:account.address,blockTag:'pending'})});
   const raw=await wallet.signTransaction(request);
   return {raw,hash:keccak256(raw),nonce:request.nonce};
  },
  async broadcastRaw(raw){await assertChain();return client.sendRawTransaction({serializedTransaction:raw});},
  async relayReceipt(hash){
   await assertChain();
   try{return await client.getTransactionReceipt({hash});}catch(error){if(error.name==='TransactionReceiptNotFoundError')return null;throw error;}
  },
  async relayNonce(){await assertChain();if(!account)throw new Error('relayer_not_configured');return BigInt(await client.getTransactionCount({address:account.address,blockTag:'latest'}));},
  async broadcastPay(prepared){await assertChain();if(!wallet)throw new Error('relayer_not_configured');return wallet.writeContract(prepared.request);},
 };
}
