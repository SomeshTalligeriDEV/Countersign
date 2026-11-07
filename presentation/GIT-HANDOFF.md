# GitHub handoff

Branch creation was attempted and failed: `cannot lock ref ... unable to create directory for .git/refs/heads/presentation/balanced-three-protocol-release`. The environment exposes Git metadata read-only. No branch, commit or push was created. No force push or history rewrite was attempted.

Base commit inspected: `740fc39279c9df8742debb006ee2d5d1e53c43ae`. The working tree already contains many unrelated application/security edits. The path list below deliberately packages the presentation, balanced paper and necessary manuscript build inputs; it does not claim to commit or verify the complete application upgrade.

Run in the existing authorized writable checkout after reviewing the selected files:

```sh
cd ~/Desktop/countersign
git status --short --branch
git switch -c presentation/balanced-three-protocol-release
git add --pathspec-from-file=presentation/release-files.txt
git diff --cached --stat
git diff --cached --check
git commit -m "docs: balanced Whitechain World ENS paper and illustrated project deck"
git push -u origin presentation/balanced-three-protocol-release
git ls-remote --heads origin presentation/balanced-three-protocol-release
```

Confirm the remote branch hash matches `git rev-parse HEAD` before describing the push as complete. This staging list includes needed pre-existing manuscript build inputs but excludes unrelated uncommitted application code and old evidence archives. It is an artifact release, not a claim that all application evidence is already published. Inspect the manifest and source ZIP before distribution. Do not delete `.git`, change its ownership or reset the dirty tree to bypass the environment restriction.

For a separate writable checkout at the same base, extract `release-handoff.tar.gz` at its root after checking for conflicting local edits, then run the commands with that checkout path. This archive contains only the allowlisted files; the exact file hashes are in `release-manifest.json`. It does not include credentials or unrelated changes. Never extract over another person's work without reviewing differences.
