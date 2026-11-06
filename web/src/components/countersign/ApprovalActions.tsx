'use client';
import {paymentError} from '@/lib/countersign-errors';
import {useState} from 'react';
import {Toast} from './ui';
type Terms={status:string;expiresAt:number;owner:string;worldStartUrl:string;typedData:{domain:{chainId:number;verifyingContract:string};primaryType:string;types:Record<string,unknown>;message:Record<string,unknown>}};
type Provider={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>};
export default function ApprovalActions({id,terms,active}:{id:string;terms:Terms;active:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failure,setFailure]=useState('');
 async function sign(){setBusy(true);setFailure('');try{
  const response=await fetch(`/api/countersign/approvals/${id}`,{cache:'no-store'});if(!response.ok)throw new Error('Cannot refresh approval terms.');const fresh:Terms=await response.json();
  if(fresh.status!=='world_ok'||fresh.expiresAt<=Date.now()/1000||fresh.typedData?.domain?.chainId!==1874||fresh.typedData.primaryType!=='PaymentApproval')throw new Error('Fresh World verification is required before signing.');
  const p=(window as Window&{ethereum?:Provider}).ethereum;if(!p)throw new Error('Connect a browser wallet.');
  const accounts=await p.request({method:'eth_requestAccounts'});if(!Array.isArray(accounts)||accounts[0]?.toLowerCase()!==fresh.owner.toLowerCase())throw new Error('Connect the mandate owner wallet.');
  if(await p.request({method:'eth_chainId'})!=='0x752')throw new Error('Select Whitechain Sepolia.');
  const signature=await p.request({method:'eth_signTypedData_v4',params:[fresh.owner,JSON.stringify(fresh.typedData)]});
  const submit=await fetch(`/api/countersign/approvals/${id}/owner-signature`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({signature})});const result=await submit.json();if(!submit.ok)throw new Error(result.error??'Submission unavailable.');
  setMessage(result.status==='submitted'?'Payment submitted. Awaiting confirmed contract events.':'Owner signature recorded. Payment is not yet confirmed.');
 }catch(error){setMessage('');setFailure(paymentError(error instanceof Error?error.message:error));}finally{setBusy(false);}}
 return <div className="mt-6"><div className="flex flex-wrap gap-4">{active&&terms.status==='pending_human'&&<a className="underline" target="_blank" rel="noopener noreferrer" href={terms.worldStartUrl}>Verify with World ↗</a>}<button disabled={busy||!active||terms.status!=='world_ok'} onClick={sign} className="rounded-full border px-4 py-2 disabled:opacity-40">Sign exact payment approval</button></div><p className="mt-3 text-sm">World verification opens in a separate tab. Return here after completing it. Only confirmed contract events establish settlement.</p><p role="status" className="mt-3">{message}</p><Toast message={failure} onClose={()=>setFailure('')}/></div>;
}
