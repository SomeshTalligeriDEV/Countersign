import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Payment receipt', robots: { index: false, follow: false } };
import { Suspense } from 'react';
import ReceiptView from '@/components/countersign/ReceiptView';
import EnsIdentity from '@/components/countersign/EnsIdentity';

// params is runtime data under Cache Components; read it inside Suspense so the shell prerenders.
async function Receipt({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  if (!/^0x[\da-fA-F]{64}$/.test(paymentId)) return <main className="mx-auto max-w-3xl p-12"><h1 className="text-3xl">Invalid payment ID</h1><p className="mt-4">Use the receipt link returned by your payment.</p></main>;
  return <><ReceiptView paymentId={paymentId} /><div className="cs-comic mx-auto max-w-3xl px-6 pb-16"><EnsIdentity /></div></>;
}

export default function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl p-12">Loading receipt…</main>}>
      <Receipt params={params} />
    </Suspense>
  );
}
