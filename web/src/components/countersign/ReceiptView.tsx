'use client';
import {subscribeRealtime} from '@/lib/countersign-realtime';
import Link from 'next/link';
import { useEffect, useState } from 'react';
type Receipt = { paymentId: string; amount: string; refunded: string; decimals: number; status: string; mandateId: string; merchantId: string; payout: string; humanApproved: boolean; txHash: string; checkedAt: string };
function amount(value: string, decimals: number) {
  const padded = value.padStart(decimals + 1, '0');
  if (decimals === 0) return padded;
  const fraction = padded.slice(-decimals).replace(/0+$/, '');
  return padded.slice(0, -decimals) + (fraction ? `.${fraction}` : '');
}
export default function ReceiptView({ paymentId }: { paymentId: string }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [message, setMessage] = useState('Checking confirmed payment records…');
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;let inFlight=false;
    async function update() {
      if(inFlight)return;inFlight=true;clearTimeout(timer);
      try {
        const response = await fetch(`/api/countersign/receipts/${encodeURIComponent(paymentId)}`, { cache: 'no-store', signal: controller.signal });
        const body = await response.json();
        if (!response.ok) { setReceipt(null); setMessage(body.error ?? 'Receipt unavailable.'); }
        else { setReceipt(body); setMessage(''); }
      } catch { if (!controller.signal.aborted) { setReceipt(null); setMessage('Connection interrupted. Receipt status is unavailable.'); } }
      inFlight=false;
      if (!controller.signal.aborted) timer = setTimeout(update, 5000);
    }
    const unsubscribe=subscribeRealtime(()=>{void update();});void update(); return () => { unsubscribe();controller.abort(); clearTimeout(timer); };
  }, [paymentId]);
  return <main className="mx-auto max-w-3xl px-6 py-16">
    <Link href="/" className="text-sm underline">Countersign</Link>
    <p className="mt-10 text-sm uppercase tracking-widest">Whitechain Sepolia · testnet</p>
    <h1 className="mt-3 font-serif text-4xl">Payment receipt</h1>
    <p className="mt-4 break-all text-sm text-neutral-600">{paymentId}</p>
    <div aria-live="polite" className="mt-8 rounded-2xl border border-neutral-300 bg-white/70 p-6">
      {!receipt ? <p role="status">{message}</p> : <>
        <p className="text-3xl font-semibold">{amount(receipt.amount, receipt.decimals)} USDT</p>
        <p className="mt-2">{({ settled: 'Payment confirmed', partially_refunded: 'Partially refunded', refunded: 'Fully refunded' } as Record<string, string>)[receipt.status]}</p>
        <dl className="mt-6 grid gap-4 text-sm">
          <div><dt className="text-neutral-500">Refunded</dt><dd>{amount(receipt.refunded, receipt.decimals)} USDT</dd></div>
          <div><dt className="text-neutral-500">Payer mandate</dt><dd className="break-all">{receipt.mandateId}</dd></div>
          <div><dt className="text-neutral-500">Merchant</dt><dd className="break-all">{receipt.merchantId}</dd></div>
          <div><dt className="text-neutral-500">Payout wallet</dt><dd className="break-all"><a className="underline" href={`https://explorer.testnet.whitechain.io/address/${receipt.payout}`} target="_blank" rel="noopener noreferrer">{receipt.payout}</a></dd></div>
          <div><dt className="text-neutral-500">Human approval recorded by contract</dt><dd>{receipt.humanApproved ? 'Yes' : 'No: automatic payment'}</dd></div>
        </dl>
        <a className="mt-6 inline-block underline" href={`https://explorer.testnet.whitechain.io/tx/${receipt.txHash}`} target="_blank" rel="noopener noreferrer">View settlement transaction ↗</a>
        <p className="mt-4 text-xs text-neutral-500">Last checked {new Date(receipt.checkedAt).toLocaleTimeString()}. Refreshes every five seconds.</p>
      </>}
    </div>
    <p className="mt-6 text-sm text-neutral-600">Receipts require confirmed contract events and matching transaction data. Testnet tokens have no monetary value.</p>
  </main>;
}
