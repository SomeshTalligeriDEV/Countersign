# 13 · ETHGlobal Submission Form: Draft Answers

**Status:** drafts. Fill the bracketed items after the code exists. Don't submit ratings or links you haven't checked.

**On the 10/10 ratings:** a rating of how easy the API is to use can only be honest after we've built against it. Rate it after the build, from our own experience, and write down the specific friction (see the debriefs in file 09). Don't submit 10 before then.

---

## Prize: Whitechain ($15,000)

**How are you using this Protocol / API?** Countersign settles every payment in official USDT (`0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`) on Whitechain Sepolia (chain 1874). A `Mandate` contract pulls funds from the company treasury to the merchant payout, enforcing per-payment, per-period and human-approval limits onchain. The relayer pays WBT gas, so the paying agent never holds WBT.

**Why you're applicable (sentence or two, min 20 characters):** Countersign is a stablecoin-native payment flow for AI agents: small payments settle automatically, and risky ones need a verified human. It fits Scale (invisible payments with business-paid gas) and Operate (a 20-line merchant integration with refunds).

**Link to the line of code where the tech is used:** `[add after build: contracts/src/Mandate.sol, pay() function]`

**How easy is it to use the API / Protocol? (1 to 10):** `[leave blank until built; rate from our own build]`

**Additional feedback for the sponsor (min 30 characters):** `[fill from WHITECHAIN_FEEDBACK.md after the build. Draft points to check: whether test USDT supports EIP-3009 or permit (the docs don't say), the faucet giving only WBT, and the faucet's 30-day GitHub account rule.]`

---

## Prize: ENS ($10,000) (optional, see file 06 go/no-go)

**How are you using this Protocol / API?** Each company gets a subname (for example `buyer.company.eth` on Sepolia) with a permissioned resolver. Merchants resolve the agent's identity and policy records without our API. The agent's key can update only its own endpoint and context records, while the owner sets the policy.

**Why you're applicable:** The agent's identity, its scoped roles and its expiry are read live from ENSv2, and the merchant uses them before accepting a payment.

**Link to the line of code:** `[add after build]`

**Rating and feedback:** `[leave blank until built]`

**Warning:** don't select this prize unless the six demo steps already work and ENS reads are live. A decorative ENS integration fails the qualification ("must be central, not cosmetic"). If we drop ENS, delete this section and the prize.

---

## Prize: World ($12,500, Agent Pass)

**How are you using this Protocol / API?** A payment above the agent's threshold needs a fresh World ID sign-in by the owner. Our backend validates the id_token (issuer, signature, audience, nonce, `auth_time`, owner identity) and only then attests the exact payment digest. A denied, expired or wrong-person sign-in moves no money.

**Why you're applicable:** A real protected action (a payment), not a login. Failure paths are shown in the demo.

**Link to the line of code:** `[add after build: apps/api/src/world/callback.ts or equivalent]`

**Rating and feedback:** `[leave blank until built]`

**Honest disclosure to include:** the hackathon proofs are mocked, not production identity assurance. Say so in the README and the video.

---

## Other partner technologies used

Select only what we actually use. Currently: **none** beyond the three prize partners. Don't tick Chainlink, Definitive or Arkiv, since we're not using them.

---

## Competition check (for our own positioning, not the form)

- **AgentPass (ETHGlobal Cannes 2026):** ENS identity, World ID, caps, Ledger approval. Closest overlap. Our differences: merchant SDK, real USDT settlement on Whitechain, contract-level tamper rejection, digest-bound approval, onchain epoch revocation.
- **Google AP2 mandates, Visa and Mastercard agent programs:** intent and cart mandates. Not onchain, not stablecoin-native.
- **Coinbase x402 with spend controls:** default $1 cap in the SDK. Our limits live in a contract, not the client.

Our edge is execution plus a demo of contract-level rejections, not a new concept. Don't claim originality beyond that.
