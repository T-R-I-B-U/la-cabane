---
name: animation-loop-audit
description: Audit update loop correctness and delta-time usage in animation and simulation paths.
---

Audit loop behavior for:
1. Correct delta propagation
2. Frame-rate dependent logic
3. Work done per frame that should be throttled
4. Missing guard conditions

Return prioritized fixes with expected impact.
