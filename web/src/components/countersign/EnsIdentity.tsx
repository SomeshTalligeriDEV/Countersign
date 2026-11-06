'use client';
import {useEffect,useState} from 'react';
type Policy={name:string;address:string|null;limits:unknown;merchantsHash:string|null;attestor:string|null;mandate:{chainId:number;address:string;mandateId:string|null}|null;problems:string[]};
type Row={field:string;ens:string|null;chain:string|null;status:'MATCH'|'MISMATCH'|'MISSING'};
const DRIFT_NOTE='Whitechain cannot read ENS; the contract enforces signed commitments. ENS mirrors the policy.';
const NOTE='Whitechain does not read ENS; the Mandate contract enforces signed commitments; ENS is the human-readable identity/policy layer.';
export default function EnsIdentity({name=process.env.NEXT_PUBLIC_ENS_AGENT_NAME}:{name?:string}){
 const [policy,setPolicy]=useState<Policy|null>(null),[message,setMessage]=useState(name?'Reading ENS on Sepolia…':'');
 useEffect(()=>{if(!name)return;const c=new AbortController();fetch(`/api/countersign/ens/${encodeURIComponent(name)}`,{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setPolicy(d);setMessage('');}).catch(e=>{if(!c.signal.aborted)setMessage(e instanceof Error?e.message:'ENS unavailable.');});return()=>c.abort();},[name]);
 const [rows,setRows]=useState<Row[]|null>(null);
 useEffect(()=>{if(!name)return;const c=new AbortController();fetch(`/api/countersign/ens/${encodeURIComponent(name)}/drift`,{cache:'no-store',signal:c.signal}).then(r=>r.json()).then(d=>setRows(Array.isArray(d.rows)?d.rows:null)).catch(()=>{if(!c.signal.aborted)setRows(null);});return()=>c.abort();},[name]);
 const live=!!policy;
 return <section className="mt-6 rounded-2xl border p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-xl">Agent ENS identity</h2><span className="rounded-full border px-3 py-1 text-xs">{live?'Live · Sepolia':'Fixture'}</span></div>
 {!name&&<p className="mt-2 text-sm">FIXTURE: no agent ENS name configured (NEXT_PUBLIC_ENS_AGENT_NAME). No ENS data is shown or assumed.</p>}
 {policy&&<dl className="mt-4 grid gap-2 break-all text-sm"><div><dt className="font-medium">Name</dt><dd>{policy.name}</dd></div><div><dt className="font-medium">Agent address</dt><dd>{policy.address??'none'}</dd></div><div><dt className="font-medium">Mandate</dt><dd>{policy.mandate?`${policy.mandate.address} (chain ${policy.mandate.chainId})`:'not set'}</dd></div><div><dt className="font-medium">Attestor</dt><dd>{policy.attestor||'not set'}</dd></div><div><dt className="font-medium">Merchants hash</dt><dd>{policy.merchantsHash||'not set'}</dd></div><div><dt className="font-medium">Limits</dt><dd>{policy.limits?JSON.stringify(policy.limits):'not set'}</dd></div>{policy.problems.length>0&&<div><dt className="font-medium">Problems</dt><dd>{policy.problems.join('; ')}</dd></div>}</dl>}
 {rows&&<div className="mt-4 overflow-x-auto"><h3 className="font-medium">ENS vs on-chain Mandate</h3><table className="mt-2 w-full text-left text-sm"><thead><tr><th>Field</th><th>ENS</th><th>Chain</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.field} className="border-t align-top"><td className="pr-2">{r.field}</td><td className="break-all pr-2">{r.ens??'—'}</td><td className="break-all pr-2">{r.chain??'—'}</td><td className="font-medium">{r.status}</td></tr>)}</tbody></table><p className="mt-2 text-xs opacity-70">{DRIFT_NOTE}</p></div>}
 <p role="status" className="mt-4 text-sm">{message}</p><p className="mt-2 text-xs opacity-70">{NOTE}</p></section>;
}
