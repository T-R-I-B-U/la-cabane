# GEMINI.md

Context file for Gemini Gem. Read this at the start of every session.

---

## Project

La Cabane — interactive WebGL experience, Gobelins school project. Jury on June 3rd.
Two developers working collaboratively.

## Tech Stack

- **React Three Fiber (R3F)** — Three.js via React JSX, primary rendering layer
- **React 19** — UI overlaid on canvas, JSX components
- **@react-three/drei** — helpers and abstractions for R3F (loaders, controls, etc.)
- **Vite 7 + vite-plugin-glsl** — build toolchain, supports GLSL shader imports
- **JavaScript + JSX** — no TypeScript; ES modules throughout
- **ESLint** (flat config) + **Prettier** — enforced before every push via git hook
- **3D assets** exported from Cinema 4D as `.gltf` / `.glb`

## Folder Structure

```
public/
  models/           → .gltf/.glb assets (Cinema 4D exports)
    compressed/     → Draco-compressed variants
  textures/
  audio/
  subtitles/        → .srt subtitle tracks for dialogue
  cabane.json       → scene/world data
  savoirs.json      → knowledge/savoir data

src/
  App.jsx           → root component, wires canvas + UI
  app/              → intro state machine, NPC dialogue, UI hooks and components
  core/             → R3F canvas setup, player controls, loaders, diagnostics
    audio/          → AudioManager, Subtitles, audioConfig.json
    scene/          → scene sub-components (lighting, characters, interactions)
  world/
    cabane/         → scene graph pipeline: nodeBuilder, instancing, textureResolver, runtime
    entities/       → one file per 3D object or scene behavior
    interactions/   → shared interaction hooks
    materials/      → reusable materials / shaders
  utils/            → shared stateless helpers (audioStore, etc.)
```

### Folder ownership

| Path | Responsibility |
|------|---------------|
| `src/app/` | Intro flow, NPC dialogue, UI-level state |
| `src/core/` | Canvas setup, player controls, loaders, diagnostics |
| `src/core/audio/` | Audio playback and subtitle sync |
| `src/core/scene/` | Scene composition, lighting, character rendering |
| `src/world/cabane/` | Scene graph pipeline |
| `src/world/entities/` | Individual 3D objects and behaviors |
| `src/world/interactions/` | Interaction hooks (click, hover, proximity) |
| `src/world/materials/` | Shaders and reusable materials |
| `src/utils/` | Pure helpers with no side effects |

Do **not** create new top-level folders without explicit justification.

## Architecture Boundaries

- R3F components (`<mesh>`, `<group>`, etc.) live **inside** `<Canvas>` — UI components live **outside**
- DOM overlay concerns stay in `src/app/` — never leak into `src/world/` or `src/core/`
- Prefer R3F/drei abstractions over raw imperative Three.js wherever an equivalent exists
- Clean up event listeners, geometries, and materials on component teardown

## Code Style

- Single quotes, no semicolons, trailing commas where valid (Prettier enforced)
- `const` by default; `let` only when reassignment needed
- Early returns for guard clauses
- Small focused functions over long multi-purpose blocks
- JSDoc for non-obvious shapes and function contracts (no TypeScript)
- `PascalCase` for React components and filenames
- `camelCase` for functions, variables, hooks
- `UPPER_SNAKE_CASE` only for genuine constants
- Entity filenames map 1:1 to entity names

### Comments

Comment the non-obvious **why** — a hidden constraint, a subtle invariant, a workaround.
Never describe what the code does; well-named identifiers already do that.

## Commands

```bash
npm install          # install deps
npm run dev          # dev server
npm run build        # production build
npm run lint         # lint all files
npm run format       # format all files
npm run format:check # check formatting (used in CI/hooks)
make check           # lint + format:check (same as pre-push hook)
make setup           # first-time: install git hooks
```

**Always run `npm run lint` and `npm run format:check` before pushing.**
Fix every error before a PR goes out.

## Git Workflow

Never commit directly to `main` or `develop` — use feature branches + PRs.

### Branch naming: `<type>/<short-description>`

Allowed types: `feat`, `fix`, `devtools`, `refactor`, `style`, `docs`, `chore`

### Commit format (English only, Conventional Commits)

```
<type>(<scope>): <short description ≤72 chars>

<body: what changed, why, and how if non-obvious>
```

## Behavioral Guidelines

### Before coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so and push back when warranted.

### Simplicity first

- Minimum code that solves the problem. Nothing speculative.
- No abstractions for single-use code.
- No "flexibility" not requested.
- No error handling for impossible scenarios.

### Surgical edits

- Touch only what is necessary.
- Don't improve adjacent code, comments, or formatting unless asked.
- Match existing style, even when you'd do it differently.
- Mention unrelated dead code; don't delete it.
- Remove imports/variables made unused **by your own changes** only.

## Rules Gemini must follow

- Always place code in the correct existing folder — never create new folders
  without explicitly flagging it and explaining why
- Commits must be in English, Conventional Commits format (see above)
- Never rewrite an existing file entirely — show a diff or a targeted edit instead
- If an architectural decision needs to be made, present options rather than imposing a choice
- Flag clearly when a suggestion deviates from the established architecture

## What Gemini must not do

- Modify `vite.config.js`, `package.json`, or root-level files without saying so
- Suggest additional npm dependencies without justification
- Assume the UI is React-only — R3F and React UI coexist in the same JSX tree
- Suggest raw Three.js imperative code when an R3F/drei equivalent exists
- Rewrite existing files entirely
- Swallow errors silently
- Add complexity the team did not ask for

## Tests

No test runner is currently configured. If tests are introduced, add scripts to `package.json` immediately and document them in `AGENTS.md`.
