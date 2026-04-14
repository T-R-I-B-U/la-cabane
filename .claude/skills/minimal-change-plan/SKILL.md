---
name: minimal-change-plan
description: Produce a minimal-diff implementation plan before editing code. Use when the user asks for safe, targeted changes.
argument-hint: [requested change]
disable-model-invocation: true
---

Create a minimal change plan for: $ARGUMENTS

Output format:

1. Proposed diff footprint
- Files to edit (max 5) and why each is needed.

2. Smallest viable implementation
- Ordered steps with the least invasive approach.
- Explicitly avoid unrelated refactors.

3. Non-goals
- List what will not be changed.

4. Verification
- Fast checks first, then full checks if needed.

Rules:
- Preserve existing architecture and conventions.
- Prefer edits over rewrites.
- Keep the plan concise and implementation-ready.
