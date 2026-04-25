# CLAUDE.md

Context file for Claude (Anthropic). Read this at the start of every session.

---

## Project

ECNI — interactive WebGL experience, Gobelins school project. Jury on June 3rd.
Two developers working collaboratively.

## Tech stack

- React Three Fiber (R3F) — Three.js via React JSX, primary rendering layer
- React (UI overlaid on canvas, JSX components)
- @react-three/drei — helpers and abstractions for R3F (loaders, controls, etc.)
- @react-three/postprocessing — post-processing effects (bloom, depth of field, etc.)
- Vite + vite-plugin-glsl
- Assets exported from Cinema 4D as .glb

## Folder structure

Current state — folders exist but most are still empty (scaffolded).

```
public/
  models/       → .glb files (Cinema 4D exports)
  textures/
  audio/

src/
  assets/       → static assets imported by Vite (SVG, images)
  core/         → engine lifecycle (scene, camera, renderer, loop, loader)
  world/
    entities/   → one class per 3D object
    materials/  → reusable materials / shaders
  utils/        → shared helpers (event emitter, debug, constants)
```

> `public/draco/` will be added when Draco-compressed .glb files are introduced.

## Rules Claude must follow

- Always place code in the correct existing folder — never create new folders
  without explicitly flagging it and explaining why
- Commits suggested by Claude must be in English, following the conventional
  commits format defined in AGENTS.md
- Always explain generated code — every non-obvious block needs a comment
- Never rewrite an existing file entirely — show a diff or a targeted edit instead
- If an architectural decision needs to be made, present options rather than
  imposing a choice
- Flag clearly when a suggestion deviates from the established architecture
- **Always run `npm run lint` before pushing.** Fix every error before the push
  goes out — no lint errors may land in a PR

## What Claude must not do

- Modify vite.config.js, package.json or root-level files without saying so
- Suggest additional dependencies without justification
- Assume the UI is React-only — the WebGL scene (R3F) and the React UI coexist
  in the same JSX tree; R3F components live inside `<Canvas>`, UI components outside
- Suggest raw Three.js imperative code when an R3F/drei equivalent exists
- Add complexity that the team did not ask for