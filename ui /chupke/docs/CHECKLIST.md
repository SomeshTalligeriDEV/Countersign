# Judging checklist: the path to a top score

Privacy is scored out of 16 (five criteria at 0 to 3, plus a 1-point bonus). Agentic is scored out of 15 (three criteria at 1 to 5). Tick each line, because it maps straight to points.

## Privacy track (Zcash)

| Criterion | 3-point requirement | How Chupke gets it | Done |
|---|---|---|---|
| **Works** (the gate) | Core flow real, nothing faked, verifiable evidence | Real shielded testnet deposit with txid, and a real Bitrefill test purchase. Simulated swap disclosed | [ ] |
| **Private** | Privacy designed in, minimal disclosure, exposures explained | Shielded-only deposits, encrypted memo matching, hashed ids, no product or code storage, encrypted gift links, honest leak list | [ ] |
| **Easy** | A representative user finishes alone in minutes | Telegram chat, one-tap ZIP 321 link, rupee prices. **Test it on a non-crypto friend and note the time** | [ ] |
| **Needed** | Users or a partner asked for it | Quote from a Bitrefill mentor plus the scam cases (Bengaluru ₹4.35 lakh, Pune digital arrest) | [ ] |
| **Continuing** (tie-breaker 1) | Already taking concrete steps | zshield-mcp PR or issue opened today, and a partner conversation logged | [ ] |
| **Bonus** | Original or reusable contribution | Scam Shield as a reusable module, and the encrypted gift-link pattern | [ ] |

Partner bonus points: pay the demo top-up from **Noir Wallet**. Say "network privacy with Nym" only as a roadmap item, unless you actually build it.

## Agentic Commerce track (Bitrefill)

| Criterion | How Chupke scores | Done |
|---|---|---|
| Use of the Bitrefill tech stack | MCP server (search, details, buy, invoices), India catalogue, invoice-based recovery | [ ] |
| Followed requirements | Public repo, video of 3 min or less **showing the agent making a purchase**, feedback form | [ ] |
| Innovation | Private ZEC top-up, Scam Shield protecting Bitrefill's India issuers, encrypted Diwali gift links | [ ] |
| Best feedback ($100) | A specific, honest feedback form (see SUBMISSION.md) | [ ] |

## Before submitting

- [ ] Txid in the README and the submission
- [ ] README "What works" table matches reality exactly. **Don't claim anything you haven't run.**
- [ ] Video recorded, 3 minutes or less
- [ ] Submitted by **20:00 IST** (evening judging batch, scoring 20:00 to 22:00)
- [ ] Upstream issue or PR link added before 00:00
- [ ] `.env` is **not** in the repo (`git status` before pushing)

## Brutal truth

A "10/10" isn't something you write. It comes from the first row being real. Without a verified shielded txid, the Privacy score is capped near zero, whatever else is built.
