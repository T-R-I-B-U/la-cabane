---
name: draco-readiness
description: Prepare and validate Draco loader integration readiness for compressed GLB assets.
disable-model-invocation: true
---

Run a Draco readiness checklist:
1. Decoder location strategy (`public/draco`)
2. Loader wiring and fallback behavior
3. Path handling in dev and build contexts
4. Failure messaging and graceful handling

Return required changes in implementation order.
