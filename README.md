# threejs

## Stack

- Three.js — WebGL scene
- React — UI layer overlaid on the canvas
- Vite — bundler
- vite-plugin-glsl — native .glsl imports

## Getting started
```bash
npm install
npm run dev
```

## Project structure
```
public/
  models/       → 3D assets (.glb)
  textures/     → textures
  audio/        → ambiances and sound effects
  draco/        → Draco decoder for compressed GLB files

src/
  core/         → Three.js engine (SceneManager, Loop, Loader, Camera, Sizes)
  world/
    entities/   → individual 3D objects, one class per object
    materials/  → reusable Three.js materials
  utils/        → shared helpers (EventEmitter, Debug, constants, audio)
```

## Architecture principles

- `main.jsx` is the single entry point. It mounts the canvas and boots the WebGL engine.
- `core/` handles the Three.js lifecycle — scene, renderer, camera, animation loop, asset loading.
  Nothing in `core/` knows about the project content.
- `world/` contains everything that populates the scene.
  `World.js` orchestrates all entities. Each entity in `entities/` is a self-contained class
  with an `init()` and an `update(delta)` method.
- `utils/` is stateless and has no Three.js dependency. Anything reusable that does not
  belong to the scene goes here.
- Assets in `public/` are served statically and never bundled. They are loaded at runtime
  via `Loader.js` using Three.js loaders (GLTFLoader, AudioLoader, etc.)