# Submission text (paste into Stadium)

Tick **both** tracks: Privacy and Agentic Commerce. Fill in every `FILL IN`.

**Project name:** Chupke Guard

**One-line pitch:** A shielded spending allowance for AI shopping agents. Fund it privately with Zcash, set hard rules, and the agent buys on Bitrefill by itself inside them. It can't drain you, and your purchases never become a public record.

**Testnet transaction ID (created by the project):** `FILL IN`, the shielded deposit txid from BUILD.md Step 2.6

**Public repo:** `FILL IN`. The README lists every technology used.

**Public URL:** `https://t.me/FILL_IN_BOT_USERNAME`

**Demo video (3 min max):** `FILL IN`, the screen recording from BUILD.md Step 4

## Privacy and trust note (under 3,000 characters)

Chupke Guard takes deposits only as shielded Zcash (Ironwood, unified address). On the testnet explorer, our deposit shows no sender, receiver, amount or memo. Every deposit is a zero-knowledge proof. Users are matched to deposits by a code inside the encrypted memo, which only the bot's wallet can read. Transparent deposits are ignored.

Inside the bot, Telegram ids are stored only as an HMAC with a secret salt. The database holds balances, deposit txids and spend amounts, never products, brands or voucher codes. Chat history and order lists live in memory only, and /forget wipes them. Gift codes are encrypted with AES-GCM using a key that exists only in the claim link. The server stores only ciphertext and wipes it after one claim. Voucher messages use Telegram protect_content, so they can't be forwarded, and they delete themselves.

The AI can't move money. It has only read-only Bitrefill tools. Purchases run in code, governed by the user's own rules (auto-buy limit, daily cap, blocked brands), after the user taps Confirm, a scam check, a safety pause for risky orders, and a duplicate-purchase stop.

What still leaks:
- Telegram sees that you use the bot.
- The operator sees balances and spend amounts.
- Bitrefill sees orders, but from the bot's account, not yours.
- Anthropic processes chat text. With voice (Pie Lite), Chrome's speech recognition sends audio to Google.
- Timing can link a top-up to a purchase, so users should top up round amounts in advance.
- The demo server holds the wallet's spend key. Production should be watch-only, with a viewing key.

Trust: this is custodial, like a prepaid card, so balances should be small.

Simulated: Bitrefill doesn't accept ZEC. The bot pays from a Bitrefill test balance and debits the user's ZEC balance at a declared rate (TAZ has no price). In production, that leg swaps through NEAR Intents or Zodl CrossPay, which can reveal amounts and timing on the other chain. A single pooled account keeps it unlinkable to individual users.

## 30-day next step

1. Open a PR on zshield-mcp replacing its stubbed chain layer with a real testnet backend (a mentor-listed issue). Link: `FILL IN`
2. Move to a watch-only server (viewing key only) through CipherPay or a UFVK import.
3. Build a real ZEC-to-Bitrefill settlement leg through NEAR Intents.
4. Pilot with 20 users from the Mumbai Zcash community. Beneficiary: Zcash holders in India who can't easily spend ZEC.

## Prior work

None. Everything (the shielded wallet, spending rules, Scam Shield, Bitrefill agent, gift links, Telegram bot, HTTP API and the Pie Lite voice page) was built on 4 Nov 2026 at Free Society Hack.

## Friction notes (optional but valuable; ZCG reads these)

`FILL IN` as you hit them. Starters:
- Which zingo-cli or SDK release works with NU7 and Ironwood, and how long it took to find out
- Faucet limits (Valar 0.125 TAZ per day) vs. how much testing needs
- Whether a shielded-only unified address was easy to generate
- Any docs still describing Orchard as the active pool

## Bitrefill feedback (required for Agentic; never public)

- **What worked:** `FILL IN` (for example MCP tool discovery, search for country=IN, invoice polling)
- **What didn't:** `FILL IN` (for example test-mode setup, argument names vs. docs, no ZEC payment method)
- **Feature requests:**
  - Accept shielded ZEC.
  - A test-mode flag in MCP.
  - A fraud-signal API, so agents like Scam Shield can share scam patterns with Bitrefill before orders are placed.
