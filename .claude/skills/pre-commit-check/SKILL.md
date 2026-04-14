---
name: pre-commit-check
description: Verify repository state and minimum checks before creating a commit.
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(npm run lint) Bash(npm run build)
---

Run a pre-commit checklist for current changes.

Return:
1. Git status summary
2. Risky files (if any)
3. Required checks run and results
4. Commit readiness verdict: ready or not ready

Repository default checks:
- `npm run lint`
- `npm run build`
