# Chupke Guard: private vouchers over Telegram

**One-line pitch:** A shielded spending allowance for AI shopping agents. Fund it privately with Zcash, set hard rules (auto-buy under ₹200, ₹2,000 a day, no Apple cards), and the agent shops on Bitrefill by itself inside them. It can't drain you, and your purchases never become a public record.

**Tracks:** Privacy (Zcash) and Agentic Commerce (Bitrefill), one entry for both.
**Themes:** private payment rails, the first five minutes, privacy beyond the transaction.

**Start here:** [docs/BUILD.md](docs/BUILD.md) (step-by-step testnet build) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DEMO.md](docs/DEMO.md) · [docs/SUBMISSION.md](docs/SUBMISSION.md) · [docs/CHECKLIST.md](docs/CHECKLIST.md)

## What works (and what doesn't)

| Step | Status |
|---|---|
| **Pie Lite voice page** (`CHUPKE_PIE_DEMO=1 python -m chupke.api`, then open http://localhost:8787/pie): speak in Hindi or English, hear the quote read back, and say "haan" to confirm. Local-only, so no key reaches the browser | Real (voice needs Chrome or Edge) |
| **HTTP API for other agents** (`python -m chupke.api`): Pie or any agent gets the same wallet, rules and checks. See [docs/PIE_INTEGRATION.md](docs/PIE_INTEGRATION.md) | Real (tested with Bitrefill faked; live at the venue) |
| **Spending rules enforced in code:** `/autobuy 200`, `/dailycap 2000`, `/block apple`. Under the limit the agent buys by itself; above it, it asks; over the cap or on a blocked brand, it refuses. The AI can't see or change these decisions | Real |
| Shielded testnet ZEC deposit, matched to a user by an encrypted memo code | Real (testnet). Txid: `FILL IN` |
| Agent searches Bitrefill and proposes a product (Claude + Bitrefill MCP) | Real |
| User confirms, funds held, Bitrefill test purchase, code delivered | Real (Bitrefill test mode) |
| Voucher message can't be forwarded and deletes itself | Real (Telegram `protect_content` + delete) |
| Scam Shield: blocks scam scripts, safety pause on risky orders | Real |
| Recovery: `/orders` checks live invoice status; the agent explains failures and drafts a support message (never includes the code) | Real |
| **Gift links:** "send Rahul a Rs 500 Swiggy card for Diwali" makes a one-time Telegram claim link. The code is encrypted with a key that exists only in the link, the server holds only ciphertext, it's wiped after one claim, and the sender is pinged on open. Gifts to a boss, client, officer or support person are blocked. | Real |
| **Shagun Pool:** `/pool 5000 Priya's wedding` makes a link for the WhatsApp group. Friends chip in shielded ZEC with the pool memo. Nobody, not even the organiser, sees who gave how much: no per-person amounts are stored, the total shows only after 3 contributors and is rounded to Rs 500. `/poolclose` moves the total into a gift link | Real |
| **Quote card before Confirm:** region, ID and online rules from `get-product-details`, total price with fees, and "no refund once revealed", built by code, not the AI. See [docs/BITREFILL_PROBLEMS.md](docs/BITREFILL_PROBLEMS.md) | Real |
| Duplicate-purchase stop (same product within 5 min) and a private receipt shown in chat, never stored | Real |
| **ZEC to Bitrefill settlement** | **Simulated.** Bitrefill doesn't accept ZEC. The bot pays from a Bitrefill test balance and debits the user's ZEC balance at a declared demo rate (Rs 3,000/ZEC, since TAZ has no price). In production this leg would swap ZEC through NEAR Intents or Zodl CrossPay, or Bitrefill would add ZEC. |

## How it works

1. `/start` gives the user a shielded unified address and a memo code (`CHUPKE-XXXXXXXX`).
2. The user sends shielded TAZ with that memo. The bot finds it by scanning its wallet (zingo-cli against `testnet.zec.rocks`) and credits the user.
3. The user chats ("Rs 500 Swiggy card"). Claude uses Bitrefill's *read-only* MCP tools to find the product, then calls `propose_purchase`.
4. The bot shows Confirm or Cancel. **The model can't buy anything.** Code runs Scam Shield, holds the funds, calls `buy-products`, waits for the invoice and delivers the code. If anything fails, the hold is refunded.

## Privacy and trust note

- **On chain:** deposits are shielded (Orchard/Ironwood). Observers can't see the sender, the amount or the memo, and every payment is itself a zero-knowledge proof.
- **In the bot:** Telegram ids are stored only as an HMAC with a secret salt. The database holds balances, deposit txids and spend *amounts*, never products, brands or codes. Chat history and the order list live in memory only (last 10 entries), and `/forget` wipes both. The agent never gets Bitrefill's `list-invoices`, because that would show every user's orders on the bot's account.
- **What still leaks (be honest):**
  - Telegram sees that you chat with the bot.
  - The bot operator knows your balance and spend amounts, but not what you bought once the chat is forgotten.
  - Bitrefill sees the order, but not who you are, because the bot buys with its own account.
  - Anthropic processes the chat text.
  - The demo server holds the wallet's spend key. Production should run watch-only with a viewing key, with the spend key offline.
- **Explorer privacy:** on Bitcoin or Ethereum, clicking an address in an explorer reveals its whole history. Our deposits are shielded, so testnet.zcashexplorer.app shows no sender, receiver, amount or memo. Transparent deposits are ignored. Use a shielded-only unified address (no transparent receiver).
- **Timing:** topping up and spending the same amount a minute later is linkable by timing. Users should top up round amounts in advance, like a prepaid card.
- **Swap leg (production):** converting ZEC to pay Bitrefill (for example through NEAR Intents) can expose amounts and timing on the other chain. Paying from one pooled account for all users makes that payment unlinkable to any single user.
- **Via Pie Lite (voice):** Chrome's speech recognition sends audio to Google to transcribe it. Typing avoids that. Voucher codes are shown on screen and never read aloud.
- **Shagun Pool limits:** shielded senders are hidden from everyone, including the bot. Someone who polls `/pools` very often could still roughly estimate one contribution from the change in the rounded total, and a pool with very few contributors reveals more. Contributions to a pool are final.
- **Trust:** this is custodial. Users trust the operator with their balance, so keep balances small, like a prepaid card.

## Scam Shield

India's gift-card and crypto scams follow scripts: "my boss needs Apple cards for a client", "digital arrest" fines, courier or customs fines, KYC expiry, "send me the code". Scam Shield (`chupke/scam_shield.py`) runs in code, so a prompt can't switch it off:

- It blocks those scripts and points users to the 1930 helpline and cybercrime.gov.in.
- Codes go only to the buyer, can't be forwarded, and delete themselves.
- Apple, Amazon or Play cards over Rs 2,000, more than 2 cards in one order, or more than Rs 10,000 in 24 hours trigger a 10-minute safety pause.

## Venue setup (from the Builder Pack's Zcash Developer Resources)

- **Testnet only.** NU7 is live on testnet (about 25-second blocks, v4 transactions are invalid). Orchard is sealed, so new shielded funds go to the **Ironwood** pool, and `utest1` unified addresses still work. Ignore old Orchard tutorials, and check that zingo-cli supports NU6.3 and NU7.
- **TAZ faucets:** Valar (0.125 TAZ per day), Fauzec (1 TAZ per day per address), or ask a mentor.
- **Fastest local loop:** Thus Spoke Zakura v0.4.0 runs a private NU7 network with its own faucet. Switch to `testnet.zec.rocks:443` before the demo, because the judges check txids on public testnet.
- **Plan B for deposit detection:** CipherPay testnet (testnet.cipherpay.app) detects payments with a viewing key only. Ask Kenbak (CipherPay mentor). If zingo-cli fights you past 15:30, switch to it.
- **Partner bonus:** pay the top-up link from **Noir Wallet** (mentor Max). The `/start` message already includes a ZIP 321 `zcash:` link.

## Run it

```bash
python -m venv venv && . venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill it in
python -m chupke.bitrefill      # prints Bitrefill tool schemas; fix buy() args if they differ
python -m chupke.zcash_wallet   # prints deposits seen; fix _parse_transfers if needed
python -m chupke.bot
pytest -q                        # Scam Shield, ledger, parser tests
```

## Technologies used

Python 3.11+, python-telegram-bot, ZIP 321 payment links, AES-GCM (cryptography) for gift links, the Anthropic Python SDK (Claude Opus 5.5, tool runner), MCP Python SDK (streamable HTTP client), the Bitrefill eCommerce MCP server, zingo-cli (Zcash light client), the Zcash testnet lightwalletd at testnet.zec.rocks, SQLite, Starlette and uvicorn (HTTP API), Web Speech API (Pie Lite voice page), and the testnet.zcashexplorer.app explorer.

## Prior work

None. Everything in this repo (the wallet, rules, Scam Shield, Bitrefill agent, gift links, pools, Telegram bot, HTTP API and the Pie Lite voice page) was built at Free Society Hack on 4 Nov 2026. Pie (callpie.app) is our own product idea, and Pie Lite is its first working piece, built today.

## 30-day next step

Open a PR on zshield-mcp replacing its stubbed chain layer with a real testnet backend (the mentors' listed good first issue, started at the hack). Ship watch-only deposit detection (viewing key only, spend key offline) and a real ZEC-to-Bitrefill settlement leg through NEAR Intents, then pilot with 20 users from the Mumbai Zcash community. Beneficiary: Zcash holders in India who can't easily spend ZEC.
