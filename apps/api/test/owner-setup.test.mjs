import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerSetup} from '../src/owner-setup.mjs';
import {decodeFunctionData,erc20Abi} from '../../../packages/shared/src/viem-runtime.mjs';
const owner='0x'+'1'.repeat(40),contract='0x'+'2'.repeat(40),token='0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7';
const abi=[{type:'function',name:'createMandate',stateMutability:'nonpayable',inputs:[{name:'p',type:'tuple',components:[['agent','address'],['attestor','address'],['perTxLimit','uint128'],['periodLimit','uint128'],['humanThreshold','uint128'],['periodLength','uint64'],['expiry','uint64'],['ensNamehash','bytes32']].map(([name,type])=>({name,type}))},{name:'salt',type:'bytes32'}],outputs:[{type:'bytes32'}]}];
const body={owner,agent:owner,attestor:contract,perTxLimit:'2',periodLimit:'10',humanThreshold:'1',allowance:'5',periodLength:'3600',expiry:'2000'};
test('owner setup encodes bounded allowance using runtime decimals and reset-before-change',async()=>{
 const service=createOwnerSetup({mandateAddress:contract,abi,clock:()=>1000,chain:{setupContext:async()=>({chainId:1874,token,decimals:18,allowance:1n})}});
 const result=await service.prepare(body);assert.equal(result.transactions.length,3);
 assert.equal(decodeFunctionData({abi:erc20Abi,data:result.transactions[0].data}).args[1],0n);
 assert.equal(decodeFunctionData({abi:erc20Abi,data:result.transactions[1].data}).args[1],5000000000000000000n);
 const creation=decodeFunctionData({abi,data:result.transactions[2].data});assert.equal(creation.functionName,'createMandate');assert.equal(creation.args[0].perTxLimit,2000000000000000000n);
 assert.equal(result.transactions[2].from,owner);
});
test('owner setup rejects unlimited/over-budget allowance and arbitrary transaction fields',async()=>{
 const service=createOwnerSetup({mandateAddress:contract,abi,clock:()=>1000,chain:{setupContext:async()=>({chainId:1874,token,decimals:6,allowance:0n})}});
 await assert.rejects(service.prepare({...body,allowance:'11'}),/invalid_setup/);
 await assert.rejects(service.prepare({...body,treasury:contract}),/invalid_setup/);
 await assert.rejects(service.prepare({...body,expiry:'999'}),/invalid_setup/);
});
test('merchant allowlist preparation rejects a different treasury before encoding',async()=>{
 const service=createOwnerSetup({mandateAddress:contract,abi,chain:{chainId:async()=>1874,policy:async()=>({owner:contract})}});
 await assert.rejects(service.merchant({owner,mandateId:'0x'+'1'.repeat(64),merchantId:'0x'+'2'.repeat(64),allowed:true}),/NotOwner/);
});
