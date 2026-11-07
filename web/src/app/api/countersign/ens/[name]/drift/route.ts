// Read-only ENS (Sepolia) vs Whitechain Mandate drift check. Fails closed: an unreadable side yields MISSING, never MATCH.
import { driftCheck, readAgentPolicy, sepoliaClient } from '../../../../../../../../packages/ens/src/index.mjs';
import { forwardHeaders } from '@/lib/countersign-forward';

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(name) || name.length > 255) return Response.json({ error: 'Invalid ENS name.' }, { status: 400, headers });
  const ens = await readAgentPolicy(sepoliaClient(process.env.ENS_SEPOLIA_RPC_URL || undefined), name).catch(() => null);
  const query = new URL(request.url).searchParams.get('mandate');
  const raw = ens?.mandate?.mandateId ?? query;
  const id = typeof raw === 'string' && /^0x[\da-fA-F]{64}$/.test(raw) ? raw : null; // ENS text is untrusted: validate before building the API path
  let chain = null;
  if (id && process.env.COUNTERSIGN_API_URL) {
    try {
      const r = await fetch(new URL(`/v1/mandates/${id}`, process.env.COUNTERSIGN_API_URL), { headers: forwardHeaders(request), cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(30000) });
      const d = r.ok ? await r.json() : null;
      if (d?.chainId === 1874 && d.mandateId?.toLowerCase() === id.toLowerCase()) chain = d;
    } catch { chain = null; }
  }
  return Response.json({ ensRead: !!ens, chainRead: !!chain, rows: driftCheck(ens, chain), checkedAt: new Date().toISOString() }, { headers });
}
