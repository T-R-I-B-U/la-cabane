---
name: commit-helper
description: Draft a conventional commit message in English aligned with project rules.
disable-model-invocation: true
---

Draft a commit message from current staged changes.

Output format:
1. Subject line: `<type>(<scope>): <short description>`
2. Body: 1 to 3 short lines explaining why and key intent

Rules:
- Subject <= 72 chars
- Avoid vague wording
- English only
