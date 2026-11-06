# NO-DUMMY audit (non-web code)

Run 2026-11-06:

```
grep -rniE 'mock|stub|fake|dummy|todo|placeholder' apps packages scripts contracts/src --exclude-dir=node_modules
```

Web (`web/**`) is audited separately in [DUMMY-AUDIT-web.md](DUMMY-AUDIT-web.md).

## Production-path hits

| file:line | hit | action |
|---|---|---|
| packages/ens/src/index.mjs:49 | JSDoc "viem PublicClient or a fake" | labelled: comment now says production passes a real viem PublicClient (Sepolia); the fake client exists only in packages/ens/test (test-only) |
| scripts/video-checklist.mjs:4 | `TODO-HUMAN ${name} proof` | kept, labelled by design: output marker for a missing human-recorded tx, not fake data |
| scripts/video-checklist.mjs:7,11,14,15 | `TODO-HUMAN ...` cells | kept, labelled by design (blocked-on-human: recording, team names) |
| scripts/evidence.mjs:8,13,14,15,19,23,25,34 | `TODO-HUMAN address/transaction/URL` | kept, labelled by design: generator writes TODO-HUMAN instead of inventing addresses/tx links (blocked-on-human: deploy H1-H3, repo H5) |

`contracts/src`: 0 hits. `apps/*/src`, `packages/{agent,merchant,shared}/src`: 0 hits.

## Test-only hits (kept test-only)

| file | hits | note |
|---|---|---|
| apps/api/test/realtime.test.mjs | 9 | mocked sockets/clients |
| apps/api/test/six-step-demo.test.mjs | 1 | test double |
| apps/api/test/world-device.test.mjs | 1 | fake device endpoint |
| packages/ens/test/ens.test.mjs | 4 | fake viem client |
| scripts/test/evidence.test.mjs | 2 | asserts TODO-HUMAN output |
| scripts/test/deploy.test.mjs | 2 | mocked deploy adapters |
| scripts/test/video.test.mjs | 1 | asserts TODO-HUMAN output |

## Counts

Production-path: 14 hit lines in 3 files: 1 labelled, 13 kept as intentional TODO-HUMAN output markers (blocked-on-human), 0 replaced, 0 unlabelled. Test-only: 20 hits in 7 files.
