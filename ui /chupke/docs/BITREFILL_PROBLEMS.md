# Bitrefill's real complaints, and what Chupke Guard does about each

Source: 1 to 3 star Trustpilot reviews of Bitrefill (UK page 10, CA page 7, IE page 1), April to July 2026. Bitrefill's overall score is 4.5/5 from about 2,950 reviews, so this is the tail, not the norm. **Don't pitch Bitrefill as broken.** Reddit and X were blocked from my research tools, so they aren't included.

| # | Complaint (country, date) | Type |
|---|---|---|
| 1 | Card required a **South African ID or passport**. Refund denied because the card details had been viewed (NL, 1 May) | Hidden restriction + no refund after reveal |
| 2 | **Amazon India** cards "not redeemable, no solution yet" (IN, May) | Code didn't work |
| 3 | Non-working gift card, support replies looked AI-generated, replacement never came (AU, 10 May) | Code didn't work + support |
| 4 | Two Steam codes didn't work, no refund (DE, 9 Jul) | Code didn't work |
| 5 | "One didn't work" (TH, 30 Apr) | Code didn't work |
| 6 | "Can't use this card anywhere online" (US, 30 Apr) | Hidden restriction (in-store only?) |
| 7 | Paid **132 USDT on an unsupported network** and got nothing (PL, 27 Jul) | Wrong payment network |
| 8 | Paid the address, no code issued, support blamed the customer (HK, 30 Apr) | Paid but not delivered |
| 9 | BTC not credited, refund took weeks, ticket closed unresolved (GR, Jul) | Paid but not delivered + support |
| 10 | $200 card unredeemable because of the brand's own site problems (SV, Jul) | Brand-side failure |
| 11 | Phishing lookalike site, $10 credit offered (earlier review) | Phishing |
| 12 | Price above face value (£50 card for £52.50) | Fee surprise |

## The pattern

1. **Restrictions found too late**, after the code is revealed, when refunds are no longer possible (#1, #6).
2. **Wrong-network or unmatched payments** (#7, #8, #9).
3. **"My code doesn't work" with weak evidence for support** (#2 to #5, #10).
4. **Fee and phishing surprises** (#11, #12).

## What Chupke Guard does (all built)

| Pattern | Fix in the bot |
|---|---|
| Restrictions found too late | The agent **must** call `get-product-details` first. It refuses cards that need a foreign ID or don't work in India. A **quote card built by code** shows region, ID and online rules, total price, and "no refund once revealed" **before** Confirm |
| Wrong network | There's no network choice. One shielded ZEC address with a ZIP 321 link, memo pre-filled. The bot says "Top-up received" with an explorer link |
| Paid but not delivered | Funds are **held**, not spent, until Bitrefill delivers. Failure means an automatic refund. A duplicate stop prevents double paying |
| Code doesn't work | `/orders` checks live invoice status. The agent drafts a support message (invoice ID, brand, value, time, status, error) and never asks for the code |
| Fee surprise | The quote card shows the full rupee price including fees |
| Phishing | There's no website to fake. Bitrefill is reached only inside the bot |

## The one-liner for Bitrefill judges

"We read your 1-star reviews. Most start with a restriction the buyer saw too late, or a payment sent the wrong way. Our agent checks both *before* money moves, and Scam Shield keeps scam-funded orders away from your Indian issuers."
