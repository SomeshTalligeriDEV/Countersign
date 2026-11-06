# W8 checklist audit — 09-DEMO-SUBMISSION.md §7

Audited 2026-11-06 against the working tree. "Done" means an artifact exists in the repo; it does not mean a judge-verified claim.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Partners selected (Whitechain, World, ENS only if 06 shipped) | MISSING (human step, done in the ETHGlobal form) | draft answers: docs/13-SUBMISSION-ANSWERS.md, 13-SUBMISSION-FORM-DRAFT.md |
| 2 | Contracts verified on the Whitechain explorer (links in README) | MISSING | docs/proof/deployed.example.json has `address: null`, `verified: false`; no explorer links in README.md |
| 3 | Real USDT payment in the main flow (link in README) | MISSING | no tx hash in README.md or docs/proof |
| 4 | "Why Whitechain" line in README | PARTIAL | README.md line 3 and line 62 mention the reason (low-cost payments) but there is no "Why Whitechain" section as in the §3 template |
| 5 | README: setup, architecture, limitations | PARTIAL | README.md `## Setup` (l.7) and `## Architecture and behavior` (l.27); no dedicated limitations section found by grep |
| 6 | `WHITECHAIN_FEEDBACK.md` | DONE (file exists) | WHITECHAIN_FEEDBACK.md |
| 7 | `WORLD_DEBRIEF.md` | DONE (file exists) | WORLD_DEBRIEF.md |
| 8 | World success + denied/expired + backend validation shown in video | MISSING (no video yet) | only local signed-JWT fixtures: docs/proof/world-fixtures-verified.txt, docs/proof/loop-final-jwt-fixtures.txt (NOT real World verification); shot list docs/proof/VIDEO-CHECKLIST.txt |
| 9 | ENS (if selected): live demo, no hard-coded values, open source | N/A unless ENS is selected | 06-ENS-OPTIONAL.md; no ENS proof found |
| 10 | Commit history steady across the event | MISSING | `git log` shows 7 commits, including two bulk commits (eeaf6a0, 27f079d); no remote exists |
| 11 | AI tool usage documented | DONE | README.md `## AI tools used` (l.74) |
| 12 | Video 2–4 min showing owner, agent and merchant | MISSING | shot list only: docs/proof/VIDEO-CHECKLIST.txt |
| 13 | Live demo URL works on a phone | MISSING | no public deployment; steps in docs/proof/W8-deploy-steps.md (UNEXECUTED) |
| 14 | Submitted before the deadline | MISSING (human step) | none |

Local engineering evidence from this run: docs/proof/W8-ci-local.txt (every ci.yml step except the `browser` job), docs/proof/W8-docker.txt (image builds).
