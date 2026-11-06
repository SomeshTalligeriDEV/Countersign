# Build Chupke Guard on testnet, step by step

Goal: a bot that **really works on Zcash testnet and Bitrefill test mode** before 20:00 IST.
Each step ends with a check. Don't move on until the check passes.

Time budget (IST): setup 13:15–13:45 · Zcash 13:45–15:30 · Bitrefill 15:30–17:00 · bot end-to-end 17:00–18:30 · polish and submit 18:30–19:45.

---

## Step 0. Grab people and keys (15 min, do it first)

| Need | Ask | Why |
|---|---|---|
| Bitrefill test API key / test access | Ankush Mehta, Max N or Aamir Shaikh (Bitrefill) | Purchases must be test only |
| 2 to 5 TAZ | Any Zcash mentor, or the Valar or Fauzec faucets | Funds the wallets |
| A wallet that works on today's testnet (NU7, Ironwood) | Max (Noir Wallet), Pacu (Zodl), Kenbak (CipherPay) | Old tooling breaks on NU7 |
| A quote for "Needed" | Ask a Bitrefill mentor: "Would Scam Shield help you in India?" Write down the answer with their name | Needed = 3 |

Also pick a **point person**, who submits and receives any prize, and agree how you'll split it.

**Check:** you have a Bitrefill key, TAZ in a wallet, and a written quote.

---

## Step 1. Machine setup (15 min)

```bash
unzip chupke.zip && cd chupke
python3 -m venv venv && . venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
pytest -q                 # expect: 32 passed
```

Create the Telegram bot: message **@BotFather**, send `/newbot`, and put the token in `TELEGRAM_BOT_TOKEN`.
Get an Anthropic API key and set `ANTHROPIC_API_KEY`.
Set `CHUPKE_UID_SALT` from `python -c "import secrets;print(secrets.token_hex(32))"`.

**Check:** `pytest -q` passes.

---

## Step 2. Zcash: get one real shielded deposit detected (the riskiest step)

Facts from the Builder Pack:
- NU7 is live on testnet, with about 25-second blocks. **v4 transactions are invalid.**
- **Orchard is sealed**, so new shielded funds go to **Ironwood**. Unified addresses (`utest1...`) still work. Ignore old Orchard tutorials.
- Let the SDK compute fees (ZIP 317).

### Plan A: zingo-cli (bot wallet)

1. Install a zingo-cli build that supports NU6.3 and NU7. Ask a mentor which release.
2. Create the bot wallet:
   ```bash
   zingo-cli --chain testnet --server https://testnet.zec.rocks:443 --data-dir ./zingo-wallet
   # inside the prompt:
   addresses          # copy the utest1... unified address
   ```
   If the address includes a transparent receiver, ask how to make a **shielded-only** one. Transparent deposits are ignored by design.
3. Put that address in `ZCASH_DEPOSIT_UA`.
4. From a **different** wallet (Noir Wallet for the partner bonus, or Zodl or Zingo), send 0.1 TAZ to it with the memo `CHUPKE-TEST0001`.
5. Wait for 1 to 2 blocks (about a minute), then:
   ```bash
   python -m chupke.zcash_wallet
   ```
   **Check:** it prints `Deposit(txid='...', zats=..., memo='CHUPKE-TEST0001...')`.
   If it prints nothing or a parse warning, look at the raw output and fix `_parse_transfers()` in `chupke/zcash_wallet.py` to match its field names (kind, txid, value, memos, pool).
6. Open `https://testnet.zcashexplorer.app/transactions/<txid>` and confirm it shows **no readable addresses or amounts**. **Save this txid**, because the submission needs it.

### Plan B: CipherPay testnet (switch at 15:30 if Plan A is stuck)

CipherPay (testnet.cipherpay.app) does what the Builder Pack recommends: a payment link, a server that holds only a **viewing key**, and confirmation. Ask Kenbak for the testnet API and webhook. Then add a `CipherPayWallet` class in `chupke/zcash_wallet.py` with an `async scan()` that returns `Deposit(txid, zats, memo)` from paid invoices, and set `CHUPKE_WALLET=cipherpay` in `make_wallet()`. Bonus: the bot then runs with a viewing key only, which is better privacy.

### Plan C: local network for fast iteration only

Thus Spoke Zakura v0.4.0 runs a private NU7 network with its own faucet and mines blocks on demand. Use it to debug. **Demo on public testnet**, because judges verify the txid there.

---

## Step 3. Bitrefill: one test purchase (about 1 hr)

1. Set `BITREFILL_MCP_URL=https://api.bitrefill.com/mcp/<TEST_API_KEY>`.
2. Print the real tool schemas:
   ```bash
   python -m chupke.bitrefill > bitrefill-tools.md
   ```
3. Open `bitrefill-tools.md` and compare `buy-products` with `Bitrefill.buy()` in `chupke/bitrefill.py`. Our guess, based on Bitrefill's CLI docs: `cart_items: [{product_id, package_id}]`, `payment_method: "balance"`, `return_payment_link: false`. Fix the names if they differ, and do the same for `get-invoice-by-id`.
4. Ask the Bitrefill team which products and payment method work in **test mode**, and set `BITREFILL_PAYMENT_METHOD` to match.
5. Quick test from Python:
   ```bash
   python - <<'PY'
   import asyncio, os, json
   from chupke.bitrefill import Bitrefill, find_invoice_id, find_redemption
   async def main():
       b = Bitrefill(os.environ["BITREFILL_MCP_URL"], os.environ.get("BITREFILL_PAYMENT_METHOD","balance"))
       await b.start()
       r = await b.buy("PRODUCT_ID_FROM_SEARCH", 500)
       inv = await b.wait_for_codes(find_invoice_id(r))
       print(find_redemption(inv))
       await b.close()
   asyncio.run(main())
   PY
   ```
   **Check:** it prints a test code or redemption link.

---

## Step 4. Bot end to end (about 1.5 hr)

```bash
python -m chupke.bot
```

Run through this on your phone:

| # | Do | Expect |
|---|---|---|
| 1 | `/start` | Deposit address, memo code and a `zcash:` link |
| 2 | Pay 0.5 TAZ shielded with that memo (Noir Wallet) | Within about 60 s: "Top-up received" plus the explorer link |
| 2b | `/autobuy 200`, then "Rs 100 Swiggy card" | Bought automatically with "Auto-approved" and no tap. Then `/dailycap 100` and try again: refused |
| 3 | "Rs 500 Swiggy card" | Agent finds it and shows Confirm and Cancel |
| 4 | Tap Confirm | Code message (can't be forwarded) and a receipt with the invoice ID |
| 5 | Wait 2 min | Code message deletes itself |
| 6 | `/orders` | Order with its live status |
| 7 | "My Swiggy code didn't work" | Agent checks the invoice and drafts a support message without the code |
| 8 | "Send Rahul a Rs 200 Swiggy card for Diwali" then Confirm | Gift link. Open it on a second phone, the gift appears, and the sender gets a ping |
| 9 | Open the same gift link again | "already opened" |
| 9b | `/pool 1000 Test pool`, then 3 shielded payments with the pool memo from different wallets, then `/pools`, then `/poolclose POOL-...` | Hidden total until 3 contributors, then about Rs X. Close moves the funds to the organiser's balance |
| 10 | "My boss asked me to buy 10 Apple cards for a client" | Blocked, with the 1930 helpline |
| 11 | "Rs 5000 Apple card" then Confirm | 10-minute safety pause |
| 12 | Same Swiggy purchase twice in 5 min | Duplicate stop |

| 13 | `CHUPKE_PIE_DEMO=1 python -m chupke.api` (use port 8787), then open localhost:8787/pie in Chrome, say "Ek 100 ka Swiggy card", then "haan" | Quote spoken, code on screen, receipt shown |

**Check:** every row behaves as expected. Record the screen while you do it, because that's your demo video.

---

## Step 5. Submit (before 20:00 IST for the evening batch)

Use `docs/SUBMISSION.md`. Fill in the txid and the repo URL, paste the text into Stadium, and tick **both** tracks.
Then open the upstream issue or PR (see `docs/CHECKLIST.md`) and add the link before midnight.

## If things break

| Symptom | Fix |
|---|---|
| zingo-cli errors about v4 or the tx version | Old build. Get an NU7-ready release, or switch to Plan B |
| Deposit never appears | Was the memo exactly right? Was it sent **shielded**? Did you wait 2 blocks? Also check the address in `.env` |
| `buy-products failed` | Arg names (Step 3.3) or test-mode product. Ask Bitrefill |
| Agent replies but never shows Confirm | Check logs for tool errors. The product id must come from `search-products` |
| Bot crashes at start | A missing `.env` value. The error names it |
