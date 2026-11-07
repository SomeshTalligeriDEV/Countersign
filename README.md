# Countersign

**Agents have identities. Identities have permissions. Payments have proofs.**

Countersign combines ENSv2 agent identities and scoped record permissions with contract-enforced USDT spending mandates on Whitechain. Sensitive payments require fresh World sandbox authentication, a separate attestor signature and the owner's signature over the exact payment.

This is a **testnet implementation and systems-security research artifact with a locally revised manuscript**. It is not independently audited, production-ready or a new cryptographic authorization primitive.

**[Live app](https://countersign.someshtalligeri12.workers.dev)** · [Live API](https://countersign-api-44lz.onrender.com/health/ready) · [Source](https://github.com/SomeshTalligeriDEV/ETHGLOBAL) · [Project owner](https://github.com/SomeshTalligeriDEV) · [Research PDF](research/paper/COUNTERSIGN-Research-Paper.pdf) · [Security](SECURITY.md) · [Release evidence](docs/FINAL-RELEASE-REPORT.md)

## Release status

**Local implementation and recorded testnet evidence exist. End-to-end release acceptance is incomplete.** The latest recorded regression results are 157 Node tests, 131 Solidity test executions, three shared digest vectors, JWT fixtures, lint, TypeScript and contract formatting passing. Solidity executions include inherited repetitions; fixture tests are not live integration tests.

| Area | Implemented and evidenced | Remaining acceptance gap |
|---|---|---|
| ENSv2 identity and permissions | Recorded registry/resolver setup and scoped grants; local passport and permission logic | Deployed-state fork execution, negative-permission and revocation verification |
| Whitechain settlement | Recorded verified contracts and official-USDT payments; local budget, replay and payout-binding tests | Fresh settlement against the changed application and full merchant/browser journey |
| World human approval | Recorded sandbox-approved payment; local JWT, exact-signature, session and cancellation tests | Fresh integrated sandbox sign-in and browser acceptance; no production identity assurance |
| Passport and policy monitoring | Block-specific reads, effective spending calculations, persistent monitor and strict relay gate tested with fixtures | Complete live authority evidence, monitoring configuration and current policy comparison |
| Independent receipts | Historical receipt, transfer, signature and policy checks tested with fake RPC responses | Real archive-RPC verification and browser upload/download acceptance |
| Browser and hosting | Routes and deployment configuration implemented; lint/types pass | Human laptop build passes; browser fixtures 35 passed / 5 failed (fixes awaiting rerun); reliable public backend not established |
| Full demonstrations | Two historical six-step runs each reached **5/6** | Two fresh complete runs remain **NOT_RUN** |
| Research | **22-page balanced PDF, 25 references, eight vector figures**, clean source rebuild and internal page review | Author/rights/license confirmation and scientific sign-off; local revision not deposited; user-provided Zenodo record not rechecked |

The [acceptance matrix](docs/release/FINAL-GAP-MATRIX.md) is the detailed source of truth. No production-ready claim is made.

## Live deployment

| Component | URL | Host |
|---|---|---|
| Web app | https://countersign.someshtalligeri12.workers.dev | Cloudflare Workers (OpenNext), `web/wrangler.jsonc` |
| API + attestor | https://countersign-api-44lz.onrender.com ([readiness](https://countersign-api-44lz.onrender.com/health/ready)) | Render, Docker (`apps/api/Dockerfile`, `deploy/render-start.sh`) |
| Mirror | https://web-rouge-one-10.vercel.app | Vercel |

Render's free tier sleeps when idle, so the first request can take about 50 s. Its disk is ephemeral: the observer rebuilds payment state from Whitechain after a restart. Keys are Render secret files, never frontend variables. The API and attestor run as separate processes in one container. That is a testnet convenience; production must isolate the attestor key.

## Demo video

Narrated 3:37 walkthrough recorded on 7 November 2026 (video link on the ETHGlobal submission page). The live scenes ran against Whitechain Sepolia as they were recorded:

| Scene | Real on-chain result |
|---|---|
| Owner connects wallet (mandate owner `0x1079…25c7D`) and **pauses** the mandate | [pause tx 0x1a232e63…f9cc](https://explorer.testnet.whitechain.io/tx/0x1a232e63524f6a992271cccdee1e37122366f03d5cdc5aa86f8714c370ccf9cc) |
| Agent tries to pay while paused | Refused (`inactive_agent_policy`), no transfer |
| Owner **unpauses** | [unpause tx 0x97d66455…4d98](https://explorer.testnet.whitechain.io/tx/0x97d66455a328b2b8cb5cc434c7635ff20f557ee74f948cdeb9ea6fd58a2f4d98) |
| Agent pays 0.50 USDT, gas sponsored by the relayer | [payment tx 0xefc8692e…3c3d](https://explorer.testnet.whitechain.io/tx/0xefc8692e551bfdef4f468f85bee2e1a06d4491432a24e3277776b53c177a3c3d) |
| Tampered amount / redirected payout | Both refused (`bad_intent_sig`), no transfer |
| World-approved 1.50 USDT payment | [tx 0x98fa814e…b531](https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531) (recorded earlier, labelled as such in the video) |

In the recording, the owner wallet is a browser EIP-1193 provider that forwards each request to the owner's local Foundry keystore. The key never enters the browser. Other real payments made on 7 November: [0xc79f0923…bfff](https://explorer.testnet.whitechain.io/tx/0xc79f0923082896c15041bfc3afb8024a3c919802ae3da38a5f3a480531bcfbff), [0x80c41d70…872d](https://explorer.testnet.whitechain.io/tx/0x80c41d70946df6061391e5e1bdb70f8ad74048be4f1e2c2ec43340a55a12872d), [0x3b7fe78d…09d9](https://explorer.testnet.whitechain.io/tx/0x3b7fe78d21cf28f3fe883a04ed7617bba6a22f62889775da41ccd465c27009d9).

## What Countersign protects

An agent may request a payment without receiving unrestricted control of the treasury. The owner chooses the agent, merchant allowlist, limits, human threshold and expiry. The agent signs exact payment terms; the contract checks them against current policy before moving official USDT.

1. The owner creates a mandate and grants a limited token allowance. Treasury setup still costs gas.
2. A dedicated ENSv2 permissioned resolver publishes the agent's identity, endpoint and policy references. Owner-controlled financial records are distinct from agent-editable operational records.
3. A merchant returns an HTTP 402 quote. The agent signs its amount, payout, merchant version, order, resource, nonce, epoch and deadline using EIP-712.
4. The relayer validates, simulates and reserves bounded GasGuard capacity before submitting. The agent need not hold WBT or USDT.
5. At or above the threshold, fresh World sandbox authentication is followed by the exact owner-wallet approval and attestor assertion. Authentication alone is not transaction approval.
6. The Mandate executes the protected transfer. The observer derives confirmed status from logs; merchants receive receipts, signed webhooks and history.

![Architecture](docs/architecture.svg)

## ENSv2 identity and authority

A database can publish an agent profile; ENSv2 supplies publicly inspectable onchain record-write permissions. Countersign uses a hierarchical UserRegistry and a dedicated PermissionedResolver. Scoped agent grants cover `agent-context` and `agent-endpoint[web]`, following the current draft ENSIP-26. Custom `countersign.*` records belong to the application.

Text-key permissions are resolver-wide, so independently administered agents need separate resolvers. The new block-pinned reader checks configured registry/owner/resolver anchors, known root and scoped roles, protected records and owner recovery. It does not enumerate every administrator or prove ancestor/proxy governance.

**Whitechain remains financially authoritative.** Editing an ENS record cannot rotate the Mandate's signer or invalidate its signatures. The Security Passport shows this boundary explicitly. The historical 7/8 comparison has a missing merchant aggregate because the contract stores an allowlist mapping, not a set hash. Missing administration or name-binding evidence is also left UNVERIFIED; no artificial 8/8 success is produced.

New local features:

- **Security Passport:** pinned state, explicit mismatch/stale/unavailable results, effective spending calculations and downloadable observations.
- **Strict drift monitor:** SQLite checkpoints, bounded registry/resolver log backfill, restart recovery, provider disagreement handling and reorg quarantine. The optional relay gate fails closed. Today's partial passports do not pass it. [Scope and setup](docs/release/ENS-MONITOR.md).
- **Independent payment verifier:** `/verify/[paymentId]` and CLI check uploaded integrity, identified receipts, official-token transfers, EOA signatures and reconstructible historical policy. Missing reviewed runtime hashes or ambiguous same-block state stay UNVERIFIED. Ordinary RPC evidence is not a consensus proof. [Verification guide](docs/release/PAYMENT-EVIDENCE.md).
- **Owner revocation workflow:** `/agent/[name]/revoke` prepares pause, epoch invalidation and separate ENS scoped removals. Explicit owner wallet actions include fresh-plan comparison, simulation, durable submission tracking and concurrent-tab protection. Mocked-provider tests pass; real browser/live execution remains unverified. [Workflow](docs/release/REVOCATION-WORKFLOW.md).

## Recorded deployments and settlement

These are preserved project execution records, not fresh RPC corroboration of this release.

| Item | Recorded evidence |
|---|---|
| Whitechain Sepolia | Chain 1874, official USDT `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`; decimals read at runtime |
| MerchantRegistry | [0x2686f693A2C959568e650e0A5563E6244f2329E2](https://explorer.testnet.whitechain.io/address/0x2686f693A2C959568e650e0A5563E6244f2329E2) |
| Mandate | [0x923298375911A173da34C715da2718c0c9889EbA](https://explorer.testnet.whitechain.io/address/0x923298375911A173da34C715da2718c0c9889EbA) |
| First 0.50 USDT payment | [Settlement transaction](https://explorer.testnet.whitechain.io/tx/0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021) |
| World-approved 1.50 USDT payment | [Sandbox-approved settlement](https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531) |
| Source verification | [Both Whitechain contracts recorded verified](docs/proof/VERIFY-OUTAGE.md) |
| ENS agent | `agent1.countersign.eth`, Ethereum Sepolia 11155111; [registry, resolver, grant and record transactions](docs/proof/A15-ens-onchain.md) |

Historical six-step demos each passed 5/6 steps and missed World approval at the time. A later standalone World success does not retroactively complete them. Fresh release [run 1](docs/evidence/final/RUN-1.md) and [run 2](docs/evidence/final/RUN-2.md) are **NOT_RUN**. The historical live budget rejection was OverPerTx, not OverPeriod. Registry-change-after-approval and current real-wallet browser acceptance remain open.

## Security boundaries

- Exact EIP-712 domains bind chain and deployment. Token identity is immutable deployment state, not a separate intent field. Owners support ERC-1271; agents and attestors use ECDSA.
- Nonces and order deduplication protect against repeated transfers. Period spending does not reset on policy changes or refunds. There is no lifetime or wallet-wide cap.
- Epoch revocation invalidates older signatures but does not disable fresh signatures from the current agent. Pause blocks while active; unpause alone can revive unused unexpired signatures.
- API approval TTL is 120 seconds; contract authentication freshness is 300 seconds, with the signed deadline also enforced. Cancellation cannot invalidate an already exported signature.
- World sandbox identities are test identities, not production proof of personhood. The separate attestor process trusts shared persisted identity state.
- ENS and Whitechain changes are not atomic. Offchain relay refusal cannot prevent a direct call satisfying Whitechain policy.
- GasGuard constrains the service's requests. It cannot constrain a stolen key used elsewhere. Complete OP data-fee accounting and multiprocess nonce coordination remain limitations.
- Three successor blocks are an application confirmation policy, not irreversible L1 finality. Refunds need merchant funds and authorization; there is no forced reversal.

[Security review](docs/release/SECURITY-REVIEW.md) · [Security model](docs/ens/SECURITY-MODEL.md) · [Protocol](docs/PROTOCOL_SPECIFICATION.md) · [Limitations](docs/ASSUMPTIONS_AND_LIMITATIONS.md).

## Repository and setup

| Path | Purpose |
|---|---|
| `contracts/` | Mandate, merchant registry and execution/invariant/adversarial tests |
| `apps/api/`, `apps/attestor/` | Settlement, identity, durable relay, observer and separate signing process |
| `packages/ens/` | Discovery, scoped permissions, passport, verifier and revocation workflow |
| `packages/merchant/`, `packages/agent/` | Quote/receipt middleware and intent-signing client |
| `apps/demo-merchant/`, `apps/demo-agent/` | Separate merchant integration and payment scenarios |
| `web/` | Owner, merchant, approval, receipt and ENS views |
| `research/` | Draft manuscript, references, historical raw results and reproduction scripts |

Toolchain: Node 24.10+, Foundry 1.9.0, solc 0.8.30, Prague, viaIR and optimizer 200. OpenZeppelin 5.4.0 and viem 2.35.0 are pinned. Use lockfiles:

```sh
npm ci --prefix contracts --ignore-scripts
npm ci --prefix packages/shared --ignore-scripts
npm ci --prefix packages/ens --ignore-scripts
npm ci --prefix apps/api --ignore-scripts
npm ci --prefix web --ignore-scripts
python3 scripts/release-checks.py
npm --prefix web run dev
```

Configure service-local gitignored environment files from examples. Never place signing keys in frontend variables. See [deployment plan](docs/release/DEPLOYMENT-MANIFEST.md), [stable hosting preparation](deploy/RELIABLE-HOSTING.md) and [browser acceptance commands](docs/release/BROWSER-ACCEPTANCE.md). Transactions, public infrastructure changes and pushes require review and specific approval.

## Tests and research reproducibility

Run `npm run release:verify` from a normal network/port-enabled terminal for evidence-preserving local, RPC, fork and browser checks. This command never signs, broadcasts, deploys or publishes. It distinguishes fixture/fork checks from pending live runs.

The latest local regression checks are in [gap-closure checks](docs/evidence/gap-closure/final-checks/checks.json). Four acceptance-runner tests also pass. [Gap-closure report and blockers](docs/release/GAP-CLOSURE.md). The [human laptop acceptance run](docs/evidence/acceptance/20261107T000728602239Z/results.json) passed the production build and executed browser fixtures:35passed,5failed,zero skipped. Four alert-selector failures and a homepage contrast issue have source fixes pending rerun. ENS fork compilation passes, but RPC HTTP errors blocked execution in that run. [Current project summary](docs/release/CURRENT-PROJECT-SUMMARY.md). New monitor, verifier and wallet tests explicitly use fixtures.

```sh
npm test
forge test --root contracts --offline -vvv
npm --prefix apps/api run test:world-fixtures
npm --prefix packages/shared test
npm --prefix web run lint
web/node_modules/.bin/tsc --project web/tsconfig.json --noEmit
python3 scripts/secret-scan.py --self-test
```

The manuscript is **Countersign: Transaction-Bound Agent Payments with Whitechain, World and ENSv2**, provisionally attributed to Somesh S. Talligeri. Its recorded evaluation checkpoint remains separate from the newer integration tests; historical measurements were not replaced. The 22-page PDF compiles and has been internally inspected page by page. [Source rebuild and provenance](research/paper/REPRODUCIBILITY.md) · [Related work](research/LITERATURE_REVIEW.md) · [Publication status](research/PUBLICATION-STATUS.md).

Gas figures are single-case **local mock-token call-region measurements**, excluding intrinsic gas, setup, network fees and human time. They are not Whitechain mainnet/public-testnet benchmarks. The contribution is a systems-security implementation and evaluation, not a claimed new authorization primitive. Author/contributor consent, scientific sign-off and separate paper/software licenses remain unresolved. No arXiv submission occurred.

## Sponsor alignment and disclosures

[Official ENS requirements](https://ethglobal.com/events/mumbai/prizes/ens) accept Sepolia for Best Use of ENSv2 and require a functional live demo and accessible source. The separate Continuity integration category requires mainnet. [Track mapping](docs/SPONSOR_REQUIREMENTS.md) records Whitechain Operate/Scale and World requirements. Universal gasless onboarding is not implemented; treasury setup still costs gas. No award, endorsement or eligibility determination is claimed.

Prior work: supplied chupke and EzPayz-derived code were recorded as removed/rewritten; generic starter configuration and provenance appear in [the inventory](docs/proof/W9-prior-code-inventory.md). Creation dates, rights and event eligibility require author confirmation. Git dates alone do not establish originality. No project-wide license grant is inferred; dependency licenses remain applicable.

AI assistance: OpenAI Codex assisted with implementation, debugging, tests, coordinated review, evidence handling, literature discovery, diagrams and manuscript preparation. Human authors remain responsible for code, claims, references and distribution rights. No model is listed as an author.

## Research draft

The manuscript is an **locally revised systems-security preprint draft**. Its original diagrams describe the implementation; gas charts use preserved local mock-token measurements. The user supplied [Zenodo record 24025815](https://zenodo.org/records/24025815); its deposited version could not be independently retrieved in this pass. The balanced local revision has not been uploaded.

[Reader PDF](research/paper/COUNTERSIGN-Research-Paper.pdf) · [Rebuild instructions](research/paper/REPRODUCIBILITY.md) · [Quality report](research/PDF-QUALITY-REPORT.md).

Author/contributor consent, manuscript licensing and scientific sign-off remain pending. No peer review or publication of this local revision is claimed.

## Project metadata

Maintainer profile: [SomeshTalligeriDEV](https://github.com/SomeshTalligeriDEV). This identifies the GitHub project owner; manuscript author order and contributor consent are separate publication decisions.

Suggested GitHub topics: `ens`, `ensv2`, `ethereum`, `solidity`, `web3`, `agent-identity`, `delegated-authorization`, `eip-712`, `stablecoin-payments`, `whitechain`, `world-id`, `security-research`, `reproducible-research`, `ethglobal`.

[Repository description and topic settings](docs/release/GITHUB-METADATA.md) are prepared locally. Public GitHub metadata and the remote branch have not been changed by this documentation update.

## Illustrated project presentation

[Seven-slide PowerPoint](presentation/COUNTERSIGN-7-Slide-Comic-Deck.pptx) · [PDF](presentation/COUNTERSIGN-7-Slide-Comic-Deck.pdf) · [Offline deck and notes](presentation/README.md) · [Original transparent logo](presentation/assets/countersign-logo.png).

The manhwa-inspired deck explains Whitechain settlement, World authentication and ENSv2 discovery with equal architectural attention. Illustrations explain the story; they are not product screenshots or live-chain evidence. The notes distinguish current local tests, historical transactions and open verification gaps.
