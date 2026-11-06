export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: 'Invalid approval ID.' }, { status: 400, headers });
  const base = process.env.COUNTERSIGN_API_URL;
  if (!base) return Response.json({ error: 'Approval service is not configured.' }, { status: 503, headers });
  try {
    const result = await fetch(new URL(`/v1/approvals/${id}/terms`, base), { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!result.ok) return Response.json({ error: result.status === 404 ? 'Approval not found.' : 'Approval verification is currently unavailable.' }, { status: result.status === 404 ? 404 : 503, headers });
    const data = await result.json();
    if (data.approvalId !== id || !Number.isSafeInteger(data.expiresAt) || typeof data.status !== 'string' || !/^0x[\da-fA-F]{64}$/.test(data.approvalDigest) || !/^0x[\da-fA-F]{40}$/.test(data.intent?.payout) || !/^\d+$/.test(data.intent?.amount)) throw new Error('invalid_terms');
    const network = await fetch(new URL('/v1/network', base), { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!network.ok) throw new Error('network_unavailable');
    const state = await network.json();
    if (state.chainId !== 1874 || !Number.isInteger(state.tokenDecimals) || state.tokenDecimals < 0 || state.tokenDecimals > 255) throw new Error('invalid_decimals');
    const digits = data.intent.amount.padStart(state.tokenDecimals + 1, '0');
    const fraction = state.tokenDecimals ? digits.slice(-state.tokenDecimals).replace(/0+$/, '') : '';
    const formattedAmount = state.tokenDecimals ? digits.slice(0, -state.tokenDecimals) + (fraction ? `.${fraction}` : '') : digits;
    const policyResponse = await fetch(new URL(`/v1/mandates/${data.intent.mandateId}`, base), { cache:'no-store', redirect:'error', signal:AbortSignal.timeout(10000) });
    if(!policyResponse.ok)throw new Error('policy_unavailable');const policy=await policyResponse.json();
    if(!/^0x[\da-fA-F]{40}$/.test(policy.owner)||data.typedData?.domain?.chainId!==1874)throw new Error('invalid_policy');
    const start=new URL('/auth/world/start',process.env.COUNTERSIGN_PUBLIC_API_URL??base);start.searchParams.set('approvalId',id);
    return Response.json({ owner:policy.owner,typedData:data.typedData,worldStartUrl:start.href,formattedAmount, approvalId: id, status: data.status, expiresAt: data.expiresAt, approvalDigest: data.approvalDigest, intent: data.intent }, { headers });
  } catch { return Response.json({ error: 'Cannot retrieve verified approval terms. Please try again.' }, { status: 503, headers }); }
}
