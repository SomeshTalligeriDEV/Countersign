# Countersign agent client

Inject an account implementing `address` and `signTypedData`, a trusted `readPolicy` function, the deployed mandate address/ID, permitted merchant IDs and an explicit `maxAmount` in token base units. The agent needs no USDT or WBT to sign; settlement still requires the funded owner and relayer.

The client validates chain 1874, official token, contract, merchant, request resource, deadline and local/chain policy limits before signing. It signs only PaymentIntent. Pending-confirmation results contain a `retry()` function reusing the identical payment header. No private key or signature is logged. HTTPS is required except loopback development.

Above-threshold requests return `approval_required`; creating/polling World approvals is not implemented. Callers must not treat this result as approved. Response status remains explicit; an HTTP error is not settlement success. Exact string request bodies are supported; arbitrary object bodies are rejected to avoid ambiguous hashing.

The separate demo CLI supports `npm --prefix apps/demo-agent start -- buy-report`, after server-owned env configuration. It reads current policy and remaining budget via RPC. Other scenario commands are deliberately unimplemented. No live end-to-end run is recorded.
