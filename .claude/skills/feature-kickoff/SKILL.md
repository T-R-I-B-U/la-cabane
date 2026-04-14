---
name: feature-kickoff
description: Turn a feature idea into an implementation-ready plan for this repository. Use when the user asks to add or modify a feature.
argument-hint: [feature request]
disable-model-invocation: true
---

Build a practical implementation kickoff for: $ARGUMENTS

Use this structure:

1. Goal
- One sentence with the user-visible outcome.

2. Constraints to respect
- Extract only the constraints that matter from `AGENTS.md` and `CLAUDE.md`.
- Mention folder ownership, coding style, and validation commands.

3. Implementation slices
- Propose 3 to 6 small slices in dependency order.
- For each slice, include target files and expected output.

4. Risks and decisions
- List non-trivial decisions and tradeoffs.
- Provide a default recommendation for each.

5. Validation plan
- Give the minimum command set to validate safely.

Output rules:
- Be concise and concrete.
- Prefer small, reviewable steps over broad rewrites.
- Avoid generic advice.
