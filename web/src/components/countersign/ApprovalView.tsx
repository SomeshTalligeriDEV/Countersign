'use client';
import {subscribeRealtime} from '@/lib/countersign-realtime';
import Link from 'next/link';
import ApprovalActions from './ApprovalActions';
import { useEffect, useState } from 'react';
import {CopyButton,CountdownRing,ExplorerLink,Steps,WorldModeBadge} from './ui';
type Terms = {owner:string;worldStartUrl:string;typedData:{domain:{chainId:number;verifyingContract:string};primaryType:string;types:Record<string,unknown>;message:Record<string,unknown>}; formattedAmount: string; status: string; expiresAt: number; approvalDigest: string; intent: { amount: string; payout: string; merchantId: string; orderId: string; deadline: string } };
export default function ApprovalView({ id }: { id: string }) {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [error, setError] = useState('Loading exact payment terms…');
  const [now, setNow] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;let inFlight=false;
    const clock = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    async function update() {
      if(inFlight)return;inFlight=true;clearTimeout(timer);
      try {
        const response = await fetch(`/api/countersign/approvals/${id}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) { setTerms(null); setError(data.error); }
        else { const t = Math.floor(Date.now() / 1000); setTerms(data); setError(''); setNow(t); setTotal(v => Math.max(v, data.expiresAt - t)); }
      } catch { if (!controller.signal.aborted) { setTerms(null); setError('Connection unavailable. Approval controls are unavailable.'); } }
      inFlight=false;
      if (!controller.signal.aborted) timer = setTimeout(update, 3000);
    }
    const unsubscribe=subscribeRealtime(()=>{void update();});void update(); return () => { unsubscribe();controller.abort(); clearTimeout(timer); clearInterval(clock); };
  }, [id]);
  const remaining = terms ? Math.max(0, terms.expiresAt - now) : 0;
  const step = !terms ? 0 : terms.status === 'pending_human' ? 0 : terms.status === 'world_ok' ? 1 : 2;
  return <main className="cs-comic mx-auto max-w-3xl px-6 py-16">
    <Link href="/" className="text-sm underline">Countersign</Link>
    <div className="mt-10 flex flex-wrap items-center justify-between gap-3"><p className="text-sm uppercase tracking-widest">Whitechain Sepolia · owner review</p><WorldModeBadge/></div>
    <h1 className="mt-3 font-serif text-4xl">Review this payment</h1>
    <div className="mt-8 rounded-2xl border border-neutral-300 bg-white/70 p-6" aria-live="polite">
      {!terms ? <p role="status" className={error.endsWith('…') ? 'cs-skeleton' : undefined}>{error}</p> : <>
        <Steps steps={['World verification', 'Owner signature', 'Relayed to contract']} current={step}/>
        <div className="mt-6 flex items-center gap-3"><CountdownRing remaining={remaining} total={total}/><p className="text-lg">{remaining === 0 ? 'Approval expired' : `${remaining} seconds remaining`}</p></div>
        <p className="mt-2">Current state: {terms.status}</p>
        <dl className="mt-6 grid gap-4 text-sm">
          <div><dt>Amount</dt><dd className="break-all">{terms.formattedAmount} USDT</dd></div>
          <div><dt>Merchant ID</dt><dd className="break-all">{terms.intent.merchantId}<CopyButton value={terms.intent.merchantId} label="Copy merchant ID"/></dd></div>
          <div><dt>Payout wallet</dt><dd className="break-all"><ExplorerLink address={terms.intent.payout}/><CopyButton value={terms.intent.payout} label="Copy payout wallet"/></dd></div>
          <div><dt>Order ID</dt><dd className="break-all">{terms.intent.orderId}<CopyButton value={terms.intent.orderId} label="Copy order ID"/></dd></div>
          <div><dt>Approval digest</dt><dd className="break-all">{terms.approvalDigest}<CopyButton value={terms.approvalDigest} label="Copy approval digest"/></dd></div>
        </dl>
        <ApprovalActions id={id} terms={terms} active={remaining>0}/>
      </>}
    </div>
  </main>;
}
