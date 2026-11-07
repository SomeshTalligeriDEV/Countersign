# Countersign: seven illustrated chapters

A 16:9 manhwa-inspired project explainer with original characters, heavy ink panels, warm paper, mint accents and a transparent Countersign emblem. Whitechain, World and ENSv2 receive distinct technical coverage; none is presented as a substitute for another.

- [Editable PowerPoint](COUNTERSIGN-7-Slide-Comic-Deck.pptx): exactly seven slides, native editable text/diagrams and complete speaker notes.
- [Reader PDF](COUNTERSIGN-7-Slide-Comic-Deck.pdf): matching seven pages.
- [Offline HTML viewer](index.html): open locally; arrow keys navigate and each slide expands its explanation/sources.
- [Speaker notes](SPEAKER-NOTES.md): implementation details, source paths, addresses, trust boundaries and limitations.
- [Contact sheet](previews/contact-sheet.jpg) and [transparent logo](assets/countersign-logo.png).

## Story

1. The problem: let an agent request, keep authority bounded.
2. The complete system: Whitechain settlement, World authentication, ENS identity, SDKs and observer.
3. ENS discovery and scoped permissions; no automatic cross-chain spending authority.
4. The six-step automatic-payment journey, including wallet setup and gas responsibility.
5. Exact human approval: review, fresh authentication, owner signature and attestation.
6. Adversarial checks, revocation, pause revival, refunds and RPC assumptions.
7. Evidence and unresolved tests, with source links.

Figures are explanatory artwork, not screenshots of a successful product journey. This deck does not manufacture a live demo. Latest hosting/video/payment additions are attributed to the README; fresh network verification was unavailable. 157 Node tests were rerun for this pass; 131 Solidity executions and three digest vectors are preserved earlier results. Historical demo failures remain visible.

## Build and verification

`python3 presentation/build_deck.py` uses Python, PyMuPDF and local Arial fonts to produce PPTX, vector PDF, seven PNG previews, HTML and notes. Font paths are declared at the top; choose licensed equivalents when porting. Generated artwork is checked in, so no generation service or network is needed to rebuild. Install dependencies in your own environment if missing; PyMuPDF was available here. No separate font files are redistributed.

`evidence/deck-validation.json` records ZIP/XML/relationship checks, seven slides and seven note parts, PDF hash and internal visual review. All seven PDF pages were reviewed. Opening the PPTX in Microsoft PowerPoint/Keynote remains NOT TESTED in this environment; verify font/layout fidelity there before presenting. The PDF provides a reviewed fallback. `evidence/node-tests.txt` is the fresh test log.

AI assistance: Codex prepared the narrative, source review, artwork prompts, layout and artifact code. OpenAI image generation produced the original illustration and emblem assets. Human project author attribution is Somesh S. Talligeri; no AI is listed as an author. No official sponsor logo, award or endorsement is implied. Prior-code rights and final distribution approval remain the project owner's responsibility.

Git branch creation was blocked by read-only metadata. No commit or push occurred. See `GIT-HANDOFF.md`.
