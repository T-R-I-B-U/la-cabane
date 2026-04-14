---
name: arch-guard
description: Enforce repository architecture boundaries and flag proposed changes that violate them.
user-invocable: false
---

Apply architecture guardrails for the current task.

Check and flag:
1. Core vs world responsibility leaks
2. React state leaking into engine lifecycle
3. Utility modules taking Three.js dependencies
4. New folder proposals that break current structure

When violations exist, provide compliant alternatives.
