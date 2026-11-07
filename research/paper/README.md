# Countersign manuscript source

**Countersign: Transaction-Bound Agent Payments with Whitechain, World and ENSv2**. A systems-security implementation case study, local preprint revision, not peer reviewed; user-provided Zenodo record and remote-version uncertainty are documented in ../PUBLICATION-STATUS.md. Author attribution is provisional pending contributor consent. No institution, funding declaration, absence of conflicts or publication license is asserted without author confirmation.

## Build the reader PDF

From the repository root:

```sh
python3 research/paper/generate-gas-figure.py
python3 research/paper/verify-source.py
python3 research/paper/build.py
```

From an extracted source ZIP, use the same commands with just the script filenames. Python 3.10+ and an existing TeX distribution are required. The scripts never broadcast transactions or alter recorded experiment files. TeX resource downloads are disabled by default; `--allow-downloads` explicitly enables them for Tectonic.

The builder prefers `latexmk`, then `pdflatex` plus `bibtex`, then Tectonic. Standard TeX Live packages required by the source are article, geometry, amsmath, amssymb, booktabs, longtable, array, graphicx, fontenc/T1 fonts, url, hyperref and PGF/TikZ (arrows.meta, positioning, fit, backgrounds). No shell escape, minted, external drawing program or proprietary style is required. A full TeX Live installation supplies these packages. With a suitable installed toolchain:

```sh
python3 research/paper/build.py --engine latexmk
# or, with network access to initialize the installed Tectonic engine:
python3 research/paper/build.py --engine tectonic --allow-downloads --timeout 600
# or, when the Tectonic bundle is already cached:
python3 research/paper/build.py --engine tectonic
```

Each attempt copies sources into a fresh `quality/build-<UTC timestamp>/`, logs the exact commands/tool version and source hashes, and checks the output and TeX diagnostics. Only a successful build copies `COUNTERSIGN-Research-Paper.pdf` to this directory. A pre-existing PDF is not evidence that the current sources built: compare `result.json` input/PDF hashes. The script is an auditable build recipe, not a promise of bit-for-bit PDF reproducibility across TeX distributions.

**Current build: PASS, 22 pages.** Cached-only Tectonic 0.17.0 compiled the balanced sources at `quality/build-20261107T015157097817Z/`. No unresolved references, missing-character or overfull-box diagnostics remain. The reader SHA-256 is `30d616e3c6ae7d1c9b992849717c9646206410d35ba14ed4cb00248113da1270`. All 22 rendered pages were internally inspected; review ledger: `quality/balanced-review/review.json`. This is production review, not peer review. The prior 20-page reader and sources are preserved in `quality/balanced-protocols-20261107T015156Z/`.

## Figures and data

Nine included TeX figure/table sources describe architecture/trust, approval sequence, payment sequence, mandate state, ENS cross-chain scope, attack matrix, gas, three-protocol authority boundaries and the evidence verification pipeline. Eight are figures. The attack matrix is a table. Diagrams are implementation descriptions, not successful live-test evidence. `generate-gas-figure.py` reads the existing `../results/gas.csv` (or `data/gas.csv` in the archive) and emits both TikZ and SVG plus input/output hashes. It uses Python's standard library, requires no plotting downloads, and does not modify the source data.

The four observations are 58,236; 59,636; 240,671; 258,628 gas units. Each has one local mock-token sample, measured with gasleft around an external call. Setup, intrinsic gas, network fees and human time are excluded; access warmness is not normalized. These are not Whitechain performance benchmarks. The raw trace and contract source remain in the repository at `docs/proof/research/benchmark-forge.txt` and `contracts/test/ResearchBench.t.sol`; `data/benchmark-provenance.json` identifies their recorded hashes. The ZIP is the paper build package, not the complete application artifact.

## Evidence checkpoints

Historical research files report 99 Node tests; a later release reports 108. The earlier final recorded checkpoint in `docs/evidence/final/final-checks/` reports 109 Node tests, 131 Solidity executions (including inherited repetition and four benchmarks), three shared digest cases, JWT fixtures, lint, types and formatting. Those are historical checkpoints. The current presentation/manuscript revision separately reran 157 Node tests successfully; see `../../presentation/evidence/node-tests.txt`. ENS fork compilation succeeded while DNS prevented execution. Two historical live runs remain 5/6 each. Recorded World issuer interaction uses sandbox identities; local JWT fixtures are a separate evidence class.

Use `research/scripts/reproduce-final.sh` for new application test evidence. The old `research/reproduce.sh` and `research/scripts/analyze.py` can overwrite historical outputs and must not be used for an evidence-preserving manuscript pass.

## Package and review

```sh
python3 research/paper/package-source.py
```

`COUNTERSIGN-arxiv-source.zip` contains only allowlisted sources, the bibliography, vector figures, scripts, the copied gas dataset/provenance and a SHA-256 manifest. It excludes credentials, logs, caches, historical handoff archives and videos. It includes `.bib`; arXiv's current [TeX instructions](https://info.arxiv.org/help/submit_tex.html) allow `.bib` or `.bbl`. Compatibility with arXiv's actual compiler has **not** been tested. The filename does not signify publication readiness or authorization to submit.

After any future source change and successful build, `python3 research/paper/inspect-pdf.py` (optional PyMuPDF dependency) renders every page into a new quality directory, extracts text and flags out-of-page text. It does not certify visual quality. Inspect **every page** for clipping, typography, figure readability, glyphs, equations, references, bibliography URLs and empty sections. `quality/result` logs are necessary but not sufficient. Review the scientific claims independently, confirm the author list, funding/conflicts, acknowledgments and licenses, then regenerate the ZIP. Significant Codex assistance is disclosed in the manuscript; human authors remain responsible. No publication or Git push is part of these scripts.

## Zenodo preparation

The target is a Zenodo preprint deposit, not an arXiv submission. See `../zenodo/UPLOAD.md` and `../PUBLICATION-STATUS.md`. The later integration checkpoint records 154 Node tests separately from the earlier 109-test checkpoint; the current revision separately reran 157 Node tests. The user-provided Zenodo record was not updated; see `../THREE-PROTOCOL-REVISION.md`. The current bibliography contains 25 cited entries. Author consent, rights/license and final scientific sign-off remain pending.
