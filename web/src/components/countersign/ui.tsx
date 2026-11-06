'use client';
// F4 shared UI bits: copy, explorer links (from the single shared chain def), true-mode World badge, steps, countdown ring, toast.
import {explorerAddress,explorerTx} from '@/lib/countersign-chain';
import {useEffect,useState} from 'react';

export function CopyButton({value,label='Copy'}:{value:string;label?:string}){
 const [done,setDone]=useState(false);
 return <button type="button" className="cs-copy" aria-label={`${label}: ${value}`} onClick={()=>{void navigator.clipboard?.writeText(value).then(()=>{setDone(true);setTimeout(()=>setDone(false),1500);},()=>{});}}>{done?'Copied':'Copy'}</button>;
}

// Malformed hash/address renders as plain text, never a broken explorer URL.
export function ExplorerLink({tx,address,children,className="underline"}:{tx?:string;address?:string;children?:React.ReactNode;className?:string}){
 let href='';try{href=tx?explorerTx(tx):explorerAddress(address??'');}catch{return <span className="break-all">{tx??address}</span>;}
 return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children??(tx??address)}</a>;
}

// Mode comes from the API's /v1/network `world` block; never assumed.
export function WorldModeBadge(){
 const [mode,setMode]=useState('World: checking');
 useEffect(()=>{const c=new AbortController();fetch('/api/network',{cache:'no-store',signal:c.signal}).then(r=>r.json()).then(d=>{const w=d?.world;setMode(!w?'World: unknown':!w.configured?'World: not configured':w.env==='production'?'World: Live':'World: Sandbox');}).catch(()=>{if(!c.signal.aborted)setMode('World: unknown');});return()=>c.abort();},[]);
 return <span className="cs-badge" data-mode={mode.split(': ')[1]}>{mode}</span>;
}

export function Steps({steps,current}:{steps:string[];current:number}){
 return <ol className="cs-steps" aria-label="Approval progress">{steps.map((s,i)=><li key={s} data-state={i<current?'done':i===current?'current':'upcoming'} aria-current={i===current?'step':undefined}><span aria-hidden="true">{i<current?'✓':i+1}</span>{s}</li>)}</ol>;
}

export function CountdownRing({remaining,total}:{remaining:number;total:number}){
 const r=18,c=2*Math.PI*r,f=total>0?Math.min(1,remaining/total):0;
 return <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="cs-ring" data-low={remaining<=30||undefined}><circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="cs-ring-track"/><circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" strokeDasharray={c} strokeDashoffset={c*(1-f)} transform="rotate(-90 22 22)" className="cs-ring-bar"/></svg>;
}

export function Toast({message,onClose}:{message:string;onClose:()=>void}){
 if(!message)return null;
 return <div role="alert" className="cs-toast"><span>{message}</span><button type="button" onClick={onClose} aria-label="Dismiss">×</button></div>;
}
