"use client";
import { useState } from "react";

const tabs = [
  {
    "label": "Agent payment",
    "caller": "Protocol walkthrough",
    "meta": "Design explanation \u2014 not a transaction result",
    "heading": "Within the mandate",
    "lines": [
      "Merchant issues payment terms",
      "Agent signs the intent",
      "Contract checks caps and signatures",
      "Observer confirms settlement after execution"
    ]
  },
  {
    "label": "Human approval",
    "caller": "Protocol walkthrough",
    "meta": "Design explanation \u2014 not a transaction result",
    "heading": "Above the threshold",
    "lines": [
      "Owner reviews exact terms",
      "Fresh World verification is required",
      "Owner signs the approval digest",
      "Both signatures must verify"
    ]
  },
  {
    "label": "Revocation",
    "caller": "Protocol walkthrough",
    "meta": "Design explanation \u2014 not a transaction result",
    "heading": "Invalidate older authorizations",
    "lines": [
      "Owner submits revoke",
      "Epoch changes when the transaction executes",
      "Older signatures become invalid",
      "Previously settled payments remain final"
    ]
  }
];

export default function SeeItWork() {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  return (
    <section id="demo" className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-sm font-medium text-violet-500">● See it work</p>
      <h2 className="mt-3 max-w-xl text-4xl font-bold sm:text-5xl">One payment. Explicit authority.</h2>
      <p className="mt-4 max-w-md text-black/60">
        Explore the intended protocol. These explanations do not represent executed payments.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              i === active ? "bg-black text-white" : "border border-black/10 text-black/70 hover:bg-black/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium text-black/40">{tab.caller}</p>
        <p className="mt-1 text-sm text-black/40">{tab.meta}</p>
        <p className="mt-4 text-xl font-semibold">{tab.heading}</p>
        <div className="mt-4 space-y-2 font-mono text-sm text-black/70">
          {tab.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
