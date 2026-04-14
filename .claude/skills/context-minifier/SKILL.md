---
name: context-minifier
description: Compress task context into a short actionable brief to reduce token usage. Use before implementation, review, or debugging.
argument-hint: [topic or task]
disable-model-invocation: true
---

Compress the context for: $ARGUMENTS

Return exactly these sections:

1. Objective (1 line)
- The expected outcome.

2. Known facts (max 8 bullets)
- Only verified facts from the repository or user input.

3. Assumptions (max 3 bullets)
- Explicit assumptions that still need validation.

4. File shortlist (max 5)
- Most relevant files to read next.

5. Next action
- A single best next step.

Rules:
- No long explanations.
- No repeated context.
- Prioritize precision over completeness.
