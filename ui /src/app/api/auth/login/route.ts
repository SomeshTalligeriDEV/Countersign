import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { issueCode } from "@/lib/otpStore";
import { sendOtpEmail } from "@/lib/sendOtpEmail";

// Step 1 of 2: prove nothing yet, just issue a one-time code to the email.
// No session is created here — that only happens in /api/auth/verify after
// the caller proves they received the code.
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({ email: "" }));
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();
  let code: string;
  try {
    code = issueCode(normalized);
  } catch {
    return NextResponse.json({ error: "too many attempts, try again later" }, { status: 429 });
  }

  const emailed = await sendOtpEmail(normalized, code);

  // The code is only ever surfaced in logs/response when BIZ_DEV_OTP=1 is
  // explicitly set — never log a raw code unconditionally, it's a
  // credential. Without the flag and without RESEND_API_KEY, codes aren't
  // delivered anywhere, which is intentional: safer than leaking them.
  const devMode = process.env.BIZ_DEV_OTP === "1";
  if (devMode) {
    console.log(`[biz auth] dev code for ${normalized}: ${code}`);
  } else {
    const hashed = createHash("sha256").update(normalized).digest("hex").slice(0, 12);
    console.log(`[biz auth] code issued for ${hashed}, emailed=${emailed}`);
  }

  return NextResponse.json({ ok: true, emailed, devCode: devMode ? code : undefined });
}
