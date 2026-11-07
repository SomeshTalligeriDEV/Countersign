# Reproduce this paper build

This local paper revision compiles; it has not been submitted or tested in arXiv's compiler. The user provided a Zenodo record for an earlier version; the local revision was not deposited. Human author and license approval remain unresolved.

```sh
python3 research/paper/verify-source.py
python3 research/paper/build.py --engine tectonic
python3 research/paper/inspect-pdf.py
python3 research/paper/package-source.py
```

Inside the source ZIP use the script basenames. The first command checks source closure and unchanged gas-data hashes. The second defaults to cached-only resources, uses a fresh build directory, checks that source hashes did not change during compilation, atomically installs the PDF and records its installed hash. PyMuPDF is needed only for the optional page renderer. The archive generator uses only Python's standard library.

Recorded compiler: Tectonic 0.17.0, cached TeX resources. Build `quality/build-20261106T231603676791Z/` passed with no unresolved references, missing characters or overfull boxes. Its 20-page PDF SHA-256 is `03c6b9d7facfd6d29a05680811e8990cba01c44a3006c357123b414a1a96965d`. All pages were internally inspected; the review ledger is `quality/zenodo-20261106T231454Z/page-review.json`. Compile timestamps can change PDF bytes; compare source hashes, logs and rendered content. Exact binary reproducibility across engine/cache versions is not promised.

Original reader provenance and all18 reviewed-page records are in `quality/integration-20261106T224445628470Z/`. The originally supplied reader matched an older build, not the latest successful build's PDF hash. Both had identical extracted text and different creation timestamps. The older reader was preserved before replacement. The actual cause of the older file being restored is unknown.

The archive contains paper sources, bibliography, vector figures, scripts and existing gas data/provenance. It does not contain application credentials, tokens, databases, build caches or video. It is not the full application reproducibility artifact. Application tests and raw historical measurements remain under the repository paths documented in the paper; this build does not rerun or modify them.

Do not conflate a compiled PDF or static source checks with a novel result, external audit, live integration success, independent scientific review or publication acceptance.

The Zenodo preparation pass added two original diagrams and ten verified references. The previous 18-page reader and sources are preserved in `quality/zenodo-20261106T231454Z/`; the new hash reflects changed scientific source content as well as PDF metadata. Historical experimental files remain unchanged.

## Balanced revision checkpoint

Current build: `quality/build-20261107T015157097817Z/`, cached Tectonic 0.17.0, 22 pages, SHA-256 `30d616e3c6ae7d1c9b992849717c9646206410d35ba14ed4cb00248113da1270`. No TeX diagnostics were reported. Rendered pages and internal review: `quality/balanced-review/`. The preceding 20-page checkpoint described above is historical, not the current reader hash. All `research/results/` hashes were checked unchanged against `quality/balanced-protocols-20261107T015156Z/revision.json`. The title, abstract, sections 6–8, evaluation and conclusion changed; that content revision explains the new source and PDF hashes.
