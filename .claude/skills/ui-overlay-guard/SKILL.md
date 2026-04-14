---
name: ui-overlay-guard
description: Keep strict separation between React UI overlay and Three.js engine responsibilities.
user-invocable: false
---

Apply UI overlay guardrails:
1. React handles DOM state and presentation only
2. Engine concerns stay in `src/core` and `src/world`
3. Cross-layer communication goes through shared events
4. No direct React state access from low-level engine code

If violations are found, suggest minimal compliant edits.
