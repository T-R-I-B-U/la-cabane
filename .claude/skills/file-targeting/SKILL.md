---
name: file-targeting
description: Identify the smallest set of files to inspect or edit for a requested change. Use before coding to reduce unnecessary context and token usage.
argument-hint: [task or bug]
---

For this request: $ARGUMENTS

Return only:

1. Primary files (max 5)
- Ranked list of the most relevant files.
- One short reason per file.

2. Optional files (max 3)
- Only if needed for edge cases or validation.

3. Files to avoid
- List files that are likely unrelated and should not be opened.

Rules:
- Optimize for minimal reads and focused diffs.
- Prefer existing architecture paths (`src/core`, `src/world`, `src/utils`, `public/*`).
- Do not propose broad exploratory sweeps unless absolutely required.
