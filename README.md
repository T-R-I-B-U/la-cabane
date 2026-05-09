# La Cabane

Interactive WebGL experience — Gobelins school project.  
Built by a team of 2 developers.

---

## Documentation technique

La documentation complète du projet est dans [`docs/`](./docs/) :

| Fichier | Contenu |
|---------|---------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 4 couches, séparation App/Scene, stores, prop drilling |
| [STATE_MACHINE.md](./docs/STATE_MACHINE.md) | `useIntroFlow` — toutes les phases narratives |
| [AUDIO.md](./docs/AUDIO.md) | `audioStore`, dialogue, sous-titres, SRT |
| [SCENE.md](./docs/SCENE.md) | Pipeline R3F : Scene → CabaneScene → sous-composants |
| [INTERACTIONS.md](./docs/INTERACTIONS.md) | 3 patterns d'interaction, TriggerZone, zones |
| [ASSETS.md](./docs/ASSETS.md) | nodeBuilder, instancing, textureResolver, cabane.json |
| [PLAYER.md](./docs/PLAYER.md) | PlayerControls, pointer lock, collision, spawns |
| [CHARACTERS.md](./docs/CHARACTERS.md) | AnimatedCharacter, séquences Thomas |
| [JOURNAL.md](./docs/JOURNAL.md) | JournalBook, machine à états, puzzle drag-and-drop |
| [SAVOIRS.md](./docs/SAVOIRS.md) | useSavoirAssignment, useContactAssignment, panels |
| [SHADER.md](./docs/SHADER.md) | WatercolorPass, KuwaharaEffect, outlineEffect |
| [DATA_FLOW.md](./docs/DATA_FLOW.md) | Flux props App → Scene → entités, stores globaux |
| [TOOLING.md](./docs/TOOLING.md) | Vite, ESLint, Prettier, Makefile, build |

---

## Tech Stack

| Tool                                                                | Version | Role                                 |
| ------------------------------------------------------------------- | ------- | ------------------------------------ |
| [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)         | —       | Three.js via React JSX (canvas layer)|
| [Three.js](https://threejs.org/)                                    | 0.183   | WebGL engine                         |
| [@react-three/drei](https://github.com/pmndrs/drei)                 | —       | R3F helpers (controls, loaders…)     |
| [React](https://react.dev/)                                         | 19      | UI layer (DOM overlay on the canvas) |
| [Vite](https://vitejs.dev/)                                         | 7       | Bundler + HMR                        |
| [vite-plugin-glsl](https://github.com/UstymUkhman/vite-plugin-glsl) | —       | Native `.glsl` file imports          |
| [postprocessing](https://github.com/pmndrs/postprocessing)          | —       | Kuwahara watercolor post-FX          |
| [ESLint](https://eslint.org/) (flat config)                         | —       | JS/JSX linting                       |
| Cinema 4D → `.gltf` / `.glb`                                        | —       | 3D asset export pipeline             |

---

## Technical Architecture

### Core principle

The app is split into **4 layers** that don't mix:

```
┌─────────────────────────────────────────────┐
│  React DOM  (App.jsx, app/)                  │  narrative state, UI overlays
├─────────────────────────────────────────────┤
│  R3F Canvas  (core/)                         │  3D scene, camera, controls
├─────────────────────────────────────────────┤
│  World  (world/)                             │  entities, materials, interactions
├─────────────────────────────────────────────┤
│  Utils  (utils/)                             │  decoupled singleton stores
└─────────────────────────────────────────────┘
```

`App.jsx` holds most narrative and UI state. `Scene.jsx` mainly receives props, while keeping a few scene-local state values such as colliders and resolved world positions. The R3F `<Canvas>` boundary separates React DOM rendering from Three.js's `requestAnimationFrame` loop.

### Architecture rules

- `App.jsx` owns all narrative state; everything flows down as props to `<Scene>`.
- `core/` owns the R3F canvas, camera systems, player controls, and loaders.
- `world/` owns project-specific 3D content — entities receive `isInteractable` / `onInteract` props without knowing the narrative context.
- `utils/` stores (`audioStore`, `gameManagerStore`, `gameStateStore`, `visibilityZoneStore`) are singleton modules accessible anywhere without prop drilling, using `useSyncExternalStore` for React hooks.
- Assets in `public/` are served statically and loaded at runtime — never bundled by Vite.

---

## Project Structure

```
public/
  cabane.json       → scene graph definition (nodes, positions, types)
  models/           → .gltf/.glb files + .bin instancing matrices
    compressed/     → Draco-compressed variants (performance mode)
  textures/         → PBR textures (color, normal, roughness, ao…)
    compressed/     → compressed variants
  audio/            → ambience tracks, SFX, voice-over
  subtitles/        → .srt files for dialogue tracks
  hdri/             → .hdr / .exr environment maps (optional)
  savoirs.json      → leaf knowledge content (round-robin assignment)
  contacts.json     → fruit contact content (per fruitId lookup)

src/
  App.jsx                   → root component, ~50 useState, all narrative state
  main.jsx                  → React entry point
  app/                      → narrative state machine, UI overlays, hooks
    useIntroFlow.js          → central story machine (~545 lines)
    useNpcDialogue.js        → thin wrapper over audioStore dialogue
    useSavoirAssignment.js   → round-robin leaf → savoir mapping
    useContactAssignment.js  → direct fruitId → contact mapping
    useStoryFlow.js          → storyScript step tracker
    GameManager.jsx          → null component, drives LOADING→EXPLORATION steps
    ViewerControls.jsx       → dev panel (performance, shader, zones…)
    StoryDebugPanel.jsx      → F3 debug panel (jump to any phase)
    SavoirPanel.jsx / ContactPanel.jsx / NameInput.jsx / …
  core/                     → R3F canvas, player, loaders, scene wiring
    Scene.jsx                → <Canvas> root, zone-conditional rendering
    PlayerControls.jsx       → FPS movement, gravity, wall collision
    StoryCameraTransition.jsx → lerp/slerp to narrative POV
    SceneConfig.js           → spawn positions, floor/player heights
    Loader.js                → GLTFLoader singleton with promise cache
    Floor.jsx                → invisible floor collider + visible grass
    audio/
      AudioManager.jsx       → attaches THREE.AudioListener to camera
      Subtitles.jsx          → subscribes to audioStore subtitle updates
    scene/
      CabaneScene.jsx        → cabane orchestrator (load → interact → zone)
      ArbreScene.jsx         → arbre zone trigger (return to cabane)
      SceneControls.jsx      → camera selector (IntroCamera / Player / Orbit)
      SceneCharacters.jsx    → Thomas + ClickableThomas
      SceneInteractions.jsx  → all Clickable* + JournalBook assembly
      SceneLighting.jsx      → ambient + directional + HDRI environment
      hdriOptions.js         → HDRI_OPTIONS from virtual:hdri-options
  world/                    → project-specific 3D content
    cabane/
      nodeBuilder.js         → recursive GLTF assembly from cabane.json
      instancing.js          → .bin → THREE.InstancedMesh
      textureResolver.js     → auto PBR texture lookup + alias map
      assetNaming.js         → name normalization, window01 alias
      runtime.js             → applyTransform, findNodePosition helpers
    entities/               → one component per 3D object
      Cabane.js              → buildCabane() entry point + collider generation
      AnimatedCharacter.jsx  → generic GLB + animation + texture cloning
      IntroCamera.jsx        → 5-waypoint cinematic camera
      JournalBook.jsx        → 6-state interactive book + drag-and-drop puzzle
      TreeLeaves.jsx         → InstancedMesh + PRNG animation + LOD
      SlidingDoors.jsx       → auto-detected door pairs, proximity lerp
      Fruit.jsx              → cloned GLB, outline, hover, click
      GrowingFruit.jsx       → decorative animated fruit (easeOutQuart)
      ClickableDoor.jsx      → intro door, mouse hover + outline
      ClickableTree / ClickableReception / ClickableWorkbench / …
    interactions/
      useCenterScreenMeshInteraction.js  → FPS center-screen raycasting
      TriggerZone.jsx        → spherical camera trigger (distanceToSquared)
      useHoverEffect.js      → cursor + pointer events helper
      useStableInteractionCallback.js    → stable ref for event handlers
    materials/
      WatercolorPass.jsx     → Kuwahara post-processing effect (EffectComposer)
      KuwaharaEffect.js      → 4-quadrant variance filter GLSL
      outlineEffect.js       → glow outline (ShaderMaterial + InstancedBufferGeometry)
  utils/                    → singleton stores, shared helpers
    audioStore.js            → Web Audio engine, SRT subtitles, RAF loop
    gameManagerStore.js      → active zone ('cabane' | 'arbre')
    gameStateStore.js        → global step (LOADING → EXPLORATION)
    visibilityZoneStore.js   → node whitelist + ZONE_COMPONENTS
    ConditionalEdgesGeometry.js → edge geometry filtered by angle threshold
```

---

## Runtime Flows

### Intro flow

`App.jsx` delegates the intro state machine to `src/app/useIntroFlow.js`.

Flow:

- idle overlay → `launchIntro()`
- intro loader overlay → click to start cinematic
- `IntroCamera` emits scene events (`wait:door`, `door:open`, `inside`)
- `ClickableDoor` unlocks the next intro step
- post-intro dialogue starts
- name input appears
- second dialogue ends and movement unlocks

### Dialogue and subtitles flow

- `useIntroFlow` and `useNpcDialogue` trigger `playDialogue()` from `src/utils/audioStore.js`
- `audioStore` supports both audio-backed tracks and text-only subtitle tracks
- `core/audio/Subtitles.jsx` subscribes to subtitle updates and renders the current line

### Cabane asset build flow

`src/world/entities/Cabane.js` is the public entrypoint for scene assembly.

Internal modules:

- `src/world/cabane/assetNaming.js` → asset naming normalization and model base-name resolution
- `src/world/cabane/textureResolver.js` → runtime texture lookup and auto-application
- `src/world/cabane/instancing.js` → `.bin` instanced mesh reconstruction
- `src/world/cabane/nodeBuilder.js` → recursive node/model assembly
- `src/world/cabane/runtime.js` → shared transform and warning helpers

### Player movement and collisions flow

- `Scene` builds an explicit collider list from the cabane root and floor colliders
- `SceneControls` passes that list into `PlayerControls`
- `PlayerControls` raycasts only against those collision targets, not the full scene tree

---

## Where To Add Code

- New DOM overlay UI: `src/app/`
- New scene orchestration pieces: `src/core/scene/`
- New reusable core runtime helpers: `src/core/`
- New project-specific 3D entities or interactions: `src/world/entities/`
- New cabane build logic: `src/world/cabane/`
- New shared helpers or small runtime stores: `src/utils/`
- New runtime assets: `public/models`, `public/textures`, `public/audio`, `public/subtitles`

When adding a new entity:

- add the runtime component in `src/world/entities/`
- keep DOM/UI concerns out of the entity
- wire it from `Scene.jsx` or a focused `src/core/scene/*` orchestrator component
- if it needs collisions or interaction, opt it into the existing explicit scene wiring rather than reading the whole scene graph blindly

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

| Prefix      | Use                                        |
| ----------- | ------------------------------------------ |
| `feat/`     | New feature                                |
| `fix/`      | Bug fix                                    |
| `style/`    | Visual / CSS / animation changes           |
| `refactor/` | Internal restructuring, no behavior change |
| `devtools/` | Config / build / tooling changes           |
| `docs/`     | Documentation only                         |
| `chore/`    | Maintenance / cleanup                      |

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
