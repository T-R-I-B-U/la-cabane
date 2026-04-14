---
name: render-perf-check
description: Review rendering performance hotspots and suggest high-impact optimizations.
---

Run a render performance check.

Analyze:
1. Likely draw call pressure
2. Heavy per-frame work
3. Expensive materials, shadows, and texture usage
4. Opportunities for batching, culling, or throttling

Return top fixes by impact to effort ratio.
