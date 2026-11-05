# 06 · ENSv2 Layer (optional: build last, cut if late)

**Cut-off:** if the six demo steps (09) aren't working by **Fri 18:00 IST**, skip this file and don't select the ENS prize.

## 1. Why ENS here is not decorative

ENS gives the agent a **public, portable identity that merchants and other agents check without our API**:

1. **Discovery and verification by the merchant.** Before quoting, the merchant middleware resolves `buyer.acme.eth` on Sepolia. It confirms the agent address, its owner, and its ENSIP-26 records (`agent-context`, `agent-endpoint[web]`), and reads `countersign.mandate = "eip155:1874:<MANDATE>:<mandateId>"`. Merchants can refuse unknown or expired agents.
2. **Delegated roles (Enhanced Access Control).** The agent key may update only `agent-endpoint[web]` and `agent-context`. Only the owner can set `countersign.mandate` and `countersign.policy`. The agent can't rewrite its own policy, which is the Grok failure fixed by permissions.
3. **Lifecycle.** The subname has an absolute `expiry`. The owner commits `ensNamehash` + that expiry into the Whitechain mandate (`expiry` field), and `pay()` rejects payments after it. Early revocation is `unregister` on ENS **plus** `revoke` on Whitechain.

**Honest claim:** Whitechain enforces the *signed commitment* (namehash + expiry). It doesn't read live ENS state. Revocation is enforced by the Whitechain `revoke`, and ENS `unregister` makes the agent fail merchant discovery.

## 2. Setup on Sepolia

From the ENS docs (verify addresses on [the deployments page](https://docs.ens.domains/learn/deployments#sepolia-ensv2) before use):

| Contract | Sepolia address |
|---|---|
| ETHRegistry (PermissionedRegistry for .eth) | `0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4` |
| PermissionedResolverImpl | `0x115eb53f0c60696633855f90b138178fb40b2b2c` |
| VerifiableFactory | check deployments page |
| UserRegistryImpl | check deployments page |

Libraries: **viem ≥ 2.35**, **ENSjs ≥ 5.2.5** for v2 writes (`@ensdomains/ensjs/wallet/v2`). Foundry: `forge install ensdomains/contracts-v2`.

Steps:
1. Register a parent name on Sepolia (for example `countersign-demo.eth`) through the ETHRegistrar.
2. Deploy a **UserRegistry** proxy via `VerifiableFactory.deployProxy(USER_REGISTRY_IMPL, salt, initialize(grants))`, then `ETHRegistry.setSubregistry(labelhash, userRegistry)`. Without this, subnames never resolve.
3. For each agent, deploy **its own Permissioned Resolver** via the factory. Resolver role grants aren't per-name: "a role holder can write the covered records on every name served by the resolver instance."
4. Register `buyer.countersign-demo.eth` in the UserRegistry with `register(label, owner, registry, resolver, roleBitmap, expiry)`. `expiry` is an **absolute** uint64 timestamp (for example now + 30 days).
5. On the agent's resolver: the owner keeps root `ROLE_SET_TEXT`. Grant the agent key only these setters:
   ```ts
   const setter = encodeFunctionData({ abi, functionName: "setText", args: ["0x", "agent-endpoint[web]", ""] });
   await wallet.writeContract({ address: resolver, abi, functionName: "grantSetterRoles", args: [setter, agentAddress] });
   // repeat for "agent-context"
   ```
6. Owner sets text records: `countersign.mandate`, `countersign.policy` (JSON with limits and policy hash), `agent-context`.
7. Never use `setApprovalForAll` or the docs' demo `ALL_ROLES` bitmap. Both grant every role.

Gotchas: setters take the **DNS-encoded name** (`toHex(packetToBytes(name))`), not a namehash. Look up resolvers fresh before writes. Token IDs are mutable, so key caches by labelhash.

## 3. Demo moments (adds about 30 seconds)

- The agent tries `setText(countersign.policy, …)` and the tx reverts (unauthorized role). The agent updates `agent-endpoint[web]` and it succeeds.
- The merchant view shows "Verified agent: buyer.countersign-demo.eth · owner 0x… · expires 6 Dec" read live from Sepolia, not hard-coded.
- After revoke: `unregister`, and the merchant lookup shows the agent as unknown.

## 4. Optional extra

Add an ENSIP-25 `agent-registration[<ERC-7930 registry>][<agentId>] = "1"` record if you also register the agent in an ERC-8004 registry. Skip it unless everything else is done.
