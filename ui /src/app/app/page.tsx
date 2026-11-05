"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bizGuard, type Quote, type Order, type Rules, type ConfirmReply } from "@/lib/bizGuard";
import Ghost from "@/components/Ghost";
import DepositCard from "@/components/DepositCard";

export default function App() {
  const router = useRouter();
  const [user, setUser] = useState<string | null | "loading">("loading");
  const [balance, setBalance] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmReply | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rules, setRules] = useState<Rules | null>(null);
  const [blockInput, setBlockInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(({ user }: { user: string | null }) => {
        if (!user) {
          router.replace("/login");
          return;
        }
        setUser(user);
        refresh();
      });
  }, [router]);

  async function refresh() {
    const [b, o, r] = await Promise.all([bizGuard.balance(), bizGuard.orders(), bizGuard.rules()]);
    if (b.error || o.error || r.error) setConfigured(false);
    if (!b.error) setBalance(b.balance_inr);
    if (!o.error) setOrders(o.orders ?? []);
    if (!r.error) setRules(r);
  }

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setConfirmResult(null);
    const res = await bizGuard.chat(text);
    setBusy(false);
    if (res.error) {
      setConfigured(false);
      return;
    }
    setReply(res.reply);
    setQuote(res.quote ?? null);
    setText("");
    if (res.purchase) refresh();
  }

  async function confirm() {
    setBusy(true);
    const res = await bizGuard.confirm();
    setBusy(false);
    setConfirmResult(res);
    setQuote(null);
    refresh();
  }

  async function cancel() {
    await bizGuard.cancel();
    setQuote(null);
    setConfirmResult({ status: "ok", say: "Cancelled." });
  }

  async function saveRules(patch: Partial<{ auto_under_inr: number; daily_cap_inr: number; block: string; unblock: string }>) {
    const r = await bizGuard.rules(patch);
    if (!r.error) setRules(r);
  }

  async function blockBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!blockInput.trim()) return;
    await saveRules({ block: blockInput.trim() });
    setBlockInput("");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (user === "loading" || !user) return null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Ghost size={28} className="pointer-events-none" /> biz
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-black/40">{user}</span>
          <button onClick={signOut} className="text-sm text-black/50 hover:text-black">
            Sign out
          </button>
        </div>
      </div>

      {!configured && (
        <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Biz Buddy&apos;s wallet backend isn&apos;t connected yet. Set <code>CHUPKE_API_URL</code> and{" "}
          <code>CHUPKE_API_KEY</code> in <code>.env.local</code>, run <code>python -m chupke.api</code>, and
          reload.
        </p>
      )}

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5">
        <div>
          <p className="text-xs text-black/40">Balance</p>
          <p className="text-2xl font-semibold">{balance !== null ? `₹${balance}` : "—"}</p>
        </div>
        <Ghost size={56} />
      </div>

      <DepositCard />

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <p className="text-xs font-medium text-black/40">Say what you need</p>
        <div className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Rs 500 Swiggy card"
            className="w-full rounded-full border border-black/10 px-4 py-2 text-sm outline-none focus:border-black"
          />
          <button
            onClick={send}
            disabled={busy}
            className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Say it
          </button>
        </div>

        {reply && <p className="mt-3 rounded-xl bg-[#faf7f0] p-3 text-sm">{reply}</p>}

        {quote && quote.decision === "ask" && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-black/10 p-3">
            <span className="text-sm">{quote.card}</span>
            <div className="flex gap-2">
              <button onClick={confirm} className="rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white">
                Yes, book it
              </button>
              <button onClick={cancel} className="rounded-full border border-black/10 px-3 py-1.5 text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}

        {confirmResult && (
          <div
            className={`mt-3 rounded-xl p-3 text-sm ${
              confirmResult.status === "ok"
                ? "bg-green-50 text-green-700"
                : confirmResult.status === "cooling"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-red-50 text-red-700"
            }`}
          >
            <p>{confirmResult.say ?? confirmResult.reason ?? confirmResult.status}</p>
            {confirmResult.status === "cooling" && confirmResult.minutes_left != null && (
              <p className="mt-1 text-xs">
                Safety pause: try again in {confirmResult.minutes_left} minute
                {confirmResult.minutes_left === 1 ? "" : "s"}.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <p className="text-xs font-medium text-black/40">Rules</p>
        {rules ? (
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              Auto-buy under ₹
              <input
                type="number"
                defaultValue={rules.auto_under_inr}
                onBlur={(e) => saveRules({ auto_under_inr: Number(e.target.value) })}
                className="rounded-lg border border-black/10 px-3 py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1">
              Daily cap ₹
              <input
                type="number"
                defaultValue={rules.daily_cap_inr}
                onBlur={(e) => saveRules({ daily_cap_inr: Number(e.target.value) })}
                className="rounded-lg border border-black/10 px-3 py-1.5"
              />
            </label>
            <div className="col-span-2">
              <p className="mb-1 text-xs text-black/40">Blocked brands</p>
              <div className="flex flex-wrap gap-2">
                {rules.blocked_brands.length === 0 && <span className="text-black/30">None</span>}
                {rules.blocked_brands.map((b) => (
                  <button
                    key={b}
                    onClick={() => saveRules({ unblock: b })}
                    className="group flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs text-red-700"
                    title="Click to unblock"
                  >
                    {b} <span className="text-red-400 group-hover:text-red-700">×</span>
                  </button>
                ))}
              </div>
              <form onSubmit={blockBrand} className="mt-2 flex gap-2">
                <input
                  value={blockInput}
                  onChange={(e) => setBlockInput(e.target.value)}
                  placeholder="e.g. apple"
                  className="w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm"
                />
                <button type="submit" className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium">
                  Block
                </button>
              </form>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-black/40">—</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <p className="text-xs font-medium text-black/40">Recent orders</p>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-black/40">No orders yet.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {orders.map((o) => (
              <li key={o.invoice_id} className="flex justify-between">
                <span>{o.product_id ?? o.invoice_id}</span>
                <span className="text-black/50">{o.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
