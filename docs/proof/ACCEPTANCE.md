# Feature acceptance matrix — live Whitechain testnet (1874), 2026-11-06 19:32 IST

Environment: deployed Mandate 0x9232…9EbA + MerchantRegistry 0x2686…29E2; official USDT 0xcedfB561…; API+relayer+GasGuard (:3011), attestor (:3002), observer, demo merchant (:4000) running **locally** (not yet on a public URL). Agent 0x91E3…A293 holds 0 USDT / 0 WBT throughout.
"API rejection" = refused before broadcast; "on-chain revert" = mined tx with status 0.

| # | Feature | Result | Evidence |
|---|---|---|---|
| A1 | Small payment auto-settles | **PASS** | relayed pay() [0x713f…39ae](https://explorer.testnet.whitechain.io/tx/0x713fdfa883b7ed7acaebfc5a281f9a77c7cb10cc0622f6626c07420b677939ae), [0xcc8d…9eb3](https://explorer.testnet.whitechain.io/tx/0xcc8d0d3d0941fa8e2072f8a08dbc45e9e664fbc82ebcae435a295cb248089eb3), [0x80a2…8078](https://explorer.testnet.whitechain.io/tx/0x80a23cc2a8da4d8209f5dc2cb2c479874ab175332e052b04d9ad31e043e48078); first direct pay [0x6862…4021](https://explorer.testnet.whitechain.io/tx/0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021) |
| A2 | Over-limit payment waits for approval then settles | **WAITING-ON-HUMAN** | needs World sandbox app + phone (World configured=false) |
| A3 | Tamper amount reverts | **PASS** | API: bad_intent_sig (G6 runs 1+2); on-chain revert BadIntentSig [0xac0d…f17f](https://explorer.testnet.whitechain.io/tx/0xac0dc1c00dbd1b738b9f8c959b4375dd696dce9a9f139c76f0bf0c94484df17f) |
| A4 | Tamper payout reverts | **PASS** | API: bad_intent_sig; on-chain revert RegistryMismatch [0xebf5…217f](https://explorer.testnet.whitechain.io/tx/0xebf520a6cccc825ec3b9f383299731552198715c8be98d0f3a912ffc3bd8217f) |
| A5 | Over budget reverts | **PASS** | API: OverPerTx; on-chain revert OverPerTx [0x4759…464c](https://explorer.testnet.whitechain.io/tx/0x47599f29d943ac96b708f43655c8aa4b2b55ab640173e2b260d491c13bbb464c) |
| A6 | Revoke then replay reverts | **PASS** | revoke [0x6d7b…f084](https://explorer.testnet.whitechain.io/tx/0x6d7b2c0c3e3c5de6c1a2e69a184208155195dd81ad8707e295502a80cbf1f084) / [0xc430…8983](https://explorer.testnet.whitechain.io/tx/0xc4309699e5dec0d9489db228b9ce6632ee1e23c22ac16890f8e5691463ab8983); replay rejected StaleEpoch (twice) |
| A7 | Registry change after approval reverts | **NOT RUN** | depends on A2 approval flow; contract-level covered by forge tests (Mandate.t.sol RegistryMismatch) |
| A8 | GasGuard rejects arbitrary relayer call | **PASS** | not_allowlisted_call (twice); also real denial gas_price_or_limit (G2-onchain.md) |
| A9 | Pause blocks payments | **PASS** | pause [0x75b3…6737](https://explorer.testnet.whitechain.io/tx/0x75b30ba11e2cc97b314b30dfb84ee59544bb0dd3a28438edffa522e79d8c6737) → valid pay reverted Paused [0x644f…e2dd](https://explorer.testnet.whitechain.io/tx/0x644fcc28e568e049191c6f6ac12999c17c179c0f4c00d003f03e5bf658f6e2dd) → unpause [0x533f…824f](https://explorer.testnet.whitechain.io/tx/0x533f014f5743c54cc5230fad4f8606939e4da2132029d6bfaaa0429bfe3a824f) |
| A10 | Refund within cap | **PASS** | refund 0.25 [0x921d…6fe3](https://explorer.testnet.whitechain.io/tx/0x921d428645cbf91100523d79be8dc102aacccec8f354aaca343f576d8b706fe3); +0.30 reverted OverRefund [0x5a5a…eec7](https://explorer.testnet.whitechain.io/tx/0x5a5a7c5116bab528b518f018713f45b8d35311e86ad4bd99bbfa8f7fc637eec7) |
| A11 | Webhook delivered + signature verified | **BLOCKED** | webhook-worker exists and is unit-tested but no process runs it; events reach the outbox table only |
| A12 | CSV export | **PASS** | /v1/payments.csv lists 4 real payments incl. partially_refunded (docs/proof/A12-payments.csv) |
| A13 | Receipt matches chain | **PASS** | /v1/payments/0x13d9… == Mandate.payments() storage: mandate, merchant, payout, amount 500000, refunded 250000 |
| A14 | Owner dashboard actions via real wallet | **WAITING-ON-HUMAN** | wallet clicks on /owner (HUMAN-RUN.md) |
| A15 | ENS policy read-back | **PARTIAL (read-only)** | ens:smoke live Sepolia resolve PASS; no agent subname written (writes not verified/unfunded) |
| A16 | World real approval + one real failure | **WAITING-ON-HUMAN** | World sandbox app not registered |

Six-step demo twice: docs/proof/G6-demo-run.txt (5/6 PASS per run; order-40 waiting on World).
