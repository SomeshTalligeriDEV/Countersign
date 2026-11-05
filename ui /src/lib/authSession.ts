import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// ponytail: HMAC-signed cookie, not a real OTP/OAuth flow — upgrade when
// chupke gets a real auth step. Still prevents a client from naming any
// user id it wants, which is the actual IDOR this closes.
const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
const COOKIE = "biz_session";

function sign(email: string) {
  return createHmac("sha256", SECRET).update(email).digest("hex");
}

export async function createSession(email: string) {
  const sig = sign(email);
  const store = await cookies();
  store.set(COOKIE, `${email}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionUser(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const email = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(email);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return email;
}
