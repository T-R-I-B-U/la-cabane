---
name: scene-audit
description: Audit scene organization and entity lifecycle quality for the Three.js world.
---

Audit scene architecture in this order:
1. Separation of concerns between `src/core` and `src/world`
2. Entity lifecycle consistency (`init` and `update(delta)`)
3. Scene setup readability and maintainability
4. Missing cleanup and disposal points

Return concise findings with file paths and fix priority.
