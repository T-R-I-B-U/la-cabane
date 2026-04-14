---
name: lint-fix-pass
description: Run lint and fix lint issues with minimal code changes.
disable-model-invocation: true
allowed-tools: Bash(npm run lint) Bash(npx eslint *)
---

Perform one lint fix pass.

Process:
1. Run lint.
2. Group lint failures by file.
3. Apply the smallest safe code edits.
4. Re-run lint and report remaining issues.

Rules:
- No opportunistic refactor.
- Preserve behavior.
