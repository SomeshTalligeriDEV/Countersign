# G2 on-chain evidence (Whitechain testnet, chain 1874)

Deployer `0x10799095B510e74DA4c706472B6039e111025c7D` (nonce 0 → 2; 2.0 → 1.98838 WBT, ≈0.0116 WBT for both deploys).

| Contract | Address | Deploy tx | Block | Runtime code | Verified |
|---|---|---|---|---|---|
| MerchantRegistry | [0x2686f693A2C959568e650e0A5563E6244f2329E2](https://explorer.testnet.whitechain.io/address/0x2686f693A2C959568e650e0A5563E6244f2329E2) | [0x3bf2…d707](https://explorer.testnet.whitechain.io/tx/0x3bf28526ba2ac7629d0b70c030d1f64cd2ba873aa634a1b240a867df9a2cd707) | 12366488 | 1126 bytes | **BLOCKED** (explorer: "Contract verification is temporarily unavailable.") |
| Mandate | [0x923298375911A173da34C715da2718c0c9889EbA](https://explorer.testnet.whitechain.io/address/0x923298375911A173da34C715da2718c0c9889EbA) | [0x6351…3a91](https://explorer.testnet.whitechain.io/tx/0x6351883c2e30cf2dbb6d247701b8f2e8cfe36f300ca007c7ec8b2a75fb503a91) | 12366502 | 8925 bytes | **BLOCKED** (same) |

Mandate constructor: official USDT 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7, MerchantRegistry above.
First real USDT pay(): WAITING-ON-HUMAN (deployer USDT = 0).

## D4 setup + first real USDT payment — 2026-11-06 18:07 IST (receipts re-read with `cast receipt`, all status=true, all sent by deployer/relayer 0x1079…5c7D)
mandateId / merchantId / paymentId: `0x5123ac907dd47f0fbaf39da4b9c97f7ed6b5fb2be1441cf04cc345553a8243fe 0x2760fb48ad94751d0412ae3a2e3ed7099b50550fc17607edb650cfecce4042a5 0x13d931f174ee5af6bd7c5f97f17827a11eca33203cf026169fd1d470fc3da070`

| Step | Tx |
|---|---|
| registerMerchant (payout 0x5C9C…5581) | [0x82f8…8e16](https://explorer.testnet.whitechain.io/tx/0x82f8aac77c0f62b779de42af221c4adefaffe7d7fc82aced68595ed6017a8e16) |
| createMandate (agent 0x91E3…A293, attestor 0x9920…4D63) | [0x7f75…660e](https://explorer.testnet.whitechain.io/tx/0x7f7581a8413444805059d798e72103759fd4c7b5ab195c10776a6fb2c5b1660e) |
| setLimits | [0x05e7…36d2](https://explorer.testnet.whitechain.io/tx/0x05e7b1b1d91aedcc08b1cf0696dfb370e8f66ad5930b4e37863f04e6bcb436d2) |
| allowMerchant | [0x60d7…9f26](https://explorer.testnet.whitechain.io/tx/0x60d780994c5afdd29932004391dca23c53b405c0b4240bd419ef8bcf1ca39f26) |
| LIMITED allowance 0.50 USDT | [0xb735…5b66f](https://explorer.testnet.whitechain.io/tx/0xb735124308b0d9cdc32fff984a684e854fff1f8ca6a6473db3955375b0a5b66f) |
| **first real pay() 0.50 USDT** | [**0x6862…4021**](https://explorer.testnet.whitechain.io/tx/0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021) |

Transfer event in the pay() receipt: token 0xcedfB561… (official USDT) from owner 0x1079…5c7D → payout 0x5C9C…5581, amount 500000 (0.50 USDT).
Balances after: owner 6.50 USDT; payout 0.50 USDT; **agent 0 USDT, 0 WBT** (signed the intent only; relayer/deployer paid gas).
