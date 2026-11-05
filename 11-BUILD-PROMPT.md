# 11 · Master Build Prompt for the Coding Agent

Copy everything inside the block into Claude Code (or Codex/Cursor) from the root of your **new, public** repo, after installing the tools in 10 and copying these docs into `docs/`.

---

```text
You are building "Countersign" for ETHGlobal Mumbai 2026. The hard deadline is Sat Nov 7, 09:00 IST; we submit by 06:00 IST. Read every file in docs/ before writing code, in order 00 to 10. They are the spec. If the spec and your instincts disagree, follow the spec and tell me.

GOAL
Contract-enforced spending mandates for AI agents paying businesses in official USDT on Whitechain Sepolia (chain 1874), with transaction-bound human approval through World ID Agent Pass. The contract is the security boundary. The backend, relayer and frontend are helpers that cannot move funds or change terms on their own.

WHITECHAIN SKILL (use it for every chain operation)
Installed with: npx skills add whitechain-labs/skills --skill whitechain-dev
Use it, at a high level, for these jobs only:
1. Network config: chain 1874, RPC https://rpc.testnet.whitechain.io, explorer https://explorer.testnet.whitechain.io, Blockscout API https://explorer.testnet.whitechain.io/api/v2. Check the chain ID before every signed action.
2. Faucet: claim test WBT for the relayer and for team wallets (0.5 WBT per 24h, rolling). Never claim test USDT this way. The faucet doesn't give USDT.
3. Deploy: MerchantRegistry first, then Mandate with the official USDT address as a constructor argument. Foundry script with --broadcast. Show the summary and wait for my confirmation before every onchain write.
4. Verify: forge verify-contract --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/ for both contracts. Compiler settings must match: solc 0.8.30, evm_version prague.
5. Keys: the skill never accepts pasted private keys. Use a Foundry keystore or an env var from a gitignored .env file.
The skill is NOT for payment logic, token transfers, signing messages or bridging. Those are ours, in the contracts and the relayer, and they must be tested in docs/07.

TOOLS AND SOURCES
- Use the whitechain-dev skill for network config, deploy, verify and faucet (see the section above). Foundry: solc 0.8.30, evm_version "prague". Verify with --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/.
- For World: read https://auth.world.org/docs/guides/coding-agent-setup.md and use the world-id-developer-sandbox MCP. The issuer comes from env WORLD_ISSUER.
- For ENS (only after the ENS go/no-go in docs/08): use https://docs.ens.domains/llms-full.txt and Context7 ("use context7"). Never use setApprovalForAll or an ALL_ROLES bitmap.
- Official USDT only: 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7. Read decimals() at runtime. Never deploy or mint a replacement token on Whitechain. Mock ERC-20s are allowed only in local Foundry tests.

EXISTING UI
We have an existing application UI. Reuse its layout, components, styles and design system, and change only the content to fit Countersign: copy, labels, routes, data and flows from docs/05 section 4 (/owner, /approve/[id], /merchant, /demo, /r/[paymentId]). Keep its visual quality, and replace any wording or features that don't apply. Before copying it in, tell me where it came from. If it is our own code written before the hackathon started, STOP and ask me: under ETHGlobal rules that would need the Continuity track and a "before vs during" README section. If it is a public template or starter kit, note the source in the README and continue.

BUILD ORDER (stop at each gate, show me the result, then continue)
1. Monorepo per docs/02 section 8 (pnpm workspaces): contracts, apps/api, apps/attestor, apps/web, apps/demo-merchant, apps/demo-agent, packages/merchant, packages/agent, packages/shared. Commit.
2. packages/shared: EIP-712 domain + PaymentIntent, PaymentApproval, WorldAttestation types, chain config, constants. Commit.
3. Contracts per docs/03 exactly: MerchantRegistry and Mandate with owner == treasury (never a treasury parameter), limited allowance, the pay() check order, custom errors, refund. Commit.
4. Every test in docs/07 sections 2 and 3, including the invariant test T-30 and the viem-vs-contract digest test A-14. All must pass. Commit.
   GATE 1: show me the forge test output.
5. Deploy and verify on Whitechain Sepolia using the whitechain-dev skill (faucet, deploy, verify as described in the WHITECHAIN SKILL section). Ask me before every onchain write and show me the summary. Then run one real USDT pay() from a script and put the explorer link in README.md. Commit.
   GATE 2: show me the verified contract links and the tx link.
6. apps/api per docs/04: facilitator /v1/settle, GasGuard with every rule in its table, relayer queue, chain observer, webhooks. Commit after each.
7. packages/merchant and apps/demo-merchant: the integration must stay at about 20 lines; print the line count. packages/agent and apps/demo-agent with every scenario command in docs/05 section 5. Commit.
   GATE 3: demo step 2 works end to end with real USDT.
8. World approval per docs/04 section 4: our own /approve/[id] page showing exact terms, OIDC auth code + PKCE, max_age=0, nonce = H(approvalDigest), id_token validated with jose against JWKS, owner sub binding, the separate attestor service reading the digest from the DB, and the owner EIP-712 wallet signature. Implement the denied, expired, wrong_human and stale_auth paths. Commit.
   GATE 4: approve settles; cancel and expiry move nothing.
9. apps/web: reuse the existing UI as described above; build the pages in docs/05 section 4, with plain-English revert messages and explorer links. Commit.
10. Attack scenarios: tamper amount, tamper payout, over budget, revoke then replay, GasGuard rejection. Each must fail ONCHAIN or at GasGuard, never just in the frontend. Commit.
    GATE 5: all six demo steps in docs/09 pass twice in a row.
11. Only if I say ENS is a go: docs/06. Only if I say so after that: the P2 voice agent in docs/05 section 6 (voice can request, never approve).
12. README, WHITECHAIN_FEEDBACK.md and WORLD_DEBRIEF.md from the templates in docs/09. GitHub Actions running forge test and api tests. Commit.

RULES
- Commit after every working step with a clear message. No giant final commit.
- Never put a private key, client secret or attestor key in code, chat or the frontend. Use gitignored .env files and commit .env.example. ATTESTOR_KEY lives only in apps/attestor.
- Never weaken a check or skip a test to make something pass. If a test fails, fix the code or tell me.
- Never claim in UI or README what the code doesn't do. Use the limitations list in docs/09.
- Status comes only from chain logs. Never broadcast a tx that simulation rejects.
- If you're blocked (no USDT, World sandbox issue, verify failure), stop and tell me exactly what's needed. Don't invent a workaround that breaks a qualification rule.
- Keep a running "AI tools used" section in the README (ETHGlobal requires it).
```

---

## Short prompts for later

**Fix a failing test:** "Test `<ID>` from docs/07 fails with `<output>`. Find the root cause in the contract or API and fix it without weakening the check. Re-run the full suite and show me the output."

**Prepare the video run:** "Using apps/demo-agent and /demo, run all six steps from docs/09 in order on Whitechain Sepolia. Print each tx hash or revert reason with its explorer link. Stop on the first unexpected result."

**Final audit:** "Check the repo against the checklist in docs/09 section 7 and the success criteria in docs/01 section 7. List every item as done or missing, with evidence (file path or link)."
