---
name: scope-lock
description: Keep work strictly within requested scope and flag scope creep. Use when requests risk expanding into unrelated changes.
user-invocable: false
---

Apply strict scope control to the current task.

Always provide:

1. In-scope work
- Bullet list of exactly what will be done.

2. Out-of-scope work
- Bullet list of tempting but excluded changes.

3. Scope guardrails
- Two to four concrete rules to keep changes contained.

Behavior:
- If a requested addition changes architecture or workflow significantly, present options instead of choosing silently.
- Do not add opportunistic refactors.
- Keep answers compact.
