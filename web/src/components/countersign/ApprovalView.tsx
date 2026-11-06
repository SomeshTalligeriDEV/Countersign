'use client';
import {subscribeRealtime} from '@/lib/countersign-realtime';
import Link from 'next/link';
import ApprovalActions from './ApprovalActions';
import { useEffect, useState } from 'react';
type Terms = {owner:string;worldStartUrl:string;typedData:{domain:{chainId:number;verifyingContract:string};primaryType:string;types:Record<string,unknown>;message:Record<string,unknown>}; formattedAmount: string; status: string; expiresAt: number; approvalDigest: string; intent: { amount: string; payout: string; merchantId: string; orderId: string; deadline: string } };
export default function ApprovalView({ id }: { id: string }) {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [error, setError] = useState('Loading exact payment terms…');
  const [now, setNow] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;let inFlight=false;
    const clock = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    async function update() {
      if(inFlight)return;inFlight=true;clearTimeout(timer);
      try {
        const response = await fetch(`/api/countersign/approvals/${id}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) { setTerms(null); setError(data.error); }
        else { setTerms(data); setError(''); setNow(Math.floor(Date.now() / 1000)); }
      } catch { if (!controller.signal.aborted) { setTerms(null); setError('Connection unavailable. Approval controls are unavailable.'); } }
      inFlight=false;
      if (!controller.signal.aborted) timer = setTimeout(update, 3000);
    }
    const unsubscribe=subscribeRealtime(()=>{void update();});void update(); return () => { unsubscribe();controller.abort(); clearTimeout(timer); clearInterval(clock); };
  }, [id]);
  const remaining = terms ? Math.max(0, terms.expiresAt - now) : 0;
  return <main className="mx-auto max-w-3xl px-6 py-16">
    <Link href="/" className="text-sm underline">Countersign</Link>
    <p className="mt-10 text-sm uppercase tracking-widest">Whitechain Sepolia · owner review</p>
    <h1 className="mt-3 font-serif text-4xl">Review this payment</h1>
    <div className="mt-8 rounded-2xl border border-neutral-300 bg-white/70 p-6" aria-live="polite">
      {!terms ? <p role="status">{error}</p> : <>
        <p className="text-lg">{remaining === 0 ? 'Approval expired' : `${remaining} seconds remaining`}</p>
        <p className="mt-2">Current state: {terms.status}</p>
        <dl className="mt-6 grid gap-4 text-sm">
          <div><dt>Amount</dt><dd className="break-all">{terms.formattedAmount} USDT</dd></div>
          <div><dt>Merchant ID</dt><dd className="break-all">{terms.intent.merchantId}</dd></div>
          <div><dt>Payout wallet</dt><dd className="break-all"><a className="underline" href={`https://explorer.testnet.whitechain.io/address/${terms.intent.payout}`} target="_blank" rel="noopener noreferrer">{terms.intent.payout}</a></dd></div>
          <div><dt>Order ID</dt><dd className="break-all">{terms.intent.orderId}</dd></div>
          <div><dt>Approval digest</dt><dd className="break-all">{terms.approvalDigest}</dd></div>
        </dl>
        <ApprovalActions id={id} terms={terms} active={remaining>0}/>
      </>}
    </div>
  </main>;
}
