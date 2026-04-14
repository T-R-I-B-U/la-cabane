---
name: error-handling-audit
description: Audit and improve error handling clarity in risky async and loading paths.
---

Audit the requested area for error handling quality.

Return:
1. Missing try/catch boundaries
2. Silent failures
3. Error messages lacking context
4. Priority fixes (highest first)

Rules:
- Favor fail-fast for critical assets/config.
- Keep graceful degradation only for optional behavior.
