# Balanced revision: Zenodo handoff

**Local revision prepared. No upload or published-record update occurred.** The user supplied https://zenodo.org/records/24025815 as the current paper. This pass could not retrieve the deposited file or metadata; verify record ownership, version, DOI and license in the owning account.

1. Review the revised 22-page PDF, especially Whitechain section 6, World section 7, ENS section 8 and the balanced evidence table. Confirm author order, contributor consent, license and scientific claims. Zenodo deposit is not peer review.
2. Open the existing record in the owning account and prepare its next version, following the current Zenodo interface. Do not create an unrelated duplicate deposit or invent a DOI. If the record is still a draft, confirm its status before editing.
3. Extract `COUNTERSIGN-Zenodo-Upload.zip`. Upload the PDF and `COUNTERSIGN-source.zip` as separate files. Use `metadata-draft.json` as a human editing aid, not an API payload; do not upload it unintentionally.
4. Preview the PDF and confirmed metadata/license. Compare the file hashes with `SHA256SUMS.txt`. Publish only after the responsible human approves the exact revision.
5. Record the genuine new version URL and identifier after Zenodo confirms publication. The agent has not performed this step.

The source ZIP includes all required LaTeX sources, 25-reference bibliography, vector diagrams and copied historical gas data/provenance. It excludes credentials and application databases. In the extracted directory run `python3 verify-source.py` then `python3 build.py --engine tectonic --timeout 180`. Cached TeX resources are required unless downloads are explicitly enabled. This is a paper build bundle, not the entire application artifact.

Historical local gas measurements are unchanged. Recorded World interactions use sandbox identities. ENS fork compilation is not execution. Two historical live runs remain incomplete at 5/6 each. Significant AI assistance is disclosed. See `../THREE-PROTOCOL-REVISION.md` for changes and `../PUBLICATION-STATUS.md` for the publication boundary.
