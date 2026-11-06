import {parseHumanAmount} from '../../../packages/shared/src/amount.mjs';
import {readFileSync} from 'node:fs';
import {encodeFunctionData,erc20Abi} from '../../../packages/shared/src/viem-runtime.mjs';
const address=v=>typeof v==='string'&&/^0x[\da-fA-F]{40}$/.test(v)&&!/^0x0{40}$/i.test(v);
export function merchantService({db,chain,registryAddress,mandateAddress,observerName,observerHealthy,abi}){
 const registryAbi=abi??JSON.parse(readFileSync(new URL('../../../contracts/out/MerchantRegistry.sol/MerchantRegistry.json',import.meta.url))).abi;
 return {
  async profile(id){
   if(!/^0x[\da-fA-F]{64}$/.test(id))throw new Error('invalid_request');
   const profile=await chain.merchantProfile(id);
   const current=observerName&&observerHealthy();
   const payments=current?db.prepare('SELECT payment_id,amount,refunded,status,tx_hash,payout FROM confirmed_payments WHERE observer=? AND lower(merchant_id)=? ORDER BY rowid DESC LIMIT 100').all(observerName,id.toLowerCase()):[];
   return {...profile,payments,paymentHistoryState:current?'current':'unavailable'};
  },
  async refund(body){
   if(!body||Object.keys(body).length!==3||!address(body.owner)||!/^0x[\da-fA-F]{64}$/.test(body.paymentId)||typeof body.amount!=='string')throw new Error('invalid_request');
   const context=await chain.refundContext(body.paymentId,body.owner);
   if(context.chainId!==1874||context.payout.toLowerCase()!==body.owner.toLowerCase())throw new Error('NotPayout');
   const amount=BigInt(parseHumanAmount(body.amount,context.decimals));
   if(amount<=0n||amount>BigInt(context.amount)-BigInt(context.refunded))throw new Error('OverRefund');
   const mandateAbi=JSON.parse(readFileSync(new URL('../../../contracts/out/Mandate.sol/Mandate.json',import.meta.url))).abi;
   const tx=(to,data)=>({chainId:1874,from:body.owner,to,data,value:'0x0'}),transactions=[];
   if(BigInt(context.allowance)>0n)transactions.push(tx(context.token,encodeFunctionData({abi:erc20Abi,functionName:'approve',args:[mandateAddress,0n]})));
   transactions.push(tx(context.token,encodeFunctionData({abi:erc20Abi,functionName:'approve',args:[mandateAddress,amount]})));
   transactions.push(tx(mandateAddress,encodeFunctionData({abi:mandateAbi,functionName:'refund',args:[body.paymentId,amount]})));
   return {chainId:1874,token:context.token,mandateAddress,owner:body.owner,transactions,amount:amount.toString(),warning:'Refund uses a limited allowance from the original payout wallet. It does not restore the mandate spending budget.'};
  },
  async prepare(body){
   if(!body||Object.keys(body).length!==4||!['owner','merchantId','payout','action'].every(k=>Object.hasOwn(body,k))||!address(body.owner)||!address(body.payout)||!/^0x[\da-fA-F]{64}$/.test(body.merchantId)||!['register','updatePayout'].includes(body.action))throw new Error('invalid_request');
   if(await chain.chainId()!==1874)throw new Error('wrong_chain');
   const profile=await chain.merchantProfile(body.merchantId);
   if(body.action==='register'&&profile.registered)throw new Error('merchant_already_registered');
   if(body.action==='updatePayout'&&profile.owner.toLowerCase()!==body.owner.toLowerCase())throw new Error('NotMerchantOwner');
   return {chainId:1874,from:body.owner,to:registryAddress,value:'0x0',data:encodeFunctionData({abi:registryAbi,functionName:body.action,args:[body.merchantId,body.payout]})};
  },
 };
}
