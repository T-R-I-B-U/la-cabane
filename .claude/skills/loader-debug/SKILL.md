---
name: loader-debug
description: Debug model, texture, and audio loading issues, including incorrect paths and runtime assumptions.
argument-hint: [asset path or error]
disable-model-invocation: true
---

Debug loader issue: $ARGUMENTS

Checklist:
1. Validate static path under `public/`
2. Verify loader usage and callbacks
3. Confirm expected loaded data shape
4. Add guardrails for missing assets
5. Re-test loading path

Return root cause and exact correction.
