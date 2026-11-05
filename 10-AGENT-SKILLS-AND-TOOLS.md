# 10 · Agent Skills, MCP Servers and SDKs per Track

Install these **before** you start the coding agent (Claude Code, Codex or Cursor), so it builds from official docs instead of guessing. All were checked on Nov 5, 2026. Treat anything marked "unofficial" or "preview" with care.

## 1. Whitechain (official skill)

```bash
npx skills add whitechain-labs/skills --skill whitechain-dev
```

- Source: [whitechain-labs/skills](https://github.com/whitechain-labs/skills), documented at [docs.whitechain.io/build-with-ai/claude-skills](https://docs.whitechain.io/build-with-ai/claude-skills.md). It's the only skill in the repo.
- Covers network config, deploy, **verify**, faucet and running a node. It's for **Whitechain Sepolia only** (chain 1874, RPC `https://rpc.testnet.whitechain.io`, Blockscout API `https://explorer.testnet.whitechain.io/api/v2`).
- Its own rules: it never accepts pasted private keys (use a Foundry keystore or env var), confirms before writes, and checks chain ID 1874 before signing. It's **not** for transfers, swaps, signing or bridging, so payment logic is your code.
- Docs for agents: [docs.whitechain.io/llms.txt](https://docs.whitechain.io/llms.txt) and `llms-full.txt`.
- Foundry settings from their docs: `solc = "0.8.30"`, `evm_version = "prague"`.

**Where it's used in the build:** network config, faucet, deploy and verify only (see 11, section "Whitechain skill"). Payment logic, token transfers and signing stay in our contracts and relayer.

## 2. World ID / Agent Pass (no npx skill; prompt + MCP + SKILL.md)

**Agent Pass (OIDC, what we use for approvals):** give your coding agent this one-liner from World's [coding-agent setup page](https://auth.world.org/docs/guides/coding-agent-setup):

> Read https://auth.world.org/docs/guides/coding-agent-setup.md and follow its instructions to integrate World ID into this project.

Developer MCP server (OAuth, for registering the app and redirect URIs):

```bash
# Claude Code
claude mcp add --transport http --scope user world-id-developer https://auth.world.org/mcp/developer
# sandbox (use this at the hackathon)
claude mcp add --transport http --scope user world-id-developer-sandbox https://sandbox.auth.world.org/mcp/developer
# Codex
codex mcp add world-id-developer --url https://auth.world.org/mcp/developer
```

Testing: sandbox issuer `https://sandbox.auth.world.org`, plus the [OAuth Playground](https://oauth-playground.toolsforhumanity.dev/) to check flows by hand. World's testing guide recommends local signed fixtures for the failure-path tests (07: A-05 to A-08).

**IDKit (only if you also want the IDKit prize, same partner):** give the agent [docs.world.org/world-id/SKILL.md](https://docs.world.org/world-id/SKILL.md). It pins `@worldcoin/idkit` to `^4.x`, so don't use 2.x or 3.x. Agent docs: [docs.world.org/llms.txt](https://docs.world.org/llms.txt).

## 3. ENS (no official skill; llms.txt + Context7 + preview CLI)

```bash
# docs for agents
#   https://docs.ens.domains/llms.txt   and   https://docs.ens.domains/llms-full.txt
# Context7 MCP (recommended by ENS's "Building with AI" page); add "use context7" to prompts
claude mcp add context7 -- npx -y @upstash/context7-mcp
# ENS CLI: EXPERIMENTAL preview, not on npm, not production-ready
npx "https://pkg.pr.new/ensdomains/ens-cli/@ensdomains/cli@main" --llms
# it can also register itself:  ens mcp add   |   ens skills add
```

- The ENS CLI outputs **unsigned calldata JSON** for writes. Review it before signing.
- Community MCPs ([gskril/ethereum-mcp](https://github.com/gskril/ethereum-mcp), [thenamespace/ens-mcp](https://github.com/thenamespace/ens-mcp)) are unofficial and may not support ENSv2. Don't rely on them for v2 writes.
- Libraries: viem ≥ 2.35, ENSjs ≥ 5.2.5, `forge install ensdomains/contracts-v2`.

## 4. General hackathon-winning setup for the coding agent

| Tool | Why |
|---|---|
| Foundry (`forge`, `cast`, `anvil`) | Contracts, tests, invariant fuzzing, local chain |
| OpenZeppelin Contracts 5.x | EIP712, ECDSA, SignatureChecker, SafeERC20, ReentrancyGuard |
| viem + wagmi | Typed data hashing that must match the contract (test A-14) |
| `jose` | ID token validation against JWKS |
| Playwright | Record a reliable demo run and catch UI regressions before the video |
| GitHub Actions | `forge test` + API tests on every push; badge in the README |

**Rules for the agent:** never paste private keys into chat (use env files that are gitignored, or a Foundry keystore). Commit after every working step. Run the 07 tests before every deploy.

## 5. Don't install (out of scope this weekend)

Definitive Flash MCP (Continuity-only prize), Chainlink CRE/CCIP (fourth partner, no confirmed Whitechain lane), Arkiv SDK, Lightning.
