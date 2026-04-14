---
name: ask-better
description: Rewrite a vague request into a high-signal prompt that minimizes token waste.
argument-hint: [raw prompt]
disable-model-invocation: true
---

Improve this prompt: $ARGUMENTS

Return:
1. Optimized prompt
2. Why it is better (max 3 bullets)
3. Optional strict constraints block

Aim for precision, scope, and testability.
