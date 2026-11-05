import Ghost from "./Ghost";
import TryIt from "./TryIt";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-6 pt-20 pb-24 text-center">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] opacity-60 blur-2xl"
        style={{
          background:
            "repeating-linear-gradient(90deg, #c4b5fd 0 40px, #fbcfe8 40px 80px, #bfdbfe 80px 120px, #faf7f0 120px 160px)",
        }}
      />
      <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-xs">
        <span className="rounded-full bg-black px-2 py-0.5 text-white">Testnet preview</span>
        <span className="text-black/60">Integration in progress</span>
      </div>

      <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
        Let agents act.
        <br />
        Keep spending{" "}
        <span
          className="bg-gradient-to-r from-violet-500 via-fuchsia-400 to-orange-400 bg-clip-text font-serif italic text-transparent"
        >
          bounded.
        </span>
      </h1>

      <p className="mx-auto mt-6 max-w-xl text-lg text-black/60">
        Countersign is being built to enforce agent spending limits onchain, with human approval bound to the exact payment terms.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href="#network" className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-black/80">
          Check network →
        </a>
        <a
          href="#how"
          className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-medium hover:bg-black/5"
        >
          Explore the payment flow
        </a>
      </div>

      <div className="relative mx-auto mt-16 flex max-w-4xl items-center justify-center gap-4">
        <CallCard
          title="Payment policy"
          line="Limit each payment"
          result="Contract rule"
          className="hidden sm:block"
        />
        <div className="flex flex-col items-center gap-3">
          <Ghost size={220} />
          <span className="text-sm text-black/40">Your agent. Your boundaries.</span>
        </div>
        <CallCard
          title="Payment policy"
          line="Approve the exact terms"
          result="Owner + human verification"
          className="hidden sm:block"
        />
      </div>

      <TryIt />
    </section>
  );
}

function CallCard({
  title,
  line,
  result,
  className = "",
}: {
  title: string;
  line: string;
  result: string;
  className?: string;
}) {
  return (
    <div className={`w-56 rounded-3xl border border-black/5 bg-white p-5 text-left shadow-sm ${className}`}>
      <p className="text-xs font-medium text-black/40">{title}</p>
      <p className="mt-3 text-base font-medium">&ldquo;{line}&rdquo;</p>
      <p className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
        {result}
      </p>
    </div>
  );
}
