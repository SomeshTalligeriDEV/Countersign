# ENS prize requirements → code/proof

Source: https://ethglobal.com/events/mumbai/prizes (fetched 2026-11-06 ~18:30Z). Target: **Best Use of ENSv2** ($7,000). The "Existing Project" prize requires mainnet and Continuity Track; not targeted.

| Requirement (verbatim) | Countersign mapping | Status |
|---|---|---|
| "Project must be built on ENSv2 on Ethereum mainnet or Sepolia." | Sepolia; packages/ens (reads via Universal Resolver), scripts/ens-setup.mjs (ENSv2 UserRegistry subname + PermissionedResolver text records) | MET: countersign.eth + agent1.countersign.eth registered on ENSv2 Sepolia, own UserRegistry + PermissionedResolver ([A15-ens-onchain.md](A15-ens-onchain.md)) |
| "ENSv2 features should be central to the product, not a cosmetic add-on." | Agent addressed by subname `agent1.countersign.eth`; text records publish the enforced policy (limits, merchants-hash, attestor, mandate address, chainId 1874, mandate id, epoch); drift check shows MATCH/MISMATCH vs live Mandate state; revoke clears records alongside the on-chain epoch bump | Judgement call. Built: own subregistry, per-agent PermissionedResolver, policy records, agent key scoped to two records (grantSetterRoles), addr = agent, live drift 7/8 MATCH (merchantsHash MISSING by design). Revoke-ENS built (`--revoke`), UNEXECUTED |
| "Your demo must be functional and not just include hard-coded values." | Records are read live from Sepolia and compared with live Whitechain reads; no hard-coded record values in the UI | MET: live drift route reads Sepolia + Whitechain ([A15-ens-live.txt](A15-ens-live.txt), [I6-live-url.txt](I6-live-url.txt)) |
| "project showcase must have a link to a live demo" | https://web-rouge-one-10.vercel.app (backend via quick tunnel, live only while build laptop is up) | MET |
| "code needs to be open source and accessible on Github" | https://github.com/SomeshTalligeriDEV/ETHGLOBAL (public, CI green) | MET |

Honest boundary: Whitechain contracts cannot read ENS. Enforcement is the Mandate contract's signed commitments; ENS is the human-readable identity, public policy mirror and role layer.

Before any write: verify ENSv2 Sepolia UserRegistry/resolver addresses and selectors against https://docs.ens.domains/llms-full.txt; if unverifiable, fall back to text records on a resolver for a name the human owns, and say so here.
