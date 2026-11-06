'use client';
import {useState} from 'react';
type Session={onboardingId:string;startUrl:string};
type Provider={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>};
export default function OwnerIdentity({id,wallet}:{id:string;wallet:string}){
 const [session,setSession]=useState<Session|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[bound,setBound]=useState(false);
 async function start(){setBusy(true);setMessage('Starting verified identity request…');try{
  const response=await fetch('/api/countersign/onboarding',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mandateId:id})});const data=await response.json();if(!response.ok)throw new Error(data.error);setSession(data);setMessage('Open World verification, finish it, then return here to bind your wallet.');
 }catch(error){setMessage(error instanceof Error?error.message:'World unavailable.');}finally{setBusy(false);}}
 async function bind(){if(!session)return;setBusy(true);try{
  const response=await fetch(`/api/countersign/onboarding/${session.onboardingId}`,{cache:'no-store'});const terms=await response.json();if(!response.ok)throw new Error(terms.error);
  if(terms.status!=='world_ok'||terms.owner?.toLowerCase()!==wallet.toLowerCase()||typeof terms.message!=='string')throw new Error('World verification is pending, expired, or belongs to another wallet.');
  const provider=(window as Window&{ethereum?:Provider}).ethereum;if(!provider)throw new Error('Wallet unavailable.');
  if(await provider.request({method:'eth_chainId'})!=='0x752')throw new Error('Select Whitechain Sepolia.');
  const accounts=await provider.request({method:'eth_accounts'});if(!Array.isArray(accounts)||accounts[0]?.toLowerCase()!==wallet.toLowerCase())throw new Error('Reconnect the mandate owner wallet.');
  const bytes=new TextEncoder().encode(terms.message);const hex='0x'+Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
  const signature=await provider.request({method:'personal_sign',params:[hex,wallet]});
  const result=await fetch(`/api/countersign/onboarding/${session.onboardingId}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({signature})});const data=await result.json();if(!result.ok||data.status!=='bound')throw new Error(data.error??'Binding not verified.');
  setBound(true);setMessage('Owner identity bound. Each payment approval still requires fresh World verification and an approval signature.');
 }catch(error){setMessage(error instanceof Error?error.message:'Binding unavailable.');}finally{setBusy(false);}}
 return <section className="mt-6 rounded-2xl border p-6"><h2 className="text-xl">Bind your World identity</h2><p className="mt-2 text-sm">Verify with World, then sign an identity-binding message with the mandate owner wallet. This message does not authorize a payment.</p>{!session&&!bound&&<button disabled={busy} onClick={start} className="mt-4 rounded-full border px-5 py-2">Start World onboarding</button>}{session&&!bound&&<div className="mt-4 flex flex-wrap gap-4"><a href={session.startUrl} target="_blank" rel="noopener noreferrer" className="underline">Open World verification ↗</a><button disabled={busy} onClick={bind} className="rounded-full border px-4 py-2">Verify completion and sign binding</button></div>}<p role="status" className="mt-4 text-sm">{message}</p></section>;
}
