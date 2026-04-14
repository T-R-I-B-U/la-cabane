---
name: impact-analysis
description: Analyze likely impact surface before editing code. Use to estimate affected files, risks, and regression points for a requested change.
argument-hint: [feature, bug, or refactor]
---

Analyze the impact of: $ARGUMENTS

Return:

1. Directly impacted files
- Ranked list with short rationale per file.

2. Indirectly impacted areas
- Modules that may break due to coupling.

3. Risk hotspots
- Edge cases, runtime risks, and integration risks.

4. Regression watchlist
- Behaviors to re-check after changes.

5. Recommended edit strategy
- Minimal-risk order of implementation.

Rules:
- Be specific and path-based.
- Keep analysis practical and brief.
- Favor small and reversible changes.
