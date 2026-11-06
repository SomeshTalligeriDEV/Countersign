import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openStore} from '../src/store.mjs';
import {Approvals} from '../src/approvals.mjs';
import {Facilitator} from '../src/facilitator.mjs';
import {GasGuard} from '../src/gasguard.mjs';
import {relayConfig} from '../src/relay-config.mjs';
import {createAttestor} from '../../attestor/src/attestor.mjs';
import {createOwnerSignatureService} from '../src/owner-signature.mjs';
import {privateKeyToAccount} from '../../../packages/shared/src/test-signing.mjs';
import {hashIntent,hashApproval,approvalFor,recoverOwner} from '../../../packages/shared/src/crypto.mjs';
import {paymentDomain,paymentTypes} from '../../../packages/shared/src/index.ts';
const v=JSON.parse(readFileSync(new URL('../../../packages/shared/vectors/payment.json',import.meta.url)));
test('approved relay validates both signatures and simulates full pay arguments',async()=>{
 const db=openStore(':memory:');try{
 const owner=privateKeyToAccount('0x'+'0'.repeat(63)+'1'),agent=privateKeyToAccount('0x'+'0'.repeat(63)+'2'),attestor=privateKeyToAccount('0x'+'0'.repeat(63)+'3');
 const address=v.domain.verifyingContract,clock=()=>1000;
 const intent=Object.fromEntries(Object.entries({...v.intent,deadline:1100}).map(([k,value])=>[k,String(value)]));
 const agentSig=await agent.signTypedData({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentIntent',message:intent});
 const approvals=new Approvals(db);const id=approvals.create({intentDigest:hashIntent(address,intent),approvalDigest:hashApproval(address,intent),intent,agentSig,ownerSubHash:v.attestation.ownerSubHash},1000);
 // Fixture identity only. No World issuer involved.
 db.prepare("UPDATE approvals SET state='world_ok',auth_time=1000,world_sub_hash=owner_sub_hash WHERE id=?").run(id);
 const att=createAttestor({db,account:attestor,mandateAddress:address,clock});await att.attest(id);
 let broadcasts=0;let reject=false;
 const chain={chainId:async()=>1874,policy:async()=>({owner:owner.address,agent:agent.address,attestor:attestor.address,epoch:3n,expiry:2000n,perTxLimit:1000000n,humanThreshold:500000n,paused:false}),verifyOwner:async(o,i,s)=>(await recoverOwner(address,i,s))===o,simulatePay:async(i,s,a)=>{assert.equal(s,agentSig);assert.ok(a.ownerSig);assert.ok(a.signature);if(reject)throw new Error('OverPeriod');return {gas:10n,maxFeePerGas:1n};},broadcastPay:async()=>{broadcasts++;return '0x'+'8'.repeat(64);}};
 const service=new Facilitator({db,chain,guard:new GasGuard(db,{mandateAddress:address,dailyWei:1000n,mandateDailyWei:1000n,maxFeePerGas:2n}),mandateAddress:address,clock});
 const signatures=createOwnerSignatureService({db,chain,attestor:{attest:async()=>{}},mandateAddress:address,clock});
 const signature=await owner.signTypedData({domain:paymentDomain(address),types:paymentTypes,primaryType:'PaymentApproval',message:approvalFor(address,intent)});
 await signatures.submit(id,{signature});reject=true;
 await assert.rejects(service.settleApproved(id),/would_revert/);assert.equal(broadcasts,0);
 reject=false;assert.equal((await service.settleApproved(id)).status,'submitted');assert.equal(broadcasts,1);
 assert.equal(approvals.get(id,1000).state,'submitted');await assert.rejects(service.settleApproved(id),/approval_not_ready/);
 }finally{db.close();}
});
test('live relay requires explicit flag and complete budget configuration',()=>{
 assert.equal(relayConfig({}),null);assert.throws(()=>relayConfig({RELAYER_ENABLED:'1'}),/incomplete/);
 assert.throws(()=>relayConfig({RELAYER_ENABLED:'1',RELAYER_KEY:'present',WHITECHAIN_RPC_URL:'https://rpc',MANDATE_ADDRESS:'address',REGISTRY_ADDRESS:'address',DEPLOYMENT_BLOCK:'1'}),/missing_or_invalid/);
});
