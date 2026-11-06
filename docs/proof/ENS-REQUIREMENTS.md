# ENS prize requirements → code/proof

Source: https://ethglobal.com/events/mumbai/prizes (fetched 2026-11-06 ~18:30Z). Target: **Best Use of ENSv2** ($7,000). The "Existing Project" prize requires mainnet and Continuity Track; not targeted.

| Requirement (verbatim) | Countersign mapping | Status |
|---|---|---|
| "Project must be built on ENSv2 on Ethereum mainnet or Sepolia." | Sepolia; packages/ens (reads via Universal Resolver), scripts/ens-setup.mjs (ENSv2 UserRegistry subname + PermissionedResolver text records) | Reads REAL (F3-ens-smoke.txt). Writes UNEXECUTED: need Sepolia ETH + owned parent (HUMAN-RUN-ens.md) |
| "ENSv2 features should be central to the product, not a cosmetic add-on." | Agent addressed by subname `agent1.<parent>.eth`; text records publish the enforced policy (limits, merchants-hash, attestor, mandate address, chainId 1874, mandate id, epoch); drift check shows MATCH/MISMATCH vs live Mandate state; revoke clears records alongside the on-chain epoch bump | Drift check: in progress. Revoke-ENS: builder exists (`--revoke`), UNEXECUTED |
| "Your demo must be functional and not just include hard-coded values." | Records are read live from Sepolia and compared with live Whitechain reads; no hard-coded record values in the UI | PENDING on writes |
| "project showcase must have a link to a live demo" | needs public host (I6) | WAITING-ON-HUMAN |
| "code needs to be open source and accessible on Github" | `gh repo create … --public` | WAITING-ON-HUMAN |

Honest boundary: Whitechain contracts cannot read ENS. Enforcement is the Mandate contract's signed commitments; ENS is the human-readable identity, public policy mirror and role layer.

Before any write: verify ENSv2 Sepolia UserRegistry/resolver addresses and selectors against https://docs.ens.domains/llms-full.txt; if unverifiable, fall back to text records on a resolver for a name the human owns, and say so here.
