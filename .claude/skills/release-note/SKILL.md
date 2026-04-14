---
name: release-note
description: Generate release note entries focused on user-visible impact.
argument-hint: [version or scope]
disable-model-invocation: true
---

Generate release notes for: $ARGUMENTS

Format:
1. Added
2. Changed
3. Fixed

Rules:
- Mention user-visible outcomes
- Avoid implementation-only details unless important
