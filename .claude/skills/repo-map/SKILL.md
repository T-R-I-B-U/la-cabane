---
name: repo-map
description: Produce a focused map of the repository structure, ownership, and execution commands. Use when starting work or onboarding.
argument-hint: [optional focus area]
---

Build a repository map for: $ARGUMENTS

Include:

1. Core structure
- Key folders and their responsibilities.

2. Execution commands
- Install, dev, lint, build, preview commands available in this repo.

3. Architecture boundaries
- React UI vs Three.js engine responsibilities.

4. Safe modification zones
- Where to add new code by feature type.

5. Guardrails
- Rules from project docs that must be respected.

Rules:
- Prefer concise bullets.
- Reference real paths and scripts only.
- Do not invent tooling.
