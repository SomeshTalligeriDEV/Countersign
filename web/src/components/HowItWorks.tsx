const steps: { step: string; title: string; body: string; quote?: string; reply?: string; result?: string }[] = [
  {
    "step": "Step 1 of 3",
    "title": "Set the mandate",
    "body": "The owner configures an agent, merchants, limits and a limited treasury allowance.",
    "quote": "Owner remains the treasury"
  },
  {
    "step": "Step 2 of 3",
    "title": "Sign the exact intent",
    "body": "The agent signs the merchant terms. Larger payments require the owner and a human-verification attestor.",
    "quote": "No unsigned changes"
  },
  {
    "step": "Step 3 of 3",
    "title": "Verify settlement",
    "body": "The intended relayer simulates before broadcasting. Only confirmed chain events will count as settled.",
    "quote": "An explorer receipt, not a client callback"
  }
];

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-center text-sm font-medium text-violet-500">● How it works</p>
      <h2 className="mx-auto mt-3 max-w-2xl text-center text-4xl font-bold sm:text-5xl">
        From mandate to receipt.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-center text-black/60">
        The designed payment journey. Live end-to-end settlement is still under construction.
      </p>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.step} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium text-black/40">{s.step}</p>
            <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-black/60">{s.body}</p>
            {s.quote && (
              <p className="mt-4 rounded-xl bg-[#faf7f0] p-3 font-serif italic">&ldquo;{s.quote}&rdquo;</p>
            )}
            {s.reply && (
              <p className="mt-2 inline-block rounded-full bg-black px-3 py-1 text-xs text-white">{s.reply}</p>
            )}
            {s.result && <p className="mt-2 text-sm text-green-700">{s.result}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
