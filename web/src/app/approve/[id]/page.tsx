import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Approve payment', robots: { index: false, follow: false } };
import { Suspense } from 'react';
import ApprovalView from '@/components/countersign/ApprovalView';

// params is runtime data under Cache Components; read it inside Suspense so the shell prerenders.
async function Approval({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return <main className="p-12">Invalid approval ID.</main>;
  return <ApprovalView id={id} />;
}

export default function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="p-12">Loading approval…</main>}>
      <Approval params={params} />
    </Suspense>
  );
}
