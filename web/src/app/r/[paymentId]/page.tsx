import ReceiptView from '@/components/countersign/ReceiptView';
export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  if (!/^0x[\da-fA-F]{64}$/.test(paymentId)) return <main className="mx-auto max-w-3xl p-12"><h1 className="text-3xl">Invalid payment ID</h1><p className="mt-4">Use the receipt link returned by your payment.</p></main>;
  return <ReceiptView paymentId={paymentId} />;
}
