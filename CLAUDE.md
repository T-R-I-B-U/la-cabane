# CLAUDE.md

Context file for Claude (Anthropic). Read this at the start of every session.

---

## Project

La Cabane — interactive WebGL experience, Gobelins school project.
Two developers working collaboratively.

## Tech stack

- React Three Fiber (R3F) — Three.js via React JSX, primary rendering layer
- React (UI overlaid on canvas, JSX components)
- @react-three/drei — helpers and abstractions for R3F (loaders, controls, etc.)
- Vite + vite-plugin-glsl
- Assets exported from Cinema 4D as .gltf/.glb

## Folder structure

```
public/
  models/           → .gltf/.glb files (Cinema 4D exports)
    compressed/     → Draco-compressed variants
  textures/
  audio/
  subtitles/        → .srt files for dialogue tracks

src/
  assets/           → static assets imported by Vite (SVG, images)
  app/              → intro state machine, NPC dialogue, UI-level hooks and components
  core/             → R3F canvas setup, player controls, loaders, diagnostics
    audio/          → AudioManager, Subtitles component, audioConfig.json
    scene/          → scene sub-components (lighting, characters, interactions, controls)
  world/
    cabane/         → scene graph pipeline: nodeBuilder, instancing, textureResolver, runtime
    entities/       → one module/component per 3D object or scene behavior
    interactions/   → shared interaction hooks
    materials/      → reusable materials / shaders
  utils/            → shared stateless helpers (audioStore, etc.)
```

## Behavioral guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### Think before coding

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

### Goal-driven execution

For multi-step tasks, state a brief plan before acting:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Transform vague tasks into verifiable goals:
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

## Rules Claude must follow

- Always place code in the correct existing folder — never create new folders
  without explicitly flagging it and explaining why
- Commits suggested by Claude must be in English, following the conventional
  commits format defined in AGENTS.md
- Only comment the non-obvious WHY — a hidden constraint, a subtle invariant, a workaround.
  Don't describe what the code does; well-named identifiers already do that.
- Never rewrite an existing file entirely — show a diff or a targeted edit instead
- If an architectural decision needs to be made, present options rather than
  imposing a choice
- Flag clearly when a suggestion deviates from the established architecture
- **Always run `npm run lint` and `npm run format:check` before pushing.**
  Fix every error and formatting issue before the push goes out — neither lint errors
  nor prettier warnings may land in a PR

## What Claude must not do

- Modify vite.config.js, package.json or root-level files without saying so
- Suggest additional dependencies without justification
- Assume the UI is React-only — the WebGL scene (R3F) and the React UI coexist
  in the same JSX tree; R3F components live inside `<Canvas>`, UI components outside
- Suggest raw Three.js imperative code when an R3F/drei equivalent exists
- Add complexity that the team did not ask for
