'use client';
import {useEffect,useState} from 'react';
import {CopyButton} from './ui';
// Long hex values: truncated mono + copy, full value on hover.
function Val({v}:{v:string|null}){if(!v)return <>—</>;if(!/^0x[\da-fA-F]{16,}$/.test(v))return <>{v}</>;return <><span className="cs-trunc cs-mono" title={v}>{v}</span><CopyButton value={v}/></>;}
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
 return <section data-ch="CH.02 · Agent identity" className="mt-6 rounded-2xl border p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-xl">Agent ENS identity</h2><span className="cs-badge">{live?'Live · Sepolia':message&&!message.startsWith('Reading')?'Offline':'Loading'}</span></div>
 {!name&&<p className="mt-2 text-sm">FIXTURE: no agent ENS name configured (NEXT_PUBLIC_ENS_AGENT_NAME). No ENS data is shown or assumed.</p>}
 {policy&&<dl className="mt-4 grid gap-2 break-all text-sm"><div><dt className="font-medium">Name</dt><dd>{policy.name}</dd></div><div><dt className="font-medium">Agent address</dt><dd>{policy.address?<Val v={policy.address}/>:'none'}</dd></div><div><dt className="font-medium">Mandate</dt><dd>{policy.mandate?<><Val v={policy.mandate.address}/> (chain {policy.mandate.chainId})</>:'not set'}</dd></div><div><dt className="font-medium">Attestor</dt><dd>{policy.attestor?<Val v={policy.attestor}/>:'not set'}</dd></div><div><dt className="font-medium">Merchants hash</dt><dd>{policy.merchantsHash?<Val v={policy.merchantsHash}/>:'not set'}</dd></div><div><dt className="font-medium">Limits</dt><dd>{policy.limits?JSON.stringify(policy.limits):'not set'}</dd></div>{policy.problems.length>0&&<div><dt className="font-medium">Problems</dt><dd>{policy.problems.join('; ')}</dd></div>}</dl>}
 {rows&&<div data-ch="CH.03 · ENS vs chain" className="cs-drift mt-6"><h3 className="font-medium">ENS vs on-chain Mandate</h3><table className="mt-2 w-full text-left text-sm"><thead><tr><th>Field</th><th>ENS</th><th>Chain</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.field}><td data-label="Field" className="font-medium">{r.field}</td><td data-label="ENS"><Val v={r.ens}/></td><td data-label="Chain"><Val v={r.chain}/></td><td data-label="Status"><span className="cs-stamp" data-s={r.status}>{r.status}</span></td></tr>)}</tbody></table><p className="cs-bubble mt-4 text-sm">{DRIFT_NOTE}</p></div>}
 <p role="status" className="mt-4 text-sm">{message}</p><p className="cs-bubble mt-4 text-sm">{NOTE}</p></section>;
}
