"use client";
import { useState } from "react";
export default function TryIt() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Check Whitechain connectivity. This does not send a transaction.");
  async function check() {
    setLoading(true);
    try {
      const response = await fetch("/api/network", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Network check unavailable. Try again.");
      setMessage(`Whitechain ${data.chainId} · block ${data.block} · USDT decimals ${data.tokenDecimals}. Checked ${new Date(data.checkedAt).toLocaleTimeString()}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Network unavailable. Try again."); }
    finally { setLoading(false); }
  }
  return <div id="network" className="mx-auto mt-10 max-w-md scroll-mt-24 rounded-2xl border border-black/10 bg-white p-5 text-left shadow-sm">
    <h2 className="text-sm font-semibold">Live network check</h2>
    <p role="status" aria-live="polite" className="mt-3 min-h-16 text-sm text-black/70">{loading ? "Checking the chain and official USDT contract…" : message}</p>
    <button onClick={check} disabled={loading} className="mt-4 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-50">{loading ? "Checking…" : "Check network"}</button>
  </div>;
}
