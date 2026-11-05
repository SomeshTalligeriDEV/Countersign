# 08 · Build Plan (IST)

**Now:** Fri Nov 6, about 03:15 IST · **Hard deadline:** Sat Nov 7, 09:00 IST · **Target submit:** Sat 06:00 IST (3-hour buffer)

## 1. Roles (adjust to team size)

| Role | Owns |
|---|---|
| **A: Contracts** | 03, 07 contract tests, deploy and verify |
| **B: Backend** | 04: facilitator, relayer, GasGuard, observer, World approval, attestor |
| **C: Frontend + SDK** | 05: middleware, agent client, web, demo merchant, demo agent |
| **Lead** (any of the above) | Booth visits, design-partner chats, README, video, submission |

Solo? Follow the same order and cut P1/P2 without hesitation.

## 2. Timeline

| When (IST) | A: Contracts | B: Backend | C: Frontend/SDK | Gate |
|---|---|---|---|---|
| Fri 03:00 to 05:00 | Repo, Foundry, OZ, `packages/shared` types | Fastify skeleton, SQLite schema, viem client for chain 1874 | Next.js skeleton, wagmi chain config | Everyone: claim faucet WBT, register World app in the portal (redirect URI) |
| 05:00 to 09:00 | `MerchantRegistry`, `Mandate`, tests T-01 to T-30 | Facilitator `/v1/settle`, GasGuard, relayer queue | `@countersign/merchant` + demo merchant 402 | **Read USDT `decimals()`** onchain |
| 09:00 to 10:00 | Fix failing tests | Observer + webhooks | `@countersign/agent` + `buy-report` | **Whitechain booth: get test USDT.** World + ENS booths: one-line pitch, ask what impresses them |
| 10:00 to 11:00 | **Deploy + verify** both contracts | Point API at deployed addresses | Owner page: create mandate, limited approve | **G1: first real USDT `pay()` on explorer.** Link goes in the README now |
| 11:00 to 15:00 | Help B; deploy fixes | `/v1/approvals`, World OIDC callback, attestor service | `/approve/[id]` page, owner signing | Step 1 of demo works end to end |
| 15:00 to 18:00 | Invariant fuzzing, gas measurement | Failure paths (A-05 to A-12) | `/merchant` view, refund UI, `/demo` buttons | **G2: World approve, deny and expire all work** |
| **18:00** | | | | **ENS go/no-go:** steps 1 to 6 working? Yes: build 06. No: drop ENS. |
| 18:00 to 22:00 | ENS (06) or polish | Attack endpoints, CSV export | Tamper/budget/replay scenarios, receipts | **G3: all six demo steps pass twice in a row** |
| 22:00 to 00:00 | P2 voice agent only if G3 is green | Deploy API (Railway/Render/Fly) | Deploy web (Vercel) | Live demo URL works from a phone |
| **Sat 00:00** | **Feature freeze.** Only bug fixes after this. | | | |
| 00:00 to 03:00 | README architecture + limitations | `WHITECHAIN_FEEDBACK.md`, `WORLD_DEBRIEF.md` | Record video (09) | |
| 03:00 to 06:00 | Final check (09 checklist) | | | **Submit by 06:00** |

Sleep in shifts: no one should be awake all 30 hours. A 3-hour nap (for example 13:00 to 16:00 for one person, 16:00 to 19:00 for another) beats a broken demo.

## 2b. Whitechain skill checkpoints

Installed Friday morning with `npx skills add whitechain-labs/skills --skill whitechain-dev`. Used at these points only:

| Checkpoint | When (IST) | Skill job |
|---|---|---|
| Network config | Fri 03:00 | Chain 1874, RPC, explorer, Blockscout API |
| Faucet | Fri 03:00 | Claim WBT for relayer and team wallets |
| Deploy | Fri 10:00 | MerchantRegistry, then Mandate with official USDT |
| Verify | Fri 10:00 | Both contracts, Blockscout, matching compiler settings |
| Final re-verify | Sat 03:00 | Re-check after any contract change |

Stop and check with the lead before every onchain write.

## 3. Commit cadence

Commit at least every 1 to 2 hours, with meaningful messages. ETHGlobal and Whitechain both check for steady progress, and a single big upload can be disqualified. Suggested milestones:

1. `chore: monorepo + shared EIP-712 types`
2. `feat(contracts): MerchantRegistry + Mandate checks`
3. `test(contracts): attack tests T-01..T-30`
4. `deploy: Whitechain Sepolia + verified` (paste addresses)
5. `feat(api): facilitator + relayer + GasGuard`
6. `feat: first real USDT payment` (explorer link in README)
7. `feat(api): World approval + attestor`
8. `feat(web): approve page + owner dashboard`
9. `feat: attack scenarios + revoke replay`
10. `docs: README, feedback, debrief`

## 4. Cut order (drop from the top first)

1. P2 voice agent
2. ENSv2 layer (then don't select the ENS prize)
3. CSV export
4. Refund UI (keep the contract function and test)
5. Webhooks (keep the observer)
6. Pretty dashboard (keep `/demo` and `/approve`)

**Never cut:** real USDT `pay()`, tamper revert, budget revert, World approve plus one failure path, revoke replay, GasGuard rejection, verified contracts, README items, video.

## 5. Blockers to chase immediately

| Blocker | Action | Fallback |
|---|---|---|
| No test USDT (faucet gives only WBT) | Whitechain booth at opening. Ask in their Discord. Check the Portal bridge testnet. | None: USDT is a qualification item. Escalate early. |
| Faucet needs a GitHub account at least 30 days old | Use the oldest team account | Ask the booth for WBT |
| World client registration / mock env issues | Register in the portal by 05:00. Read the testing guide. | Ask the World booth. Log friction for the debrief. |
| Compiler mismatch on verify | Use `solc 0.8.30`, `evm_version = "prague"` exactly as Whitechain documents | Re-verify with matching settings |
| World sandbox identity takes about 1 hour to issue | Start it in hour one, and ask the booth how the mocked proofs work | Record the approval on video as soon as it works once |
| Verification fails | Hardhat verify with Sourcify, then Blockscout `--force` | Ask the booth. Note it in the feedback file. |
