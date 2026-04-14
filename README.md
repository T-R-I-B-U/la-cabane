# La Cabane

Interactive WebGL experience — Gobelins school project.  
Built by a team of 2 developers.

---

## Tech Stack

| Tool | Version | Role |
|---|---|---|
| [Three.js](https://threejs.org/) | 0.183 | WebGL engine |
| [React](https://react.dev/) | 19 | UI layer (DOM overlay on the canvas) |
| [Vite](https://vitejs.dev/) | 8 | Bundler + HMR |
| [vite-plugin-glsl](https://github.com/UstymUkhman/vite-plugin-glsl) | — | Native `.glsl` file imports |
| [ESLint](https://eslint.org/) (flat config) | — | JS/JSX linting |
| Cinema 4D → `.glb` | — | 3D asset export pipeline |

---

## Technical Architecture

### Core principle

Two layers coexist on screen and communicate exclusively through a custom `EventEmitter`. React never drives the engine directly, and Three.js never reads React state.

```
index.html
  └── #root (React)
        ├── App.jsx                ← React entry point, mounts the canvas
        │     └── [UI components] ← pure DOM / React state
        └── <canvas>               ← owned by Three.js

  WebGL layer  (src/core/)
        SceneManager               ← scene, renderer, camera setup
        Loop                       ← requestAnimationFrame, delta time
        Loader                     ← GLTFLoader, AudioLoader, TextureLoader
        World.js                   ← orchestrates all entities

  Content layer  (src/world/)
        entities/                  ← one class per 3D object (init + update)
        materials/                 ← reusable materials / custom shaders

  Cross-layer communication  (src/utils/)
        EventEmitter
        React → EventEmitter.emit()    → Three.js handler
        Three.js → EventEmitter.emit() → React setState
```

### Architecture rules

- `core/` is **content-agnostic** — a generic engine with no project-specific logic.
- `world/` owns the scene content. Each entity exposes exactly `init()` and `update(delta)`.
- `utils/` is **stateless** and has no Three.js dependency.
- Assets in `public/` are served statically and loaded at runtime — they are never bundled by Vite.

---

## Project Structure

```
public/
  models/       → .glb files exported from Cinema 4D (loaded via GLTFLoader)
  textures/     → textures (loaded via TextureLoader)
  audio/        → ambience tracks and sound effects (loaded via AudioLoader)
  draco/        → Draco decoder (added when compressed .glb files are introduced)

src/
  core/         → Three.js engine (SceneManager, Loop, Loader, Camera, Sizes)
  world/
    entities/   → one file / class per 3D object
    materials/  → reusable Three.js materials and custom shaders
  utils/        → EventEmitter, Debug, constants, audio helpers
  assets/       → static assets imported directly by Vite (SVG, images)
  App.jsx       → React root component
  main.jsx      → single entry point — mounts React and boots the engine
  index.css     → global styles
```

---

## Git Workflow

### Branch model

```
main              ← releases only (version tags, e.g. v0.1.0)
  └── develop     ← continuous integration branch — always stable
        ├── feat/feature-name-dev1
        └── fix/bug-name-dev2
```

### Step-by-step

1. Always start from an up-to-date `develop`:
   ```bash
   git checkout develop && git pull origin develop
   ```
2. Create a typed branch:
   ```bash
   git checkout -b feat/short-description
   ```
3. Work, commit following the [commit convention](#commit-conventions).
4. Open a Pull Request targeting `develop`.
5. The other developer reviews and approves.
6. Merge into `develop` (squash or merge commit — keep history readable).
7. **Release**: open a PR from `develop` → `main`, then tag `v0.x.y`.

> **Never commit directly to `main` or `develop`.**

### Branch naming

| Prefix | Use |
|---|---|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `style/` | Visual / CSS / animation changes |
| `refactor/` | Internal restructuring, no behavior change |
| `devtools/` | Config / build / tooling changes |
| `docs/` | Documentation only |
| `chore/` | Maintenance / cleanup |

Examples: `feat/tribe-tree-entity`, `fix/loader-draco-path`, `docs/readme-architecture`

---

## Commit Conventions

All commits must be in **English**, using the conventional commit format:

```
<type>(<scope>): <short description ≤ 72 chars>

<body: what changed, why, and how if non-obvious>
```

Examples:

```
feat(entities): add TribeTree class with init and update methods
fix(loader): correct Draco decoder path for production build
style(ui): update overlay opacity transition timing
refactor(core): extract camera setup into its own module
```

---

## Commands

```bash
npm install             # install dependencies
npm run dev             # start development server with HMR
npm run build           # production build
npm run preview         # preview the production build locally
npm run lint            # lint all JS/JSX files
npx eslint src/App.jsx  # lint a single file
```

---

## PR Quality Bar

Before requesting a review, verify:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds
- [ ] Manual smoke test in the browser
- [ ] Screenshot or short video attached for any visual / rendering change
- [ ] PR description explains the behavior change and rationale
