---
name: dead-code-cleanup
description: Find and remove unused imports, variables, and dead paths with low risk.
disable-model-invocation: true
---

Run dead code cleanup in minimal mode.

Checklist:
1. Identify dead code candidates.
2. Remove only high-confidence unused code.
3. Re-run lint and build checks.
4. Report exactly what was removed.

Do not remove code with uncertain runtime usage.
