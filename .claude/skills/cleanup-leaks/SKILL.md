---
name: cleanup-leaks
description: Identify and fix likely resource leaks in listeners, geometries, materials, and textures.
disable-model-invocation: true
---

Perform a leak cleanup pass.

Inspect:
1. Event listeners and subscriptions
2. Renderer/object disposal lifecycle
3. Long-lived references preventing GC
4. Missing teardown logic

Return minimal safe fixes and verification hints.
