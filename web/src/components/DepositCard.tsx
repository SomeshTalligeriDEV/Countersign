"use client";
import { useState } from "react";
import { bizGuard } from "@/lib/bizGuard";

export default function DepositCard() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ address: string; memo: string; zcash_uri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setOpen(true);
    const res = await bizGuard.deposit();
    if (res.error) {
      setError(res.error);
      return;
    }
    setData(res);
  }

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-black/40">Add funds</p>
        {!open && (
          <button onClick={load} className="rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white">
            Show deposit address
          </button>
        )}
      </div>
      {open && error && <p className="mt-2 text-sm text-amber-700">{error}</p>}
      {open && data && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-black/60">Send shielded testnet ZEC to:</p>
          <p className="break-all rounded-lg bg-[#faf7f0] p-2 font-mono text-xs">{data.address}</p>
          <p className="text-black/60">
            with memo <span className="font-mono">{data.memo}</span>
          </p>
          <a href={data.zcash_uri} className="inline-block text-xs text-violet-600 underline">
            Open in a Zcash wallet
          </a>
        </div>
      )}
    </div>
  );
}
