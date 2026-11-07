import { forwardHeaders } from '@/lib/countersign-forward';
export async function GET(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^0x[\da-fA-F]{64}$/.test(paymentId)) return Response.json({ error: 'Invalid payment ID.' }, { status: 400, headers });
  const base = process.env.COUNTERSIGN_API_URL;
  if (!base) return Response.json({ error: 'Receipt service is not configured.' }, { status: 503, headers });
  try {
    const [receipt, network] = await Promise.all([
      fetch(new URL(`/v1/payments/${paymentId}`, base), { headers: forwardHeaders(request), cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(10000) }),
      fetch(new URL('/v1/network', base), { headers: forwardHeaders(request), cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(10000) }),
    ]);
    if (receipt.status === 404) return Response.json({ error: 'No confirmed receipt yet. A payment may be pending or this ID may be unknown.' }, { status: 404, headers });
    if (!receipt.ok || !network.ok) throw new Error('unavailable');
    const data = await receipt.json(), state = await network.json();
    if (state.chainId !== 1874 || state.observer?.state !== 'current' || !Number.isInteger(state.tokenDecimals) || state.tokenDecimals < 0 || state.tokenDecimals > 255) throw new Error('invalid_network');
    if (data.paymentId?.toLowerCase() !== paymentId.toLowerCase() || !/^0x[\da-fA-F]{64}$/.test(data.txHash) || !/^(0|[1-9]\d{0,77})$/.test(data.amount) || !/^(0|[1-9]\d{0,77})$/.test(data.refunded) || !['settled', 'partially_refunded', 'refunded'].includes(data.status) || typeof data.humanApproved !== 'boolean') throw new Error('invalid_receipt');
    for (const key of ['mandateId', 'merchantId']) if (!/^0x[\da-fA-F]{64}$/.test(data[key])) throw new Error('invalid_receipt');
    if (!/^0x[\da-fA-F]{40}$/.test(data.payout)) throw new Error('invalid_receipt');
    return Response.json({ paymentId: data.paymentId, amount: data.amount, refunded: data.refunded, decimals: state.tokenDecimals, status: data.status, mandateId: data.mandateId, merchantId: data.merchantId, payout: data.payout, humanApproved: data.humanApproved, txHash: data.txHash, checkedAt: new Date().toISOString() }, { headers });
  } catch { return Response.json({ error: 'Cannot verify this receipt right now. No settlement status is being assumed.' }, { status: 503, headers }); }
}
