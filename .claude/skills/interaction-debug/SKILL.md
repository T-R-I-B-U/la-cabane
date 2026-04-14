---
name: interaction-debug
description: Debug scene interactions such as clicks, raycasting, and object selection behavior.
argument-hint: [interaction symptom]
disable-model-invocation: true
---

Debug interaction issue: $ARGUMENTS

Workflow:
1. Identify interaction entry point
2. Validate pointer event pipeline
3. Validate raycaster target filtering
4. Confirm object metadata/state assumptions
5. Apply minimal fix and re-check

Return root cause and reproducible verification.
