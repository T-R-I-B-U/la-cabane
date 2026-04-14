---
name: entity-scaffold
description: Scaffold a new world entity file following repository conventions.
argument-hint: [entity name]
disable-model-invocation: true
---

Create a new entity scaffold for: $ARGUMENTS

Scaffold requirements:
1. One file per entity in `src/world/entities`
2. Public lifecycle methods: `init()` and `update(delta)`
3. Minimal constructor dependencies
4. No project-unrelated abstractions

Also return where this entity should be wired in world orchestration.
