'use client';
import {subscribeRealtime} from '@/lib/countersign-realtime';
import Link from 'next/link';
import OwnerIdentity from './OwnerIdentity';
import OwnerSetup from './OwnerSetup';
import MandateActions from './MandateActions';
import {useEffect,useState} from 'react';
type Provider={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>;on?:(event:string,handler:()=>void)=>void;removeListener?:(event:string,handler:()=>void)=>void};
type Snapshot={mandateAddress:string;actions:{pause:string;unpause:string;revoke:string};owner:string;remaining:string;perTxLimit:string;periodLimit:string;decimals:number;paused:boolean;epoch:string;block:string};
function format(value:string,decimals:number){const n=value.padStart(decimals+1,'0');if(!decimals)return n;const f=n.slice(-decimals).replace(/0+$/,'');return n.slice(0,-decimals)+(f?'.'+f:'');}
export default function OwnerView(){
 const [wallet,setWallet]=useState(''),[message,setMessage]=useState('Connect your wallet to identify the owner.'),[input,setInput]=useState(''),[id,setId]=useState(''),[snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const provider=()=> (window as Window & {ethereum?:Provider}).ethereum;
 useEffect(()=>{const p=provider();const reset=()=>{setWallet('');setSnapshot(null);setMessage('Wallet changed or disconnected. Reconnect to continue.');};for(const event of ['accountsChanged','chainChanged','disconnect'])p?.on?.(event,reset);return()=>{for(const event of ['accountsChanged','chainChanged','disconnect'])p?.removeListener?.(event,reset);};},[]);
 async function connect(){
  setWallet('');
  const p=provider();if(!p){setMessage('No browser wallet found. Connect a compatible wallet extension.');return;}
  try{
   const accounts=await p.request({method:'eth_requestAccounts'});
   if(await p.request({method:'eth_chainId'})!=='0x752'){setWallet('');setMessage('Select Whitechain Sepolia (1874) in your wallet, then reconnect.');return;}
   if(!Array.isArray(accounts)||!/^0x[\da-fA-F]{40}$/.test(accounts[0]))throw new Error('invalid_account');
   setWallet(accounts[0]);setMessage('Wallet connected. Connection alone does not authenticate ownership.');
  }catch{setMessage('Wallet connection was declined or unavailable.');}
 }
 useEffect(()=>{
  if(!id)return;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;let inFlight=false;
  async function update(){if(inFlight)return;inFlight=true;clearTimeout(timer);try{const response=await fetch(`/api/countersign/mandates/${id}`,{cache:'no-store',signal:controller.signal});const data=await response.json();if(!response.ok){setSnapshot(null);setMessage(data.error);}else{setSnapshot(data);setMessage('Live mandate read from Whitechain.');}}catch{if(!controller.signal.aborted){setSnapshot(null);setMessage('Connection unavailable. Budget is not being assumed.');}}inFlight=false;if(!controller.signal.aborted)timer=setTimeout(update,5000);}
  const unsubscribe=subscribeRealtime(()=>{void update();});void update();return()=>{unsubscribe();controller.abort();clearTimeout(timer);};
 },[id]);
 return <main className="mx-auto max-w-3xl px-6 py-16"><Link href="/" className="underline">Countersign</Link><h1 className="mt-10 font-serif text-4xl">Your spending mandate</h1><p className="mt-3">Whitechain Sepolia · testnet</p>
 <button onClick={connect} className="mt-6 rounded-full bg-neutral-900 px-6 py-3 text-white">{wallet?'Reconnect wallet':'Connect wallet'}</button><p className="mt-3 break-all text-sm">{wallet}</p>
 <form className="mt-8" onSubmit={event=>{event.preventDefault();setSnapshot(null);if(/^0x[\da-fA-F]{64}$/.test(input))setId(input);else {setId('');setMessage('Enter a valid bytes32 mandate ID.');}}}><label htmlFor="mandate">Mandate ID</label><input id="mandate" value={input} onChange={e=>setInput(e.target.value)} className="mt-2 block w-full rounded-xl border p-3" placeholder="0x…"/><button className="mt-3 rounded-full border border-neutral-800 px-5 py-2">Read mandate</button></form>
 <p role="status" className="mt-6">{message}</p>
 {snapshot&&<section className="mt-6 rounded-2xl border bg-white/70 p-6"><h2 className="text-2xl">{format(snapshot.remaining,snapshot.decimals)} USDT remaining</h2><p className="mt-3">Per payment: {format(snapshot.perTxLimit,snapshot.decimals)} USDT</p><p>Period budget: {format(snapshot.periodLimit,snapshot.decimals)} USDT</p><p>{snapshot.paused?'Paused':'Not paused'} · epoch {snapshot.epoch} · block {snapshot.block}</p><p className="mt-3 break-all">Owner: {snapshot.owner}</p>{wallet&&<p className="mt-3">{wallet.toLowerCase()===snapshot.owner.toLowerCase()?'Connected address matches the recorded owner.':'This mandate belongs to a different wallet.'}</p>}</section>}
 {snapshot&&wallet&&<MandateActions key={id+wallet} id={id} wallet={wallet} snapshot={snapshot}/>}
 {snapshot&&wallet.toLowerCase()===snapshot.owner.toLowerCase()&&<OwnerIdentity key={'identity'+id+wallet} id={id} wallet={wallet}/>}
 {wallet&&<OwnerSetup key={wallet} wallet={wallet}/>}
 <p className="mt-8 text-sm text-neutral-600">World onboarding requires configured issuer credentials and a supported identity. Merchant controls require a registered merchant ID. Setup requires a deployed mandate contract and a funded testnet wallet.</p></main>;
}
