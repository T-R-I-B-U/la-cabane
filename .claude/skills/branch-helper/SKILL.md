---
name: branch-helper
description: Propose a branch name following repository branch conventions.
argument-hint: [change summary]
disable-model-invocation: true
---

Based on: $ARGUMENTS

Return:
1. Recommended branch name
2. One alternative
3. Short rationale with type prefix choice (`feat`, `fix`, `style`, `refactor`, `devtools`, `docs`, `chore`)

Respect `<type>/<short-description>` format.
