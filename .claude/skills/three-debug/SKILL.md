---
name: three-debug
description: Debug Three.js rendering and scene behavior issues systematically.
argument-hint: [symptom or error]
disable-model-invocation: true
---

Debug issue: $ARGUMENTS

Use this flow:
1. Reproduce symptom
2. Isolate subsystem (camera, renderer, light, loader, update loop)
3. Confirm root cause with concrete evidence
4. Apply smallest fix
5. Re-verify behavior

Output: cause, fix, verification.
