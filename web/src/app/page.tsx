import Link from "next/link";
import LiveStatus from "@/components/countersign/LiveStatus";
import { SITE_URL } from "@/lib/site";

// Countersign landing. Dark surface scoped to .cs-landing so /owner, /merchant, /demo keep the paper theme.
const GITHUB = "https://github.com/SomeshTalligeriDEV/ETHGLOBAL";
const EXPLORER = "https://explorer.testnet.whitechain.io";
const MANDATE = "0x923298375911A173da34C715da2718c0c9889EbA";
const REGISTRY = "0x2686f693A2C959568e650e0A5563E6244f2329E2";
const APPROVED_TX = "0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531";
const ENS_NAME = "agent1.countersign.eth";
const ENS_URL = `https://sepolia.app.ens.domains/${ENS_NAME}`;

const steps = [
  { t: "Owner sets the mandate", b: "Budget, per-payment cap, allowed merchants and an approval threshold, written on-chain from the owner console." },
  { t: "Agent signs exact terms", b: "The agent signs the precise amount, merchant and payout. Nothing is left for a relayer to fill in." },
  { t: "Relayer + GasGuard submit", b: "A relayer pays gas and forwards the signed payment; GasGuard keeps submission costs bounded." },
  { t: "Contract enforces", b: "The Mandate contract checks every term and settles USDT, or reverts. Above the threshold it requires a World ID approval bound to that payment." },
];

const pillars = [
  { k: "Settlement", name: "Whitechain", b: "USDT settles on Whitechain testnet (chain 1874). Mandate and MerchantRegistry are verified on the explorer.", href: `${EXPLORER}/address/${MANDATE}`, cta: "Mandate on explorer" },
  { k: "Human approval", name: "World ID", b: "Payments above the threshold wait for a verified human to approve that exact transaction, not a blanket permission.", href: `${EXPLORER}/tx/${APPROVED_TX}`, cta: "Human-approved payment" },
  { k: "Agent identity", name: "ENS", b: `The agent resolves as ${ENS_NAME} on ENSv2 Sepolia, with a live check that its published policy matches the contract.`, href: ENS_URL, cta: ENS_NAME },
];

const refusals = [
  ["Tampered amount", "Signed terms don't match the submitted amount."],
  ["Tampered payout", "Funds can't be redirected to a different address."],
  ["Over budget", "Spend beyond the mandate's remaining budget reverts."],
  ["Paused", "A paused mandate rejects every payment until the owner resumes."],
  ["Over-refund", "Refunds can never exceed what was paid."],
];

const proof = [
  { l: "Mandate contract", v: MANDATE, href: `${EXPLORER}/address/${MANDATE}` },
  { l: "MerchantRegistry", v: REGISTRY, href: `${EXPLORER}/address/${REGISTRY}` },
  { l: "Human-approved tx", v: APPROVED_TX, href: `${EXPLORER}/tx/${APPROVED_TX}` },
  { l: "Agent identity", v: ENS_NAME, href: ENS_URL },
];

const short = (s: string) => (s.startsWith("0x") ? `${s.slice(0, 8)}…${s.slice(-6)}` : s);

function Ext({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
}

const faq = [
  ["What is Countersign?", "Countersign gives an AI agent a USDT budget. The agent signs exact payment terms, a relayer pays the gas, and the Mandate smart contract enforces the owner's limits at the moment USDT moves. It is a testnet development preview."],
  ["How are spending limits enforced?", "On-chain by the Mandate contract: it checks signatures, merchant payout, per-transaction limit, period budget, nonce, order, epoch, expiry and pause before moving USDT, and reverts otherwise. Neither the agent, the relayer nor the API can exceed them."],
  ["How does World ID approval work?", "Payments above the owner's threshold are held until the owner completes a fresh World ID sign-in and signs with their wallet. A separate attestor then co-signs, and the contract verifies both signatures for that exact payment."],
  ["How is ENS used?", "The agent is published as agent1.countersign.eth on ENSv2 (Sepolia) with its policy mirrored in text records. The app runs a live drift check that compares the ENS records with the Mandate contract and shows MATCH or MISMATCH."],
  ["Which chain and token does it use?", "Whitechain Sepolia testnet (chain ID 1874) with the official test USDT token at 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7."],
];

const jsonLd = [
  { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Countersign", url: SITE_URL, applicationCategory: "FinanceApplication", operatingSystem: "Web", description: "Spending mandates for AI agents: USDT payments enforced by a Whitechain smart contract, with World ID human approval and an ENS agent identity.", codeRepository: GITHUB, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
];

export default function Home() {
  return (
    <div className="cs-landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="cs-wrap cs-nav">
        <Link href="/" className="cs-logo">Countersign</Link>
        <nav aria-label="Primary" className="cs-navlinks">
          <Link href="/demo">Demo</Link>
          <Link href="/owner">Owner</Link>
          <Link href="/merchant">Merchant</Link>
          <Ext href={GITHUB}>GitHub</Ext>
        </nav>
      </header>

      <main className="cs-wrap">
        <section className="cs-hero-row" aria-labelledby="hero-title">
        <div className="cs-hero cs-rise">
          <p className="cs-eyebrow">Testnet · Whitechain · World ID · ENS</p>
          <h1 id="hero-title">Spending mandates for AI&nbsp;agents.</h1>
          <p className="cs-lede">
            Your agent pays in USDT only inside limits a contract enforces. Anything bigger waits for a verified human to
            countersign the exact payment.
          </p>
          <div className="cs-ctas">
            <Link href="/demo" className="cs-btn cs-btn-primary">Run the live demo</Link>
            <Link href="/owner" className="cs-btn">Open owner console</Link>
            <Ext href={GITHUB} className="cs-btn cs-btn-ghost">View on GitHub</Ext>
          </div>
        </div>
        <div className="cs-term">
          <div className="cs-term-bar"><i /><i /><i /><span>{ENS_NAME} · live</span></div>
          <LiveStatus />
        {/* ponytail: static illustration of the flow, not live data; labelled as such. */}
        <figure aria-label="Illustrative payment flow (not live data)">
          <ol>
            <li><span className="cs-tag">signed</span>agent signs exact amount, merchant, payout</li>
            <li><span className="cs-tag">relayed</span>relayer + GasGuard submit to chain 1874</li>
            <li><span className="cs-tag cs-tag-warn">over threshold</span>waiting for World ID approval</li>
            <li><span className="cs-tag cs-tag-ok">settled</span>USDT paid, receipt on explorer</li>
          </ol>
          <figcaption>Illustrative flow, not live data · testnet</figcaption>
        </figure>
        </div>
        </section>

        <section className="cs-sec" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <ol className="cs-grid cs-grid-4">
            {steps.map((s, i) => (
              <li key={s.t} className="cs-card">
                <span className="cs-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="cs-sec" aria-labelledby="pillars">
          <h2 id="pillars">Built on three primitives</h2>
          <ul className="cs-grid cs-grid-3">
            {pillars.map((p) => (
              <li key={p.name} className="cs-card">
                <p className="cs-eyebrow">{p.k}</p>
                <h3>{p.name}</h3>
                <p>{p.b}</p>
                <Ext href={p.href} className="cs-link">{p.cta} ↗</Ext>
              </li>
            ))}
          </ul>
        </section>

        <section className="cs-sec cs-split" aria-labelledby="refuses">
          <div>
            <h2 id="refuses">What the contract refuses</h2>
            <p className="cs-muted">Each of these is rejected on-chain, not by the app. Covered by 118 contract tests and 97 API tests.</p>
          </div>
          <ul className="cs-refusals">
            {refusals.map(([t, b]) => (
              <li key={t}><span className="cs-x" aria-hidden="true">✕</span><div><strong>{t}</strong><p>{b}</p></div></li>
            ))}
          </ul>
        </section>

        <section className="cs-sec" aria-labelledby="proof">
          <h2 id="proof">Proof, on-chain</h2>
          <dl className="cs-proof">
            {proof.map((p) => (
              <div key={p.l}>
                <dt>{p.l}</dt>
                <dd><Ext href={p.href} className="cs-mono cs-link">{short(p.v)} ↗</Ext></dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="cs-sec" aria-labelledby="faq">
          <h2 id="faq">Questions</h2>
          <dl className="cs-refusals">
            {faq.map(([q, a]) => (
              <div key={q}><dt><strong>{q}</strong></dt><dd><p>{a}</p></dd></div>
            ))}
          </dl>
        </section>
        <section className="cs-sec cs-cta" aria-labelledby="try">
          <h2 id="try">See an agent get countersigned.</h2>
          <div className="cs-ctas">
            <Link href="/demo" className="cs-btn cs-btn-primary">Run the live demo</Link>
            <Link href="/merchant" className="cs-btn">Open merchant registry</Link>
          </div>
        </section>
      </main>

      <footer className="cs-wrap cs-foot">
        <span>Countersign · ETHGlobal submission · testnet only, not for real funds.</span>
        <Ext href={GITHUB} className="cs-link">Source on GitHub</Ext>
      </footer>
    </div>
  );
}
