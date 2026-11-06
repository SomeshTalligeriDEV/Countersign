// Read-only ENS (Sepolia) policy lookup. ENS is the identity/policy layer; Whitechain does not read it.
import { readAgentPolicy, sepoliaClient } from '../../../../../../../packages/ens/src/index.mjs';

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(name) || name.length > 255) return Response.json({ error: 'Invalid ENS name.' }, { status: 400, headers });
  try {
    const policy = await readAgentPolicy(sepoliaClient(process.env.ENS_SEPOLIA_RPC_URL || undefined), name);
    return Response.json({ mode: 'live', network: 'sepolia', ...policy, checkedAt: new Date().toISOString() }, { headers });
  } catch {
    return Response.json({ error: 'Cannot read ENS on Sepolia right now. No identity is being assumed.' }, { status: 503, headers });
  }
}
