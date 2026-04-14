---
name: asset-path-check
description: Verify asset locations and runtime path references for models, textures, audio, and icons.
---

Run an asset path integrity check.

Focus on:
1. Path consistency between code and `public/` tree
2. Wrong relative vs absolute URL usage
3. Missing files and naming mismatches
4. Dist/runtime implications

Output only concrete path corrections.
