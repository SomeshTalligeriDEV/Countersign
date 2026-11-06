const apps = [
  {
    "name": "Spending caps",
    "letter": "S",
    "color": "bg-black text-white"
  },
  {
    "name": "Signed intents",
    "letter": "S",
    "color": "bg-black text-white"
  },
  {
    "name": "Merchant allowlist",
    "letter": "M",
    "color": "bg-black text-white"
  },
  {
    "name": "Human approvals",
    "letter": "H",
    "color": "bg-black text-white"
  },
  {
    "name": "Revocation",
    "letter": "R",
    "color": "bg-black text-white"
  },
  {
    "name": "Verifiable receipts",
    "letter": "V",
    "color": "bg-black text-white"
  }
];

export default function LogoMarquee() {
  const row = [...apps, ...apps];
  return (
    <section className="border-y border-black/5 bg-white py-10">
      <p className="mb-6 text-center text-sm text-black/50">The Countersign protocol design</p>
      <div className="overflow-hidden">
        <div className="animate-marquee flex w-max gap-4 px-4">
          {row.map((a, i) => (
            <div
              key={i}
              className="flex shrink-0 items-center gap-2 rounded-full border border-black/5 bg-[#faf7f0] px-4 py-2 text-sm font-medium"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${a.color}`}>
                {a.letter}
              </span>
              {a.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
