---
name: small-refactor
description: Execute a small internal refactor without changing external behavior.
argument-hint: [refactor target]
disable-model-invocation: true
---

Refactor target: $ARGUMENTS

Requirements:
1. Keep behavior identical.
2. Prefer small focused edits.
3. Improve readability or structure only.
4. Provide before/after rationale in 3 to 6 bullets.

Never expand scope beyond the requested target.
