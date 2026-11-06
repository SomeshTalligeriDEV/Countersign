# W5 real-wallet checklist (UNEXECUTED)

Status: UNEXECUTED. The automated W5 run uses FIXTURE/MOCKED-WALLET only. Run these by hand with a real
browser wallet on **Whitechain Sepolia testnet (chainId 1874 / 0x752)** with test USDT only. Never paste private keys or seed phrases anywhere.

Prereqs: a browser wallet (e.g. MetaMask) with Whitechain Sepolia added, a funded **testnet** owner account, and backend env configured (`web/.env.local`, not committed).

1. Start the app:
   ```
   cd ~/Desktop/countersign/web && npm run dev -- --hostname 127.0.0.1
   ```
   Expected: `Ready` and `http://127.0.0.1:3000`.
2. Check the wallet network in the browser console:
   ```
   await window.ethereum.request({method:'eth_chainId'})
   ```
   Expected: `'0x752'`.
3. Open `http://127.0.0.1:3000/owner`, then click **Connect wallet**.
   Expected: the wallet asks you to connect, and the setup form appears with your address.
4. Fill the form: Agent wallet, Attestor wallet, Max per payment `2`, Period budget `10`, Approval threshold `1`, Allowance `5`, Period `3600`, Expiry a future Unix time. Click **Review setup**.
   Expected: the plan warning shows, plus **Confirm step 1 in wallet**. Nothing is sent before you click it.
5. Click **Confirm step 1 in wallet**, then the next step.
   Expected: the wallet shows an approve, then a create-mandate tx to the mandate contract, value 0. Each tx hash opens on `explorer.testnet.whitechain.io`.
6. Open `http://127.0.0.1:3000/demo` and click **order-40** (above the threshold).
   Expected: the output shows a pending approval. Copy the approval id/URL.
7. Open `http://127.0.0.1:3000/approve/<approvalId>` and complete World verification.
   Expected: status becomes `world_ok`, and **Sign exact payment approval** appears with amount 40 and the payout address.
8. Click **Sign exact payment approval**.
   Expected: the wallet shows EIP-712 `PaymentApproval` on chainId 1874. After you sign, the page says "Payment submitted. Awaiting confirmed contract events." It must NOT say settled at this point.
9. On `/demo`, click **buy-report**.
   Expected: `done` with a txHash link that resolves on the explorer.
10. Open `http://127.0.0.1:3000/r/<paymentId>` (use the paymentId from the settlement event).
    Expected: the amount in USDT, "Payment confirmed", the mandate, merchant and payout, and a working settlement tx link.
11. Open `http://127.0.0.1:3000/r/not-an-id`.
    Expected: "Invalid payment ID".
12. Open `http://127.0.0.1:3000/merchant`, enter the bytes32 merchant ID, and click **Read registry**.
    Expected: "Registered merchant", owner, payout and version, with the payment from step 9/10 under "Confirmed incoming payments".
13. Negative check: switch the wallet to another network and retry step 12's **Update payout in wallet**.
    Expected: "Select Whitechain Sepolia." and no tx prompt.
14. Record the results (tx hashes and screenshots) in `docs/proof/W5-real-wallet-results.md`, with no secrets.
