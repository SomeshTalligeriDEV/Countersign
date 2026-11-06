"use client";
import { useState } from "react";

const items = [
  {
    "label": "Set spending boundaries",
    "quote": "Give the agent a budget, not a treasury key.",
    "body": "The Mandate source enforces per-payment and period limits. Contract verification is still pending."
  },
  {
    "label": "Bind the payment terms",
    "quote": "Approve this merchant, this payout, this amount.",
    "body": "Signed intents include the order, resource, payout version, deadline and authorization epoch."
  },
  {
    "label": "Keep humans in control",
    "quote": "Escalate payments above my threshold.",
    "body": "The planned approval flow combines an owner wallet signature with a fresh World sign-in. World integration is not live yet."
  },
  {
    "label": "Revoke authorization",
    "quote": "Invalidate older payment signatures.",
    "body": "An executed revoke transaction increments the mandate epoch. It cannot undo a payment that already settled."
  }
];

export default function WhatItDoes() {
  const [open, setOpen] = useState(3);
  return (
    <section id="uses" className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-sm font-medium text-violet-500">● What it does</p>
      <h2 className="mt-3 max-w-xl text-4xl font-bold sm:text-5xl">
        A clear boundary for every payment.
      </h2>

      <div className="mt-10 divide-y divide-black/10 border-t border-black/10">
        {items.map((item, i) => (
          <div key={item.label}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="flex w-full items-center justify-between py-6 text-left"
            >
              <span className="flex items-baseline gap-4">
                <span className="text-xs text-black/40">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-2xl font-medium">{item.label}</span>
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-lg">
                {open === i ? "×" : "+"}
              </span>
            </button>
            {open === i && (
              <div className="pb-6 pl-10">
                <p className="font-serif text-xl italic">&ldquo;{item.quote}&rdquo;</p>
                <p className="mt-2 text-black/60">{item.body}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
