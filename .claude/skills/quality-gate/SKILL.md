---
name: quality-gate
description: Run final quality checks for the current changes and report pass or fail clearly. Use before commit or PR.
disable-model-invocation: true
allowed-tools: Bash(npm run lint) Bash(npm run build) Bash(git status -sb)
---

Apply the quality gate to the current branch.

Steps:
1. Check branch state with `git status -sb`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Return a short report with:
   - Check results
   - Blocking issues
   - Next fix priority

Rules:
- Do not hide failures.
- Keep output concise and actionable.
