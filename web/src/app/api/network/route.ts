export async function GET() {
  const base = process.env.COUNTERSIGN_API_URL;
  if (!base) return Response.json({ error: "Network service is not configured yet." }, { status: 503 });
  try {
    const response = await fetch(new URL("/v1/network", base), { cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error("unavailable");
    const data = await response.json();
    if (data.chainId !== 1874 || !/^\d+$/.test(data.block) || !Number.isInteger(data.tokenDecimals) || !Number.isFinite(Date.parse(data.checkedAt))) throw new Error("invalid_response");
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Cannot reach Whitechain right now. Try again." }, { status: 503 }); }
}
