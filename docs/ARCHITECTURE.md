# Architecture — La Cabane

## Vue d'ensemble

Le projet est structuré en **4 couches distinctes** qui ne se mélangent pas :

```
┌─────────────────────────────────────────────┐
│  Couche React DOM  (App.jsx, app/)           │  État narratif, UI, overlays
├─────────────────────────────────────────────┤
│  Couche R3F Canvas  (core/)                  │  Scène 3D, caméra, contrôles
├─────────────────────────────────────────────┤
│  Couche Monde  (world/)                      │  Entités, matériaux, interactions
├─────────────────────────────────────────────┤
│  Couche Utils  (utils/)                      │  Stores découplés, helpers
└─────────────────────────────────────────────┘
```

---

## Couche 1 — React DOM (`App.jsx` + `app/`)

`App.jsx` est le composant racine. Il concentre la quasi-totalité de l'état applicatif (~50 `useState`), orchestre la narration via `useIntroFlow`, et passe des props à `<Scene>`.

Il rend **deux types de choses en parallèle** :
- `<Scene>` (le canvas R3F, couche 3D)
- Les overlays UI en dehors du canvas (sous-titres, crosshair, panneaux, loaders)

**Règle critique** : la logique narrative et UI reste dans `App.jsx`. `<Scene>` ne garde qu'un petit état technique local à la scène 3D, comme les colliders et les positions du monde nécessaires au wiring R3F.

---

## Couche 2 — R3F Canvas (`core/`)

`Scene.jsx` est le composant `<Canvas>` de R3F. Il :
- Reçoit toutes les props d'`App.jsx`
- Compose les sous-systèmes (CabaneScene, SceneLighting, SceneControls, AudioManager…)
- Gère deux états internes légers : `hutPosition` et `platformPosition` (nécessaires pour la scène 3D, pas pour l'UI)

`Scene.jsx` distribue les props vers les sous-composants de `core/scene/`.

---

## Couche 3 — Monde (`world/`)

Contient tout le contenu spécifique au projet :
- **`world/entities/`** : un composant ou module par objet 3D (porte, arbre, livre, personnages…)
- **`world/cabane/`** : pipeline de construction de la cabane (chargement modèles + textures)
- **`world/interactions/`** : hooks réutilisables pour les interactions
- **`world/materials/`** : shaders et matériaux custom

Ces composants sont "stupides" par rapport à la narration — ils reçoivent `isInteractable` et `onInteract` en props, sans savoir pourquoi.

---

## Couche 4 — Utils (`utils/`)

Stores globaux singleton, accessibles de n'importe où sans prop drilling :

| Store | Rôle |
|-------|------|
| `gameManagerStore.js` | Zone active (`'cabane'` ou `'arbre'`) |
| `gameStateStore.js` | Step global (`LOADING` → `EXPLORATION`) |
| `audioStore.js` | Moteur audio complet (lecture, sous-titres) |
| `visibilityZoneStore.js` | Visibilité des nodes par zone |

Ces stores **ne sont pas des Zustand/Redux** — ce sont des stores custom avec `useSyncExternalStore` pour les hooks React.

---

## Séparation `App.jsx` ↔ `Scene.jsx`

C'est la frontière architecturale la plus importante du projet.

```
App.jsx                          Scene.jsx
─────────────────────            ──────────────────────────
useState × 50+          →  props  →  <Canvas>
useIntroFlow                          <CabaneScene ... />
useNpcDialogue                        <SceneControls ... />
useSavoirAssignment                   ...

Overlays UI :                    Rendu 3D :
<Subtitles />                    Three.js scene graph
<SavoirPanel />                  R3F components
<Crosshair />
```

**Pourquoi cette séparation ?** React DOM et Three.js ont des cycles de rendu différents. Les composants R3F dans `<Canvas>` s'exécutent dans la boucle `requestAnimationFrame` de Three.js, pas dans le cycle React standard.

---

## Stores découplés

### `gameManagerStore.js`

```js
// Qui écrit :
setZone('arbre')      // TriggerZone.jsx (dans CabaneScene et ArbreScene)

// Qui lit :
useActiveZone()       // Scene.jsx (zone-conditional rendering)
                      // CabaneScene.jsx (applyVisibilityZone)
```

### `audioStore.js`

```js
// Qui écrit :
initAudio(camera)              // AudioManager.jsx (une seule fois au mount)
play(id) / playDialogue(id)    // useIntroFlow.js via useNpcDialogue
stopAll()                      // App.jsx (transitions)

// Qui lit :
subscribeSubtitles(fn)         // Subtitles.jsx
```

### `visibilityZoneStore.js`

```js
// Qui écrit :
setVisibilityZones(['cabane'])  // App.jsx (via handleGameStepChange)
toggleVisibilityZone(zone)      // ViewerControls.jsx (dev panel)

// Qui lit :
useVisibilityZones()            // CabaneScene.jsx → getZoneComponents()
applyVisibilityZone(group, zones)  // CabaneScene.jsx (useEffect sur visibilityZones)
```

`ZONE_COMPONENTS` définit quels systèmes React sont actifs par zone :

```js
const ZONE_COMPONENTS = {
  all:      { characters: true,  leaves: true,  journal: true  },
  'all-fake': { characters: false, leaves: true,  journal: false },
  nid:      { characters: false, leaves: false, journal: false },
  cabane:   { characters: true,  leaves: true,  journal: true  },
  serre:    { characters: false, leaves: false, journal: false },
  arbre:    { characters: false, leaves: true,  journal: false },
}
```

`applyVisibilityZone(cabaneGroup, zones)` :
1. Merge les whitelists de nodes de chaque zone active
2. Toggle `child.visible` sur les enfants directs du group
3. Disable/enable raycasting sur les meshes cachés (Three.js checke pas `parent.visible`)
4. Force-hide des sub-nodes listés dans `HIDDEN_NODES` (ex: `platform-hut.gltf` en zone `arbre`)

---

## Prop drilling

Le pattern dominant pour transmettre l'état narratif depuis `App.jsx` jusqu'aux entités 3D.

### Exemple : `treePhaseActive`

```
App.jsx
  state: treePhaseActive (boolean)
  callback: handleTreeInteract()
    ↓ props: intro={{ treePhaseActive, onTreeInteract }}
Scene.jsx
  destructure: { treePhaseActive, onTreeInteract } depuis intro
    ↓ props
CabaneScene.jsx
  reçoit treePhaseActive, onTreeInteract
    ↓ props
SceneInteractions.jsx
  reçoit treePhaseActive, onTreeInteract
    ↓ props
ClickableTree.jsx
  useCenterScreenMeshInteraction({ isInteractable: treePhaseActive, onInteract })
    → useFrame : raycasting center-screen chaque frame
    → pointerdown : onInteract() si hover
```

### Objets de groupement dans Scene.jsx

Pour éviter de passer 30 props individuellement, `Scene.jsx` reçoit des objets groupés :

```js
// App.jsx
<Scene
  sceneState={{ onStats, onReady, onError }}
  player={{ mode, flyMode, spawn, movementLocked, … }}
  debug={{ doors, collisions }}
  intro={{ introActive, postIntro, treePhaseActive, onTreeInteract, … }}
  interactions={{ onLeafClick, onFruitClick, onJournalStart, … }}
/>
```

---

## Système de zones

L'expérience se passe dans deux zones exclusives : `'cabane'` (rez-de-chaussée) et `'arbre'` (plateforme en hauteur).

### Activation de zone

Un `TriggerZone` est une sphère invisible dans la scène 3D. Quand la caméra entre/sort de la sphère, la zone bascule.

```
CabaneScene.jsx → TriggerZone(onEnter → setZone('arbre'))
ArbreScene.jsx  → TriggerZone(onLeave → setZone('cabane'))
```

### Conséquences d'un changement de zone

1. **`Scene.jsx`** : `(zone === 'arbre')` contrôle le rendu conditionnel de `<ArbreScene>`
2. **`CabaneScene.jsx`** : relit `useActiveZone()` et appelle `applyVisibilityZone(cabaneGroup, [zone])` pour masquer/afficher les nodes selon `zoneMap.json`

### `zoneMap.json`

Définit quels nodes sont visibles dans quelle zone :

```json
{
  "zones": {
    "cabane": ["ground-hut", "hut01", "counter01", "stairs01", …],
    "arbre":  ["trunk", "leaf", "platform", "ladder", "stairs02"]
  },
  "hidden": {
    "arbre": ["platforme-hut.gltf"]
  }
}
```

---

## Cycle de vie global (`GameManager`)

`GameManager.jsx` (`src/app/GameManager.jsx`) est un composant null (ne rend rien). Il observe 4 props et avance le step global via `setGameStep(gameStateStore)` :

```
LOADING  → (défaut initial)
    ↓ sceneReady = true
INIT     → scène R3F chargée, IntroLoader visible, attente clic
    ↓ introActive || postIntro
INTRO    → unlockAndPlay() déclenché (AudioContext débloqué)
    ↓ storyReady = true (currentStepId === 'intro.goToReception')
STORY    → narration guidée en cours
    ↓ explorationReady = true  (toujours false pour l'instant)
EXPLORATION → libre exploration, setVisibilityZones(['all'])
```

`App.jsx` réagit à chaque transition via `handleGameStepChange(step)`.

### Raccourcis clavier globaux (App.jsx)

| Touche | Effet |
|--------|-------|
| `F1` | Toggle `ViewerControls` (panneau dev) |
| `F2` | Toggle `CameraEditorPanel` (éditeur POV) |
| `F3` | Toggle `StoryDebugPanel` (sauter des phases) |
| `Escape` | Quitte l'intro et remet tout à zéro (via `useIntroFlow`) |

### Blocage pointer lock (App.jsx)

`isPlayerInteractionLocked` agrège 3 sources :

```js
isStoryBlockingPlayer  = dialogueActive || introMovementLocked || showNameInput
                       || receptionChoiceVisible || returnHallVisible
isModalBlockingPlayer  = selectedSavoirAssignment !== null || isSavoirInteractionActive
                       || selectedContactAssignment !== null || isContactInteractionActive
isJournalBlockingPlayer = isJournalInteractionActive

isPlayerInteractionLocked = tous les trois combinés
```

Quand une modale (savoir/contact) s'ouvre, le pointer lock est relâché **seulement après** que `pointerlockchange` confirme le release, pour éviter d'ouvrir le panel sur un frame intermédiaire.

---

## Patterns récurrents

### `useStableInteractionCallback`

Évite de recréer des event listeners à chaque render :

```js
const onInteractRef = useStableInteractionCallback(onInteract)
// → onInteractRef.current est toujours la dernière version
document.addEventListener('pointerdown', () => onInteractRef.current?.())
```

### Performance mode

Activé via ViewerControls. Bascule tous les chargements vers `compressed/` :

```js
const url = performanceMode
  ? '/models/compressed/thomas-animated.glb'
  : '/models/thomas-animated.glb'
```

Appliqué dans : `SceneCharacters.jsx`, `Cabane.js` (nodeBuilder paths), `textureResolver.js`.
