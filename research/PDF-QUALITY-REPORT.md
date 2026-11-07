# Current balanced revision

The latest reader is the 22-page three-protocol revision. Its current build and visual checks supersede older PDF counts and hashes below. See [balanced revision report](THREE-PROTOCOL-REVISION.md) and [publication status](PUBLICATION-STATUS.md).

| Criterion | Status | Evidence |
|---|---|---|
| Three-protocol technical coverage | PASS | Dedicated sections 6, 7, 8 and common evidence comparison |
| Source/citation closure | PASS | 25 cited references; source checks |
| PDF compilation and TeX diagnostics | PASS | `paper/quality/build-20261107T015157097817Z/result.json` |
| All-page internal visual review | PASS | 22 pages, `paper/quality/balanced-review/review.json` |
| Historical measurements retained | PASS | Before/after file hashes |
| Existing Zenodo file comparison | BLOCKED | Could not retrieve the user-provided deposit |
| Author/license consent | BLOCKED | Responsible-human confirmation required |
| Independent scientific review | NOT TESTED | Internal review only |
| Revision uploaded/published | NOT TESTED | No remote update performed |

## Earlier production reports (historical)

# Manuscript quality report: Zenodo preparation

7 November 2026. **Local production and source reproduction PASS. Publication remains BLOCKED pending author/rights/license confirmation and final scientific sign-off.** No Zenodo upload, DOI reservation, publication, arXiv submission, payment or Git push occurred. Video is deferred.

Reader: [COUNTERSIGN-Research-Paper.pdf](paper/COUNTERSIGN-Research-Paper.pdf), 20 pages, SHA-256 `03c6b9d7facfd6d29a05680811e8990cba01c44a3006c357123b414a1a96965d`. The paper contains 25 cited references, eight vector figures and eight numbered tables. These counts are production descriptors, not measures of scientific merit.

## Publication criteria

| Criterion | Status | Evidence / scope |
|---|---|---|
| 1. Source and claim audit | PASS | Revised related work, protocol boundaries and later implementation checkpoint; limitations remain explicit |
| 2. Publication figures | PASS | Eight original vector figures: architecture, authority map, approval sequence, evidence pipeline, state machine, ENS boundary, payment sequence, gas |
| 3. Authentic graph data | PASS | Four existing single-sample local mock-token values; no synthetic distribution/error bars |
| 4. Scientific tables | PASS | Questions, related systems, security properties, attacks, implementation, evidence, gas and limitations; schema appendix also retained |
| 5. Evidence distinctions | PASS | Historical 109 and later 154 Node tests separated; 131 Solidity executions include repetition; ENS fork compile only; live runs remain 5/6 |
| 6. Formal messages/domains | PASS, specification review | Typed schemas, domain, nonces, epoch and attestations stated; no mechanized proof claimed |
| 7. Pause semantics | PASS | Pause/unpause can revive unused unexpired signatures if epoch unchanged; revoke invalidates old epoch rather than permanently disabling mandate |
| 8. Related-work positioning | PASS | ASU overlap retained; ENS IMC study and VELLET added; no new cryptographic primitive claimed |
| 9. Citation verification | PASS, metadata/source review | Earlier 15-source ledger plus 10 new primary references in `zenodo/REFERENCE-UPDATES.json`; not experimental replication |
| 10. Abstract/evaluation/conclusion | PASS, internal | Matches bounded case-study evidence and unresolved integration gaps |
| 11. LaTeX compilation | PASS | Tectonic 0.17.0, cached-only; `paper/quality/build-20261106T231603676791Z/result.json` |
| 12. Every-page visual review | PASS, internal | All 20 pages inspected; `paper/quality/zenodo-20261106T231454Z/page-review.json`; no unresolved TeX diagnostics |
| 13. Figure captions/units/provenance | PASS | Gas axes use gas units, n=1; original diagram captions distinguish implementation from live evidence |
| 14. Reader and source package | PASS | Reader PDF plus 23-entry allowlisted source ZIP; clean extraction reproduces all 20 text/raster pages |
| 15. Author/license/disclosures | BLOCKED | AI disclosure present; author consent/order, rights, paper license and conflict/funding declarations require human confirmation |
| 16. Video excluded | PASS | No embedded video; deferred explicitly |
| 17. No unauthorized external action | PASS | Local files only; no upload/publish/push/transactions |
| 18. Quality report and public identifier | PASS, reporting only | This report; status NOT_PUBLISHED, no DOI invented |
| Independent scientific review | NOT TESTED | Internal production review is not peer review |
| ENS live/fork integration completion | BLOCKED | Historical DNS limitation and incomplete live permission evidence; manuscript preparation does not remedy it |
| Zenodo upload/publication | NOT TESTED | Author account action has not occurred |

## Provenance and reproducibility

The previous 18-page reader (`51a42abfee4579dce972b6b761972004732e0819d5cd63170764e1a9c34914b9`), sources, source ZIP and status reports were preserved before editing in `paper/quality/zenodo-20261106T231454Z/`. The new reader changes content: two original diagrams, ten references and more explicit protocol documentation. Its different hash is therefore expected and is not explained only by timestamps.

Commands executed:

```sh
python3 research/paper/verify-source.py
python3 research/paper/build.py --engine tectonic --timeout 180
python3 research/paper/inspect-pdf.py
python3 research/paper/package-source.py
# From a fresh extraction of the resulting source ZIP:
python3 build.py --engine tectonic --timeout 180
```

Source validation: 25/25 cited bibliography entries; no missing inputs, citations or labels. Build diagnostics: empty. The clean build's PDF bytes differ because PDF generation metadata is time-dependent; all 20 page texts and raster outputs match. The exact comparison and hashes are in `paper/quality/zenodo-20261106T231454Z/clean-reproduction.json`. All 26 files in the preserved historical research-results manifest remain byte-identical. Application tests were not rerun during this manuscript pass.

## New documentation and research sources

Added direct ENS registry/resolver and draft ENSIP-26 references, World OIDC/step-up/sandbox guides, and Whitechain testnet/finality references. ENS security research includes Xia et al., IMC 2022, DOI 10.1145/3517745.3561469, and VELLET, arXiv:2404.03874v1. Original diagrams cite documentation; no third-party figure/logo has been reproduced. The source ledger records failed direct opens and successful official-domain retrieval honestly.

## Remaining scientific weaknesses

No equivalent-baseline performance study, human study, independently reproduced public-chain evaluation or independent audit is established. Single-sample gas excludes transaction intrinsic gas, setup and human/network latency. ENS state and Whitechain authority are separate; RPC-reported state is not a consensus proof. World sandbox identities do not establish production personhood. The historical acceptance runs remain incomplete. These are disclosed limitations, not silently passed release gates.

[Zenodo upload instructions](zenodo/UPLOAD.md) explain the final human actions. A repository deposit supplies a public record, not peer review or sponsor endorsement.
