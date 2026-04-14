---
name: build-failure-debug
description: Diagnose and resolve a failed Vite production build.
disable-model-invocation: true
allowed-tools: Bash(npm run build) Bash(npm run lint) Read Grep Glob
---

Debug build failures with this sequence:
1. Reproduce with `npm run build`.
2. Identify root cause from error output.
3. Fix with minimal targeted edits.
4. Re-run `npm run build`.
5. Return cause, fix, and verification.

Rule: prioritize deterministic fixes over speculative changes.
