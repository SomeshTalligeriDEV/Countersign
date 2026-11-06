'use client';
import {useState} from 'react';
type Tx={chainId:number;from:string;to:string;data:string;value:string;purpose:string};
type Plan={chainId:number;owner:string;token:string;mandateAddress:string;mandateId:string;transactions:Tx[];warning:string};
type Provider={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>};
const fields=[['agent','Agent wallet'],['attestor','Attestor wallet'],['perTxLimit','Maximum per payment (USDT)'],['periodLimit','Period budget (USDT)'],['humanThreshold','Human approval threshold (USDT)'],['allowance','Total token allowance (USDT)'],['periodLength','Period length (seconds)'],['expiry','Expiry (Unix seconds)']] as const;
export default function OwnerSetup({wallet}:{wallet:string}){
 const [values,setValues]=useState<Record<string,string>>({}),[plan,setPlan]=useState<Plan|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[index,setIndex]=useState(0),[hash,setHash]=useState(''),[uncertain,setUncertain]=useState(false);
 async function prepare(event:React.FormEvent){event.preventDefault();setBusy(true);setPlan(null);setHash('');setIndex(0);
  try{const response=await fetch('/api/countersign/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...values,owner:wallet})});const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(data.chainId!==1874||data.owner?.toLowerCase()!==wallet.toLowerCase()||data.token?.toLowerCase()!=='0xcedfb56113143d55b2358b8cfbb0deb5ad2f55a7'||!/^0x[\da-fA-F]{40}$/.test(data.mandateAddress)||!/^0x[\da-fA-F]{64}$/.test(data.mandateId)||!Array.isArray(data.transactions)||data.transactions.length<2||data.transactions.length>3)throw new Error('Invalid setup response.');
   for(const tx of data.transactions)if(tx.chainId!==1874||tx.value!=='0x0'||tx.from?.toLowerCase()!==wallet.toLowerCase()||![data.token.toLowerCase(),data.mandateAddress.toLowerCase()].includes(tx.to?.toLowerCase())||!/^0x[\da-fA-F]+$/.test(tx.data))throw new Error('Invalid transaction request.');
   setPlan(data);setStatus('Review the addresses and entered limits before approving each transaction.');
  }catch(error){setStatus(error instanceof Error?error.message:'Setup unavailable.');}finally{setBusy(false);}
 }
 async function send(){if(!plan||uncertain)return;setBusy(true);
  try{
   const p=(window as Window&{ethereum?:Provider}).ethereum;if(!p)throw new Error('Wallet unavailable.');
   if(await p.request({method:'eth_chainId'})!=='0x752')throw new Error('Select Whitechain Sepolia.');
   const accounts=await p.request({method:'eth_accounts'});if(!Array.isArray(accounts)||accounts[0]?.toLowerCase()!==wallet.toLowerCase())throw new Error('Reconnect the owner wallet.');
   let txHash=hash;
   if(!txHash){const tx=plan.transactions[index];const request={from:tx.from,to:tx.to,data:tx.data,value:'0x0'};await p.request({method:'eth_call',params:[request,'latest']});
    if(await p.request({method:'eth_chainId'})!=='0x752')throw new Error('Wallet network changed.');
    setUncertain(true);const result=await p.request({method:'eth_sendTransaction',params:[request]});if(typeof result!=='string'||!/^0x[\da-fA-F]{64}$/.test(result))throw new Error('Unknown transaction result. Check your wallet before retrying.');txHash=result;setHash(result);setUncertain(false);
   }
   setStatus('Transaction submitted. Waiting for confirmations…');
   for(let attempt=0;attempt<30;attempt++){
    if(await p.request({method:'eth_chainId'})!=='0x752')throw new Error('Network changed. Reconnect to check confirmation.');
    const receipt=await p.request({method:'eth_getTransactionReceipt',params:[txHash]}) as {status?:string;blockNumber?:string;blockHash?:string}|null;
    if(receipt?.status==='0x0'){setHash('');throw new Error('Transaction reverted. Check your settings before retrying.');}
    if(receipt?.status==='0x1'&&receipt.blockNumber){const head=await p.request({method:'eth_blockNumber'});const block=await p.request({method:'eth_getBlockByNumber',params:[receipt.blockNumber,false]}) as {hash?:string}|null;
     if(typeof head==='string'&&BigInt(head)>=BigInt(receipt.blockNumber)+BigInt(3)&&block?.hash===receipt.blockHash){setIndex(index+1);setHash('');setStatus(index+1===plan.transactions.length?'Setup transactions confirmed. Merchant allowlisting and World onboarding are still required.':'Step confirmed. Review the next wallet transaction.');return;}}
    await new Promise(resolve=>setTimeout(resolve,2000));
   }
   setStatus('Confirmation is still pending. Check again without resubmitting.');
  }catch(error){if((error as {code?:number}).code===4001)setUncertain(false);setStatus((error as {code?:number}).code===4001?'Declined in wallet.':error instanceof Error?error.message:'Wallet transaction unavailable.');}finally{setBusy(false);}
 }
 return <section className="mt-10 rounded-2xl border p-6"><h2 className="text-2xl">Create a mandate</h2><p className="mt-3 text-sm">Your connected wallet is the treasury and pays testnet gas. Allowance changes affect all your mandates using this contract.</p><form onSubmit={prepare} className="mt-5 grid gap-4">{fields.map(([name,label])=><label key={name} className="text-sm">{label}<input required disabled={busy||!!plan} value={values[name]??''} onChange={e=>setValues({...values,[name]:e.target.value})} className="mt-1 block w-full rounded-lg border p-2"/></label>)}<button disabled={!wallet||busy||!!plan} className="rounded-full border px-4 py-2 disabled:opacity-40">Review setup</button></form>
 {plan&&<div className="mt-5"><p>{plan.warning}</p><p className="mt-3 break-all">Mandate contract: {plan.mandateAddress}</p><p className="mt-3 break-all">Mandate ID: {plan.mandateId}</p><ol className="mt-4 list-inside list-decimal">{plan.transactions.map((tx,i)=><li key={i}>{tx.purpose}{i<index?': confirmed':''}</li>)}</ol>{index<plan.transactions.length&&<button disabled={busy||uncertain} onClick={send} className="mt-4 rounded-full bg-neutral-900 px-5 py-3 text-white disabled:opacity-40">{hash?'Check confirmation':`Confirm step ${index+1} in wallet`}</button>}</div>}
 <p role="status" className="mt-4">{status}</p>{uncertain&&<p>Submission outcome is unknown. Check your wallet and explorer before starting another setup; retries are blocked here.</p>}{hash&&<a className="underline" target="_blank" rel="noopener noreferrer" href={`https://explorer.testnet.whitechain.io/tx/${hash}`}>View pending transaction ↗</a>}<p className="mt-4 text-xs">Keep this page open until completion. If it closes, inspect wallet transactions and allowance before starting again.</p></section>;
}
