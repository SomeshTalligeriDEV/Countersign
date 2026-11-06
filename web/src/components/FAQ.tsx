"use client";
import { useState } from "react";

const faqs = [
  {
    "q": "Is the application live?",
    "a": "This is a development preview. Contract deployment, World approval and wallet onboarding are not yet complete. The network check uses real responses and reports failures explicitly."
  },
  {
    "q": "Where do funds live?",
    "a": "The design keeps funds in the owner treasury. The contract transfers only within the allowance and mandate limits."
  },
  {
    "q": "Does this prevent prompt injection?",
    "a": "No. Contract limits are intended to bound spending even when the agent receives malicious instructions."
  },
  {
    "q": "Can I use an embedded or hardware wallet?",
    "a": "Both are intended onboarding paths, but wallet integration and device testing are still pending. No universal wallet compatibility is claimed."
  }
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <h2 className="text-5xl font-bold text-black/80">Good to know</h2>
      </div>
      <div className="mt-10 divide-y divide-black/10 border-t border-black/10">
        {faqs.map((f, i) => (
          <div key={f.q}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="flex w-full items-center justify-between py-5 text-left font-medium"
            >
              {f.q}
              <span className="text-xl">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p className="pb-5 text-black/60">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
