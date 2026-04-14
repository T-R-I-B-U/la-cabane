---
name: verification-plan
description: Build a minimal, reliable validation plan for changes in this repository. Use before finalizing implementation or opening a PR.
argument-hint: [change summary]
---

Create a validation plan for: $ARGUMENTS

Output format:

1. Fast checks
- Quick, low-cost checks first.

2. Mandatory checks
- Commands required by project conventions.

3. Manual checks
- Browser and behavior checks relevant to the change.

4. Exit criteria
- Clear pass/fail criteria.

Repository defaults to include when relevant:
- `npm run lint`
- `npm run build`

Rules:
- Keep it short and executable.
- Avoid checks unrelated to the requested change.
