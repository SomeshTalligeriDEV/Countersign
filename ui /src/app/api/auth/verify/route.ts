import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/otpStore";
import { createSession } from "@/lib/authSession";

// Step 2 of 2: only here, after the code checks out, does a session exist.
export async function POST(req: NextRequest) {
  const { email, code } = await req.json().catch(() => ({ email: "", code: "" }));
  if (!email || !code) {
    return NextResponse.json({ error: "email and code required" }, { status: 400 });
  }
  const normalized = String(email).trim().toLowerCase();
  if (!verifyCode(normalized, String(code))) {
    return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });
  }
  await createSession(normalized);
  return NextResponse.json({ ok: true });
}
