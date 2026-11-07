'use client';
import {useEffect,useState} from 'react';
import {CopyButton} from './ui';
import {subscribeRealtime} from '@/lib/countersign-realtime';
// Long hex values: truncated mono + copy, full value on hover.
function Val({v}:{v:string|null}){if(!v)return <>—</>;if(!/^0x[\da-fA-F]{16,}$/.test(v))return <>{v}</>;return <><span className="cs-trunc cs-mono" title={v}>{v}</span><CopyButton value={v}/></>;}
type Policy={name:string;address:string|null;limits:unknown;merchantsHash:string|null;attestor:string|null;mandate:{chainId:number;address:string;mandateId:string|null}|null;problems:string[]};
type Row={field:string;ens:string|null;chain:string|null;status:'MATCH'|'MISMATCH'|'MISSING'};
const DRIFT_NOTE='Whitechain cannot read ENS; the contract enforces signed commitments. ENS mirrors the policy.';
const NOTE='Whitechain does not read ENS; the Mandate contract enforces signed commitments; ENS is the human-readable identity/policy layer.';
export default function EnsIdentity({name=process.env.NEXT_PUBLIC_ENS_AGENT_NAME}:{name?:string}){
 const [snapshot,setSnapshot]=useState<{name:string;policy:Policy;rows:Row[];checkedAt:string}|null>(null);
 const [message,setMessage]=useState('Reading ENS on Sepolia…');
 useEffect(()=>{
  if(!name)return;
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;let inFlight=false;
  async function refresh(){
   if(inFlight||controller.signal.aborted)return;inFlight=true;clearTimeout(timer);
   try{
    const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(35000)]);
    const base=`/api/countersign/ens/${encodeURIComponent(name!)}`;
    const [identityResponse,driftResponse]=await Promise.all([fetch(base,{cache:'no-store',signal}),fetch(`${base}/drift`,{cache:'no-store',signal})]);
    if(!identityResponse.ok||!driftResponse.ok)throw Error('ENS or policy comparison is unavailable. No current identity is assumed.');
    const [policy,drift]=await Promise.all([identityResponse.json(),driftResponse.json()]);
    if(policy.mode!=='live'||policy.network!=='sepolia'||policy.name?.toLowerCase()!==name!.toLowerCase()||!Array.isArray(policy.problems)||!Array.isArray(drift.rows)||drift.ensRead!==true)throw Error('ENS response is incomplete or does not match the requested identity.');
    const times=[policy.checkedAt,drift.checkedAt].map(value=>Date.parse(value));
    if(times.some(t=>!Number.isFinite(t)||t>Date.now()+5000||Date.now()-t>120000))throw Error('ENS observation is stale. Refresh before relying on these records.');
    if(!controller.signal.aborted){setSnapshot({name:name!,policy,rows:drift.rows,checkedAt:policy.checkedAt});setMessage('');}
   }catch(error){if(!controller.signal.aborted){setSnapshot(null);setMessage(error instanceof Error?error.message:'ENS unavailable. No current identity is assumed.');}}
   finally{inFlight=false;if(!controller.signal.aborted)timer=setTimeout(refresh,30000);}
  }
  const unsubscribe=subscribeRealtime(()=>{void refresh();});void refresh();
  return()=>{unsubscribe();controller.abort();clearTimeout(timer);};
 },[name]);
 const current=snapshot?.name===name?snapshot:null,policy=current?.policy??null,rows=current?.rows??null;
 const badge=!name?'Not configured':current?'Read · Sepolia':message.startsWith('Reading')?'Loading':'Unavailable';
 const counts=rows?{MATCH:rows.filter(r=>r.status==='MATCH').length,MISMATCH:rows.filter(r=>r.status==='MISMATCH').length,MISSING:rows.filter(r=>r.status==='MISSING').length}:null;
 const verdict=!counts?null:counts.MISMATCH?'DRIFT DETECTED':counts.MISSING===rows!.length?'CHAIN UNREACHABLE':counts.MISSING?'MOSTLY IN SYNC':'IN SYNC';
 const records:[string,string|null][]=policy?[['Agent address',policy.address],['Mandate · chain '+(policy.mandate?.chainId??'—'),policy.mandate?.address??null],['Attestor',policy.attestor],['Merchants hash',policy.merchantsHash],['Limits (USDT, 6 dp)',policy.limits?JSON.stringify(policy.limits):null]]:[];
 return <section data-ch="CH.02 · Agent identity" className="cs-ens mt-6">
  <header className="cs-ens-hero"><span className="cs-ens-sfx" aria-hidden="true">シュッ</span><div><p className="cs-ens-kicker">ENSv2 · Sepolia · agent passport</p><h2 className="cs-ens-name">{policy?.name??name??'Agent ENS identity'}</h2><p className="cs-ens-say">“My name is public. My spending rules are public. Check them against the chain.”</p></div><span className="cs-badge cs-ens-live" data-live={current?'1':'0'}>{badge}</span></header>
  {!name&&<p className="mt-2 text-sm">No agent ENS name is configured. No identity data is shown or assumed.</p>}
  {policy&&<div className="cs-ens-grid">{records.map(([k,v],i)=><div key={k} className="cs-ens-card" style={{'--i':i} as React.CSSProperties}><span className="cs-ens-k">{k}</span><span className="cs-ens-v break-all">{v?<Val v={v}/>:'not set'}</span></div>)}{policy.problems.length>0&&<div className="cs-ens-card cs-ens-warn"><span className="cs-ens-k">Problems</span><span className="cs-ens-v">{policy.problems.join('; ')}</span></div>}</div>}
  {rows&&counts&&<div data-ch="CH.03 · ENS vs chain" className="cs-drift cs-ens-vs">
   <div className="cs-ens-banner" data-v={verdict}><span className="cs-ens-banner-t">ENS <b>VS</b> WHITECHAIN</span><span className="cs-ens-score"><b>{counts.MATCH}</b>/{rows.length} match</span><span className="cs-stamp" data-s={counts.MISMATCH?'MISMATCH':counts.MISSING===rows.length?'MISSING':'MATCH'}>{verdict}</span></div>
   <ol className="cs-ens-rows">{rows.map((r,i)=><li key={r.field} className="cs-ens-row" data-s={r.status} style={{'--i':i} as React.CSSProperties}><span className="cs-ens-field">{r.field}</span><span className="cs-ens-side"><small>ENS</small><Val v={r.ens}/></span><span className="cs-ens-x" aria-hidden="true">VS</span><span className="cs-ens-side"><small>Chain</small><Val v={r.chain}/></span><span className="cs-stamp" data-s={r.status}>{r.status}</span></li>)}</ol>
   <p className="cs-bubble mt-4 text-sm">{DRIFT_NOTE}</p></div>}
  <p role="status" className="mt-4 text-sm">{name?message:''}</p>{current&&<p className="mt-3 text-xs">Last read {new Date(current.checkedAt).toLocaleTimeString()}. Refreshes on service notifications and every 30 seconds. These records do not establish full permission verification.</p>}<p className="cs-bubble mt-4 text-sm">{NOTE}</p></section>;
}
