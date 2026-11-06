import Link from "next/link";

// Countersign landing, written from scratch (F5). Same plain style as /owner, /merchant, /demo.
const routes = [
  { href: "/owner", title: "Owner console", body: "Connect the owner wallet, set mandate limits, pause, unpause or revoke the agent." },
  { href: "/merchant", title: "Merchant registry", body: "Look up a merchant ID and check its registration before accepting agent payments." },
  { href: "/demo", title: "Live demo", body: "Run the testnet agent: in-limit buys, over-limit rejections, human approvals and replays." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-semibold">Countersign</p>
      <h1 className="mt-10 font-serif text-4xl">Bounded payments for AI agents</h1>
      <p className="mt-4">
        An agent can spend only inside limits enforced by a contract. Anything outside them needs the owner to sign
        the exact payment. Testnet development preview.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {routes.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="block h-full rounded-xl border p-5 hover:bg-black/5">
              <span className="font-serif text-xl underline">{r.title}</span>
              <span className="mt-2 block text-sm">{r.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
