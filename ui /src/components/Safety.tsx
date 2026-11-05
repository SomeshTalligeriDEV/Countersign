const cards = [
  {
    "icon": "\u2194",
    "title": "Exact payment terms",
    "body": "Intent signatures bind the amount and payout.",
    "points": [
      "Merchant registry version",
      "Deadline and nonce",
      "Authorization epoch"
    ]
  },
  {
    "icon": "\u25ce",
    "title": "Bounded treasury access",
    "body": "Contract source enforces caps; execution tests remain pending.",
    "points": [
      "Owner is the treasury",
      "Limited token allowance",
      "Period spending never resets on policy edits"
    ]
  },
  {
    "icon": "\u2299",
    "title": "Explicit trust boundaries",
    "body": "Testnet development. Not audited or production-ready.",
    "points": [
      "Owner and attestor signatures",
      "Public payment amounts",
      "No guaranteed protection from compromised keys"
    ]
  }
];

export default function Safety() {
  return (
    <section id="safety" className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-sm font-medium text-violet-500">Safety</p>
      <h2 className="mt-3 max-w-xl text-4xl font-bold sm:text-5xl">Careful by default.</h2>
      <p className="mt-4 max-w-md text-black/60">
        Security claims must be backed by tests and verified deployments. Those release gates are still in progress.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-lg">
              {c.icon}
            </div>
            <h3 className="mt-4 text-xl font-semibold">{c.title}</h3>
            <p className="mt-2 text-sm text-black/60">{c.body}</p>
            <ul className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm text-black/70">
              {c.points.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
