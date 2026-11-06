# Demo script (3 minutes, two phones)

Phone A belongs to the buyer and phone B to the friend. Have the explorer tabs open beforehand.

| Time | Show | Say |
|---|---|---|
| 0:00 | Etherscan: any busy address, scrolling its history | "AI agents are starting to shop for us. Give one a crypto wallet today and two things happen: one bad prompt can drain it, and every purchase it makes is public forever. Like this." |
| 0:15 | testnet.zcashexplorer.app: your shielded txid | "This is a Chupke top-up on Zcash. Every shielded payment is a zero-knowledge proof. No sender, no receiver, no amount." |
| 0:30 | Phone A: `/start`, tap the `zcash:` link in Noir Wallet, pay | "One tap from any Zcash wallet. The memo tells the bot who paid, and only the bot can read it." |
| 0:50 | "Top-up received" message | "Detected in about a minute, on public testnet." |
| 0:55 | `/autobuy 200` and `/dailycap 1000`, then "Rs 100 Swiggy card" | "Now the real problem: agents that shop for you. I set my rules once. Under ₹200, it just buys. No tap needed, and it's still private." |
| 1:00 | **Laptop: Pie Lite** (localhost:8787/pie). Tap the mic and say "Ek 500 ka Swiggy card chahiye". It reads the quote back, you say "haan", and the code appears on screen | "Or just speak, in Hindi. It reads the quote back, and it never says the code out loud." |
| 1:10 | (Telegram) "Rs 500 Swiggy card" then Confirm, code, receipt | "Plain Hinglish. The agent searched Bitrefill, but it cannot buy. Only my tap can. The code can't be forwarded and deletes itself." |
| 1:30 | "Send Rahul a Rs 200 Swiggy card for Diwali", gift link, open on phone B | "Diwali gifting. The code is encrypted with a key that only exists in this link. Our server can't read it." |
| 1:50 | Phone A: `/pool 1000 Priya's wedding`, then phone B and a teammate's phone pay shielded with the pool memo, then `/pools` | "Shagun Pool. In India, how much you give at a wedding gets judged. Here nobody, not even the organiser, sees who gave what. Only Zcash can do that on-chain." |
| 2:00 | "My boss asked me to buy 10 Apple cards for a client" | "And this is why Bitrefill's partners in India get nervous. One Bengaluru engineer lost ₹4.35 lakh to exactly this. Chupke stops it." |
| 2:20 | `/orders`, then "my code didn't work" | "If something goes wrong, the agent tracks the invoice and writes the support message for you." |
| 2:40 | README "What works" table | "Honest boundaries: deposits and purchases are real, and the ZEC-to-Bitrefill swap is simulated today. In production it's NEAR Intents. Next 30 days: watch-only server, the zshield-mcp PR, and a pilot with the Mumbai Zcash community." |

**Backup plan:** if the venue Wi-Fi dies, play the screen recording from BUILD.md Step 4.
