import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "./authSession";

// Server-side proxy to the chupke wallet API. Two things never cross this
// boundary from the client: the API key (stays in env, never sent to the
// browser) and the user id (derived from the signed session cookie, never
// trusted from the request body — a client-supplied `user` would let anyone
// operate anyone else's wallet through the shared API key).
const BASE = process.env.CHUPKE_API_URL;
const KEY = process.env.CHUPKE_API_KEY;

export async function proxyToChupke(req: NextRequest, path: string) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!BASE || !KEY) {
    return NextResponse.json(
      { error: "Biz Buddy backend not configured. Set CHUPKE_API_URL and CHUPKE_API_KEY." },
      { status: 503 }
    );
  }
  const clientBody = await req.json().catch(() => ({}));
  const { user: _ignoredClientUser, ...rest } = clientBody;
  void _ignoredClientUser;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ ...rest, user }),
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: { "content-type": "application/json" } });
}
