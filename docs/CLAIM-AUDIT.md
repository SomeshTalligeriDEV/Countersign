# Claim audit

| Claim/location | Evidence | Current wording/status |
| --- | --- | --- |
| README contract enforcement | docs/proof/G1-forge-test.txt (118/118, 2026-11-06) | Locally tested, each property mapped to test names; not audited, not deployed |
| README live payment / gas sponsorship | No actual Countersign tx supplied | Explicitly intended/configured behavior; no sponsored payment recorded |
| README merchant/demo UI | Source exists, lint/types pass | Implemented; browser tests unexecuted |
| README attack commands | G6-demo-run.txt | Corrected (I9): live six-step runs twice + on-chain revert txs |
| World approval | Signed local JWT fixtures and signature tests | Fixture-only identity evidence; real issuer unverified |
| One-page brief | docs/ONE-PAGE-BRIEF.md | Prototype claims and remaining evidence explicit |
| Root PRD historical attack/market figures | Supplied references, not reverified in current build | Design spec banner added; no repetition as verified pitch fact |
| docs/13 answers | Source files linked | Public permalinks, ratings, eligibility, live evidence TODO-HUMAN |
| Fresh/Continuity and Scale qualification | No staff decision | Not claimed |
| New adversarial tests | docs/proof/G1-forge-test.txt (AdversarialEdges 43/43) | EXECUTED, pass |
| README "75 Solidity tests" / Whitechain feedback "human-run 75 tests" | superseded by G1-forge-test.txt | Replaced with 118/118 |
| README "relayer is intended to sponsor gas from test WBT" | no tx | Removed; GasGuard tests listed, "no sponsored payment broadcast" stated |
| README skills consulted (blockchain-master, frontend-design-guidelines, World skill) | no proof file | Removed |
| WORLD_DEBRIEF "user installed jose in laptop terminal" | loop-M3 proofs | Kept, cited |
| On-chain deployment | deployed.json, G2-onchain.md | Corrected (I9): deployed, NOT verified (VERIFY-OUTAGE.md) |
| README "no sponsored payment has been broadcast" / "no real USDT payment" | G2-onchain.md, A12-payments.csv | Corrected (I9): real relayed official-USDT payments linked |
| README "full webhook transport unfinished" | A11-webhooks.txt | Corrected (I9): worker delivers to operator-configured URL |
| README "live adapters UNEXECUTED" | git log D2/D4 | Corrected (I9): human:deploy executed, verify skipped |
| Hosting | I2-services.md | Services local only; stated in README |
| World sign-in | fixtures only | Labelled FIXTURE-only everywhere |
| README "pnpm test 75/75" | F9 run 2026-11-06 | Replaced with 93/93 |
| README "mocked-wallet browser tests remain unexecuted" | docs/proof/W5-playwright.txt (8 passed) | Replaced: executed 8/8 FIXTURE |
| README "selected EzPayz patterns adapted" / "Legacy Chupke entrypoints retired" | W9 F5 update | Replaced: chupke removed, EzPayz code rewritten |
| docs/13 "ENS was not implemented" | packages/ens, F3-ens-smoke.txt | Replaced: read-only live, writes UNEXECUTED |
| README ENS/World REAL rows | F2-world-smoke.txt, F3-ens-smoke.txt | Read-only REAL only; sign-in/writes not claimed |

No blanket claim that all routes are live, instantaneous, audited, eligible, or prize-winning is supported. A recorder must distinguish contract execution, API rejection, fixture proof and real issuer evidence. Do not use API-only rejections as explorer revert transactions.
