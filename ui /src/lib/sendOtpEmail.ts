// ponytail: Resend only — swap providers here if needed, no abstraction for one implementation.
// No-ops (returns false) when RESEND_API_KEY isn't set, so this is safe to
// call unconditionally; callers fall back to dev-mode delivery.
export async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Biz Buddy <onboarding@resend.dev>",
      to: [email],
      subject: "Your Biz Buddy code",
      text: `Your code is ${code}. It expires in 10 minutes.`,
    }),
  });
  return res.ok;
}
