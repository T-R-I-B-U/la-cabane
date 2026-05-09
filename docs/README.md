# La Cabane — Documentation technique

Documentation de référence pour les développeurs du projet. Objectif : comprendre n'importe quelle partie du code et pouvoir répondre à des questions sur l'architecture et le fonctionnement.

---

## Présentation du projet

**La Cabane** est une expérience WebGL interactive narrative développée dans le cadre d'un projet de fin d'études à Gobelins. L'utilisateur explore une cabane perchée dans un arbre, rencontre des personnages, interagit avec des objets, et déverrouille un journal-puzzle. L'expérience est pilotée par une machine à états narrative et un système audio avec voix-off et sous-titres.

---

## Tech stack

| Outil | Version | Rôle |
|-------|---------|------|
| **React** | 19.2 | UI overlay (overlays, panneaux, formulaires) |
| **React Three Fiber (R3F)** | 9.6 | Bridge React ↔ Three.js, rendu WebGL |
| **Three.js** | 0.183 | Engine 3D bas niveau |
| **@react-three/drei** | 10.7 | Helpers R3F (OrbitControls, useAnimations, etc.) |
| **@react-three/postprocessing** | 3.0 | Post-processing (EffectComposer) |
| **postprocessing** | 6.39 | EffectPass, passes custom (Kuwahara) |
| **Vite** | 7.0 | Bundler + HMR |
| **vite-plugin-glsl** | 1.5 | Import natif `.glsl` |

---

## Arborescence

```
la-cabane/
│
├── public/                        # Assets statiques (non bundlés)
│   ├── models/                    # GLTF/GLB exports Cinema 4D
│   │   └── compressed/            # Variantes Draco (performance mode)
│   ├── textures/                  # Textures PBR (color, normal, metallic…)
│   │   └── compressed/
│   ├── audio/                     # Pistes MP3/WAV
│   │   └── tree/                  # Dialogues voix-off (01–16)
│   ├── subtitles/                 # Fichiers .srt pour les sous-titres
│   │   └── tree/
│   ├── hdri/                      # Fichiers .hdr / .exr pour l'éclairage IBL
│   ├── cabane.json                # Hiérarchie de scène exportée (Cinema 4D)
│   ├── savoirs.json               # Contenus "savoirs" assignés aux feuilles
│   └── contacts.json             # Contenus "contacts" assignés aux fruits
│
├── src/
│   ├── main.jsx                   # Point d'entrée React
│   ├── App.jsx                    # Composant racine (~730 lignes)
│   │
│   ├── app/                       # State machine narrative + composants UI
│   │   ├── useIntroFlow.js        # Machine à états principale (~500 lignes)
│   │   ├── useStoryFlow.js        # Suivi des étapes du script narratif
│   │   ├── useNpcDialogue.js      # Wrapper React pour playDialogue()
│   │   ├── useSavoirAssignment.js # Assignation savoirs → feuilles
│   │   ├── useContactAssignment.js# Assignation contacts → fruits
│   │   ├── storyScript.js         # Définition du script narratif
│   │   ├── storyCameraPovs.js     # Positions caméra pour transitions
│   │   ├── AppLoader.jsx          # Écran de chargement
│   │   ├── IntroLoader.jsx        # Écran d'intro (click to start)
│   │   ├── NameInput.jsx          # Formulaire saisie nom joueur
│   │   ├── Crosshair.jsx          # Viseur first-person
│   │   ├── SavoirPanel.jsx        # Modal overlay d'un savoir
│   │   ├── ContactPanel.jsx       # Modal overlay d'un contact
│   │   ├── ViewerControls.jsx     # Panneau debug développeur
│   │   ├── StoryDebugPanel.jsx    # Debug story (dev)
│   │   ├── DevSection.jsx         # Section dev dans ViewerControls
│   │   └── GameManager.jsx        # Orchestrateur steps (LOADING → EXPLORATION)
│   │
│   ├── core/                      # Setup R3F, contrôles, loaders, audio
│   │   ├── Scene.jsx              # Canvas principal + composition
│   │   ├── SceneConfig.js         # Constantes globales (positions, hauteurs)
│   │   ├── Loader.js              # GLTFLoader singleton avec cache
│   │   ├── Floor.jsx              # Collider de sol
│   │   ├── StatsCollector.jsx     # Collecteur FPS / draw calls
│   │   ├── PerfMonitor.jsx        # Overlay perf (dev)
│   │   ├── CollisionDebug.jsx     # Visualisation colliders (dev)
│   │   ├── disposeObject3D.js     # Helper nettoyage THREE.Object3D
│   │   ├── PlayerControls.jsx     # Contrôles first-person + collision
│   │   ├── StoryCameraTransition.jsx # Transitions smooth entre POVs
│   │   ├── CameraEditorPanel.jsx  # Éditeur caméra (dev)
│   │   ├── CameraRegistrySync.jsx # Sync caméra (dev)
│   │   ├── cameraRegistry.js      # Registre des poses caméra nommées
│   │   │
│   │   ├── audio/
│   │   │   ├── audioConfig.json   # Définition de toutes les pistes audio
│   │   │   ├── AudioManager.jsx   # Bridge caméra R3F ↔ AudioListener
│   │   │   └── Subtitles.jsx      # Affichage sous-titres (overlay)
│   │   │
│   │   └── scene/
│   │       ├── CabaneScene.jsx    # Orchestrateur scène cabane
│   │       ├── CabaneMap.jsx      # Loader du modèle cabane
│   │       ├── ArbreScene.jsx     # Scène zone arbre
│   │       ├── SceneControls.jsx  # Sélecteur système caméra
│   │       ├── SceneCharacters.jsx# Personnages (Thomas, Marie, Zoé)
│   │       ├── SceneInteractions.jsx # Composition des interactables
│   │       ├── SceneLighting.jsx  # Éclairage (HDRI, directional)
│   │       └── hdriOptions.js     # Plugin Vite : module HDRI virtuel
│   │
│   ├── utils/                     # Helpers et stores partagés
│   │   ├── gameManagerStore.js    # Store zone active (cabane / arbre)
│   │   ├── gameStateStore.js      # Store step global (LOADING → EXPLORATION)
│   │   ├── audioStore.js          # Store audio singleton (~467 lignes)
│   │   ├── visibilityZoneStore.js # Gestion visibilité par zone
│   │   ├── ConditionalEdgesGeometry.js # Geometry custom pour outlines
│   │   └── index.js               # Exports publics
│   │
│   └── world/                     # Contenu projet
│       ├── cabane/                # Pipeline construction cabane
│       │   ├── assetNaming.js     # Normalisation noms assets
│       │   ├── nodeBuilder.js     # Builder récursif nodes
│       │   ├── instancing.js      # Reconstruction InstancedMesh
│       │   ├── textureResolver.js # Auto-application textures
│       │   ├── runtime.js         # Helpers transform / material clone
│       │   └── zoneMap.json       # Mapping zones → nodes visibles
│       │
│       ├── entities/              # Un module par objet 3D interactif
│       │   ├── Cabane.js          # Factory buildCabane() async
│       │   ├── AnimatedCharacter.jsx
│       │   ├── ClickableThomas.jsx
│       │   ├── ClickableDoor.jsx
│       │   ├── ClickableTree.jsx
│       │   ├── ClickableReception.jsx
│       │   ├── ClickableWorkbench.jsx
│       │   ├── ClickableGreenhouseDoor.jsx
│       │   ├── JournalBook.jsx
│       │   ├── SlidingDoors.jsx
│       │   ├── TreeLeaves.jsx
│       │   ├── Fruit.jsx
│       │   ├── GrowingFruit.jsx
│       │   ├── BackgroundPlanes.jsx
│       │   └── InteractionPoint.jsx
│       │
│       ├── interactions/          # Hooks interaction réutilisables
│       │   ├── useCenterScreenMeshInteraction.js
│       │   ├── useHoverEffect.js
│       │   ├── useStableInteractionCallback.js
│       │   └── TriggerZone.jsx
│       │
│       └── materials/             # Matériaux et shaders custom
│           ├── WatercolorPass.jsx
│           ├── KuwaharaEffect.js
│           └── outlineEffect.js
│
├── docs/                          # ← Cette documentation
├── Makefile                       # make prettier / eslint / check
├── vite.config.js
├── eslint.config.js
└── package.json
```

---

## Quick start

```bash
npm install
npm run dev          # Lance le serveur de développement

make eslint          # Vérifie le linting
make prettier        # Formate le code
make check           # eslint + prettier check (avant tout push)
```

---

## Index de la documentation

| Fichier | Contenu |
|---------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Couches, patterns, séparation App/Scene, stores |
| [STATE_MACHINE.md](./STATE_MACHINE.md) | useIntroFlow — toutes les phases narratives |
| [AUDIO.md](./AUDIO.md) | audioStore, SRT, subtitles, toutes les pistes |
| [SCENE.md](./SCENE.md) | Pipeline R3F : Scene → CabaneScene → sous-composants |
| [INTERACTIONS.md](./INTERACTIONS.md) | 3 patterns d'interaction, TriggerZone, zones |
| [ASSETS.md](./ASSETS.md) | nodeBuilder, instancing, textureResolver, cabane.json |
| [PLAYER.md](./PLAYER.md) | PlayerControls, pointer lock, collision, spawns |
| [CHARACTERS.md](./CHARACTERS.md) | AnimatedCharacter, séquences Thomas/Marie/Zoé |
| [JOURNAL.md](./JOURNAL.md) | JournalBook, puzzle, machine à états, tokens |
| [SAVOIRS.md](./SAVOIRS.md) | useSavoirAssignment, panels, contacts |
| [SHADER.md](./SHADER.md) | WatercolorPass, Kuwahara, outline |
| [DATA_FLOW.md](./DATA_FLOW.md) | Props flow App → Scene → entités, stores |
| [TOOLING.md](./TOOLING.md) | Vite, Makefile, ESLint, scripts npm |
