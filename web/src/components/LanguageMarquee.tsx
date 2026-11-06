const phrases = [
  {
    "lang": "Owner",
    "text": "Sets the boundaries"
  },
  {
    "lang": "Agent",
    "text": "Signs the intent"
  },
  {
    "lang": "Merchant",
    "text": "Provides the terms"
  },
  {
    "lang": "Contract",
    "text": "Enforces the policy"
  },
  {
    "lang": "Observer",
    "text": "Confirms settlement"
  }
];

export default function LanguageMarquee() {
  const row = [...phrases, ...phrases];
  return (
    <section className="bg-black py-16 text-white">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Every party has a clear role</h2>
        <p className="mt-3 text-white/60">
          A shared authorization record across owner, agent and merchant.
        </p>
      </div>
      <div className="mt-10 space-y-4 overflow-hidden">
        <div className="animate-marquee flex w-max gap-4 px-4">
          {row.map((p, i) => (
            <span key={i} className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{p.lang}</span>
              {p.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
