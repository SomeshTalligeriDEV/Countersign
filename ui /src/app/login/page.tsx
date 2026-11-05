"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setDevCode(data.devCode ?? null);
    setEmailed(Boolean(data.emailed));
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Invalid code");
      return;
    }
    router.push("/app");
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <span className="text-xl">👻</span> biz
      </Link>
      <h1 className="mt-20 font-serif text-4xl italic">Sign in to Biz Buddy</h1>

      {step === "email" ? (
        <>
          <p className="mt-3 text-black/60">
            Enter your email. If you&apos;re approved we&apos;ll send a code; if not, we&apos;ll add you to the
            list.
          </p>
          <form className="mt-8" onSubmit={requestCode}>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-black/20 px-4 py-3 outline-none focus:border-black"
            />
            <button
              type="submit"
              disabled={!email || busy}
              className="mt-4 w-full rounded-full bg-black px-5 py-3 text-sm font-medium text-white disabled:bg-black/20"
            >
              Continue
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-3 text-black/60">
            {emailed
              ? <>We emailed a 6-digit code to <span className="font-medium text-black">{email}</span>.</>
              : <>A 6-digit code was generated for <span className="font-medium text-black">{email}</span>, but no email was sent.</>}
          </p>
          {devCode && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              Dev mode: your code is <span className="font-mono">{devCode}</span>.
            </p>
          )}
          <form className="mt-6" onSubmit={verify}>
            <label className="text-sm font-medium">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              className="mt-2 w-full rounded-xl border border-black/20 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-black"
            />
            <button
              type="submit"
              disabled={!code || busy}
              className="mt-4 w-full rounded-full bg-black px-5 py-3 text-sm font-medium text-white disabled:bg-black/20"
            >
              Verify
            </button>
          </form>
          <button
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="mt-3 text-sm text-black/50 hover:text-black"
          >
            Use a different email
          </button>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}
