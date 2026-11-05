# Connect Pie to Chupke Guard

Pie (callpie.app) is the voice front end. Its first working piece, **Pie Lite**, was built today. Chupke Guard is Pie's **private wallet**: a shielded ZEC allowance plus Bitrefill shopping, behind hard rules.

## Pie Lite: the voice demo (built today)

```bash
CHUPKE_PIE_DEMO=1 python -m chupke.api   # plus the Telegram bot running for deposit scanning, or add CHUPKE_API_SCAN=1
# open http://localhost:8787/pie in Chrome or Edge, on the laptop running it
```

Tap the mic and say "Ek 500 ka Swiggy card chahiye". Pie Lite speaks the quote back, and you say "haan" to confirm. The voucher shows on screen and is never read aloud. It only answers requests from the same machine, so no API key ever reaches the browser.

**Brutal scope note:** real phone calls (a number you dial) need a telephony provider (Twilio or Exotel), a phone number and Indian telecom rules. That's the roadmap, not today. Pie Lite proves the voice experience on the real wallet.

## Run the API

```bash
export CHUPKE_API_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(32))")
python -m chupke.api               # :8787. Run the Telegram bot too, because it scans deposits.
# or, without the bot:  CHUPKE_API_SCAN=1 python -m chupke.api
```

Keep the key on Pie's **server**, never in the phone app. Pie authenticates its own users and passes a stable `user` id.

## The voice flow

```
User calls Pie: "Ek 500 ka Swiggy card le lo"
 -> Pie speech-to-text -> POST /v1/chat {user, text}
 <- {reply, quote: {card, decision, reason}}
     decision = auto  -> already bought; Pie reads the receipt and voucher to the user
     decision = ask   -> Pie READS THE CARD BACK ("Swiggy ₹500, you pay ₹512, India only. Confirm?")
                         user says yes -> POST /v1/confirm {user}
     decision = deny  -> Pie reads the reason ("over your daily limit")
```

## Endpoints (all POST JSON, `Authorization: Bearer $CHUPKE_API_KEY`)

| Path | Body | Returns |
|---|---|---|
| `/v1/deposit` | `{user}` | Shielded address, memo, and a `zcash:` ZIP 321 link (send it to the user by SMS or WhatsApp) |
| `/v1/balance` | `{user}` | `balance_inr` |
| `/v1/chat` | `{user, text}` | `reply`, optional `quote`, optional `purchase` (when auto-approved), or `blocked: true` |
| `/v1/confirm` | `{user}` | `status`: ok · duplicate · insufficient · failed · denied · cooling · no_pending_quote |
| `/v1/cancel` | `{user}` | `{status: cancelled}` |
| `/v1/orders` | `{user}` | Recent orders with live Bitrefill status |
| `/v1/rules` | `{user, auto_under_inr?, daily_cap_inr?, block?, unblock?}` | Current rules |

Try it:

```bash
curl -s localhost:8787/v1/chat -H "Authorization: Bearer $CHUPKE_API_KEY" \
  -H 'content-type: application/json' -d '{"user":"demo","text":"Rs 500 Swiggy card"}'
```

## Voice-specific care

- **Read the vouchers back carefully, or better, send them by SMS.** Saying a code aloud on speaker leaks it.
- Gift purchases return a `gift_link` (it opens in Telegram), never a code, so Pie can text it to the recipient.
- Pie's own speech-to-text and LLM see the user's words. Add that to the privacy note's "what still leaks".

## Demo line

"Pie already lets you shop by phone call, but every payment lands in your UPI history. Today we gave Pie a private wallet: shielded Zcash in, Bitrefill vouchers out, and rules the AI can't break."
