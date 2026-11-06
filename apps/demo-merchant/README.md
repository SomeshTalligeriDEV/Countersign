# Countersign demo merchant

Separate Node HTTP app serving a **live network-status report** from the API, priced at 0.50 USDT using token decimals returned by the chain-backed terms endpoint. No synthetic market report or fabricated payment is returned. Start after configuring a deployed registry, mandate, observer and relayer in the API:

```sh
cd apps/demo-merchant
# Set MERCHANT_ID to the registered bytes32 ID in this terminal.
npm start
```

GET http://127.0.0.1:4000/api/report returns 402 terms. X-PAYMENT is base64url-encoded JSON `{intent, agentSig}`. A submitted transaction returns 202; retry the same request to wait for the confirmed receipt. An API/report outage returns 503. Persist the SQLite file across restarts.

The charge middleware supports the Express `(req,res,next)` interface but this demo uses Node HTTP without downloading dependencies. For POST routes, retain exact body bytes as `req.rawBody`; hashing a parsed/reserialized body is not supported. No Fastify plugin or webhook receiver wrapper exists yet. This is x402-style, not the standard x402 exact scheme.

This application has not been run with a real payment. API live settlement is still disabled pending remaining relayer work. Middleware tests exercise request/response objects without binding network ports. Concurrent duplicate submissions and a crash before persisting the returned tx hash still rely on the facilitator's durable duplicate rejection; automated recovery remains incomplete.
