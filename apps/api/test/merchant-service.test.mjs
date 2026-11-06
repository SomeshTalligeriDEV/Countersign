import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../src/store.mjs';
import {merchantService} from '../src/merchant-service.mjs';
import {decodeFunctionData} from '../../../packages/shared/src/viem-runtime.mjs';
const owner='0x'+'1'.repeat(40),registry='0x'+'2'.repeat(40),id='0x'+'a'.repeat(64);
const abi=['register','updatePayout'].map(name=>({type:'function',name,stateMutability:'nonpayable',inputs:[{name:'merchantId',type:'bytes32'},{name:'payout',type:'address'}],outputs:[]}));
test('merchant registration/change preparation enforces registry ownership and history freshness',async()=>{
 const db=openStore(':memory:');try{
 let registered=false;
 const service=merchantService({db,registryAddress:registry,abi,observerHealthy:()=>false,chain:{chainId:async()=>1874,merchantProfile:async()=>({owner,registered})}});
 const body={owner,merchantId:id,payout:registry,action:'register'};const tx=await service.prepare(body);assert.equal(decodeFunctionData({abi,data:tx.data}).functionName,'register');
 registered=true;await assert.rejects(service.prepare(body),/already_registered/);
 await assert.rejects(service.prepare({...body,owner:registry,action:'updatePayout'}),/NotMerchantOwner/);
 assert.equal((await service.profile(id)).paymentHistoryState,'unavailable');
 }finally{db.close();}
});
test('refund preparation rejects another payout wallet and over-refunds before calldata generation',async()=>{
 const db=openStore(':memory:');try{
 let payout=registry;
 const service=merchantService({db,registryAddress:registry,mandateAddress:registry,abi,chain:{refundContext:async()=>({chainId:1874,payout,amount:500000n,refunded:400000n,decimals:6})}});
 const body={owner,paymentId:id,amount:'0.20'};
 await assert.rejects(service.refund(body),/NotPayout/);payout=owner;await assert.rejects(service.refund(body),/OverRefund/);
 }finally{db.close();}
});
