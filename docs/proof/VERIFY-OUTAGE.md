# Blockscout verification outage (Whitechain testnet explorer)

Endpoint: `https://explorer.testnet.whitechain.io/api/` via `forge verify-contract --verifier blockscout` (solc 0.8.30, evm prague).
Every attempt returned HTTP body: `{"message":"Contract verification is temporarily unavailable."}` (forge: "Failed to deserialize response ... Failed to submit Etherscan contract verification").
Explorer read APIs stayed up throughout (`/api/v2/smart-contracts/<addr>` 200, `/api/v2/smart-contracts/verification/config` 200).

| UTC timestamp | Contract | Who ran it | Result |
|---|---|---|---|
| 2026-11-06T11:20:08Z | MerchantRegistry 0x2686f693… | human (human-deploy) | temporarily unavailable |
| ~2026-11-06T11:21Z | MerchantRegistry | orchestrator | temporarily unavailable |
| 2026-11-06T11:42:39Z | MerchantRegistry | orchestrator | temporarily unavailable |
| 2026-11-06T12:29:12Z | MerchantRegistry | human (human-deploy) | temporarily unavailable |
| 2026-11-06T12:38:15Z | MerchantRegistry | orchestrator | temporarily unavailable |
| 2026-11-06T14:04:06Z | MerchantRegistry | orchestrator | temporarily unavailable |

Mandate 0x923298375911A173da34C715da2718c0c9889EbA was never reached because the script verifies MerchantRegistry first. Status: **BLOCKED by external outage**; retried every cycle. Deployed bytecode and receipts are on the explorer (G2-onchain.md).
