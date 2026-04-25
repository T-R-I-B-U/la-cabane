# La Cabane

Interactive WebGL experience — Gobelins school project.  
Built by a team of 2 developers.

---

## Tech Stack

| Tool | Version | Role |
|---|---|---|
| [Three.js](https://threejs.org/) | 0.183 | WebGL engine |
| [React](https://react.dev/) | 19 | UI layer (DOM overlay on the canvas) |
| [Vite](https://vitejs.dev/) | 7 | Bundler + HMR |
| [vite-plugin-glsl](https://github.com/UstymUkhman/vite-plugin-glsl) | — | Native `.glsl` file imports |
| [ESLint](https://eslint.org/) (flat config) | — | JS/JSX linting |
| Cinema 4D → `.gltf` / `.glb` | — | 3D asset export pipeline |

---

## Technical Architecture

### Core principle

The app is split between a React DOM overlay and a React Three Fiber canvas. React owns UI state and passes scene options to the canvas through component props; Three.js-specific behavior stays inside R3F scene components and world entities.

```
index.html
  └── #root (React)
        └── App.jsx                  ← React UI shell and debug controls
              ├── core/Scene.jsx     ← React Three Fiber canvas + scene setup
              ├── core/PerfMonitor   ← DOM performance overlay
              └── App.css            ← UI styling

  R3F scene layer (src/core/)
        Scene.jsx                    ← Canvas, lights, controls, floor, stats
        Loader.js                    ← shared GLTFLoader cache

  World content layer (src/world/)
        entities/Cabane.js           ← builds the scene graph from cabane.json
        entities/SlidingDoors.jsx    ← animated interactive doors
        materials/                   ← reusable materials / custom shaders

  Runtime assets (public/)
        cabane.json                  ← exported scene placement data
        models/                      ← GLTF/GLB models and instance matrices
```

### Architecture rules

- `App.jsx` owns the DOM overlay state and passes display/debug options to `Scene`.
- `core/` owns the R3F canvas, scene setup, controls, loaders, and rendering diagnostics.
- `world/` owns project-specific scene content and entity behavior.
- `utils/` is reserved for shared stateless helpers.
- Assets in `public/` are served statically and loaded at runtime — they are never bundled by Vite.

---

## Project Structure

```
public/
  models/       → .gltf/.glb files exported from Cinema 4D (loaded via GLTFLoader)
  textures/     → textures (loaded via TextureLoader)
  audio/        → ambience tracks and sound effects (loaded via AudioLoader)
  draco/        → Draco decoder (added when compressed .glb files are introduced)

src/
  core/         → React Three Fiber scene setup, loaders, controls, debug helpers
  world/
    entities/   → one module/component per 3D object or scene behavior
    materials/  → reusable Three.js materials and custom shaders
  utils/        → shared stateless helpers
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
npm run format          # format source files
npm run format:check    # check source formatting
```

---

## PR Quality Bar

Before requesting a review, verify:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds
- [ ] Manual smoke test in the browser
- [ ] Screenshot or short video attached for any visual / rendering change
- [ ] PR description explains the behavior change and rationale
