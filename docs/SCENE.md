# Pipeline de rendu — Scene

## Vue d'ensemble

```
App.jsx
  └─ <Scene props={40+} />
       └─ <Canvas fov=60 shadows>
            ├─ <StatsCollector />
            ├─ <AudioManager />
            ├─ <SceneLighting />
            ├─ <Floor />
            ├─ <BackgroundPlanes />
            ├─ <Suspense> <CabaneScene /> </Suspense>    ← zone cabane (toujours)
            ├─ <Suspense> <ArbreScene />  </Suspense>    ← zone arbre (conditionnel)
            ├─ <GrowingFruit />
            ├─ <Fruit />
            ├─ <SceneControls />
            └─ <WatercolorPass />  (conditionnel)
```

---

## `Scene.jsx` — Canvas principal

Fichier : `src/core/Scene.jsx`

### Setup Canvas

```jsx
<Canvas
  camera={{ fov: 60, near: 0.01, far: 500, position: [hutX+22, hutY+14, hutZ+28] }}
  shadows
>
```

- `fov: 60` : champ de vision standard
- `near: 0.01` : proche pour éviter le clipping sur les objets proches
- `far: 500` : loin pour voir l'arrière-plan
- Position initiale caméra : décalée par rapport à la cabane pour l'intro cinématique

### Zone-conditional rendering

```jsx
const zone = useActiveZone()  // 'cabane' ou 'arbre'

// CabaneScene reste toujours montée (évite les rechargements)
{(zone === 'cabane' || zone === 'arbre') && (
  <Suspense fallback={null}>
    <CabaneScene ... />
  </Suspense>
)}

// ArbreScene uniquement en zone arbre
{zone === 'arbre' && (
  <Suspense fallback={null}>
    <ArbreScene ... />
  </Suspense>
)}
```

### États internes de Scene

`Scene.jsx` est l'**unique exception** à la règle "pas de useState dans Scene" — deux états sont nécessaires pour la scène 3D :

```js
const [hutPosition, setHutPosition] = useState(DEFAULT_HUT_POS)
// Rempli par CabaneScene → onHutPositionReady
// Utilisé par : Floor, BackgroundPlanes, SceneControls

const [platformPosition, setPlatformPosition] = useState(null)
// Rempli par CabaneScene → onPlatformPositionReady
// Utilisé par : ArbreScene (TriggerZone de retour)
```

---

## `CabaneScene.jsx` — Orchestrateur cabane

Fichier : `src/core/scene/CabaneScene.jsx`

### Cycle de vie async

```
1. CabaneMap monte
      ↓
2. buildCabane() async (world/entities/Cabane.js)
   - Fetch cabane.json
   - nodeBuilder récursif (charge tous les modèles + textures)
      ↓
3. onReady(info) callback
   - info.hutPosition → hutPosition state
   - info.platformPosition → platformPosition state
   - info.meshCount → stats
      ↓
4. onCabaneLoaded(group) callback
   - group = THREE.Group complet
   - Extrait leafMesh (InstancedMesh des feuilles)
   - applyVisibilityZone(group, [activeZone])
      ↓
5. Rendu : TreeLeaves, SceneCharacters, SceneInteractions, SlidingDoors
```

### Props reçues (sélection)

| Prop | Type | Source | Utilisation |
|------|------|--------|-------------|
| `performanceMode` | boolean | App | Choix modèles compressés |
| `onError` | fn | App | Erreur chargement |
| `onSceneReady` | fn | App | Notify sceneLoadStatus='ok' |
| `leafMaterialMode` | string | App | Mode matériau feuilles |
| `interactionsEnabled` | boolean | App | Active interactables |
| `treePhaseActive` | boolean | useIntroFlow | Arbre cliquable |
| `workbenchPhaseActive` | boolean | useIntroFlow | Établi cliquable |
| `thomasEtabliPhaseActive` | boolean | useIntroFlow | Thomas cliquable |
| `forceOpenDoor` | boolean | useIntroFlow | Ouvre la porte |
| `platformPosition` | vec3 | Scene | TriggerZone arbre |
| `onCollisionReady` | fn | Scene | Colliders pour PlayerControls |
| `onHutPositionReady` | fn | Scene | hutPosition → Scene |
| `onPlatformPositionReady` | fn | Scene | platformPosition → Scene |

### TriggerZone vers l'arbre

```jsx
<TriggerZone
  center={platformPosition ?? PLATFORM_POS}
  radius={ARBRE_TRIGGER_RADIUS}
  onEnter={() => setZone('arbre')}
/>
```

Quand le joueur monte l'échelle et entre dans la sphère centrée sur la plateforme, la zone bascule vers `'arbre'`.

---

## `ArbreScene.jsx` — Zone arbre

Fichier : `src/core/scene/ArbreScene.jsx`

Actuellement contient uniquement le TriggerZone de **retour** vers la cabane :

```jsx
export function ArbreScene({ platformPosition }) {
  return (
    <TriggerZone
      center={platformPosition ?? PLATFORM_POS}
      radius={CABANE_TRIGGER_RADIUS}
      onLeave={() => setZone('cabane')}
    />
  )
}
```

Sur la branche `feat/tree-script`, cette scène est enrichie avec des fruits, des `InteractionPoint`, et le hook `useArbreFlow` pour la narration en hauteur.

---

## `SceneControls.jsx` — Sélecteur caméra

Fichier : `src/core/scene/SceneControls.jsx`

Choisit quel système de caméra est actif selon l'état narratif :

```jsx
if (introActive)
  return <IntroCamera ... />

if (playerMode)
  return <PlayerControls ... />

if (postIntro && postIntroLocked)
  return <>
    <PlayerControls canMove={false} ... />
    <StoryCameraTransition ... />
  </>

if (postIntro && !postIntroLocked)
  return <>
    <OrbitControls ... />
    <OrbitTargetSync />
    {import.meta.env.DEV && <CameraRegistrySync />}
  </>
```

`OrbitTargetSync` : composant interne à `SceneControls.jsx` qui synchronise la target d'orbit avec `introSpawn.target` quand le mode orbit est activé.

`CameraRegistrySync` : uniquement en DEV — enregistre la caméra dans un registre global pour les outils de debug (CameraEditorPanel).

| État | Système actif |
|------|--------------|
| `introActive = true` | `IntroCamera` (cinématique) |
| `playerMode = true` | `PlayerControls` (first-person pointer lock) |
| `postIntro + locked` | `PlayerControls` immobile + `StoryCameraTransition` |
| `postIntro + libre` | `OrbitControls` + `OrbitTargetSync` (+ `CameraRegistrySync` en DEV) |

---

## `SceneLighting.jsx`

Éclairage globale de la scène :

- **Directional light** avec ombres (sun-like, position haute)
- **HDRI** via `PMREMGenerator` : charge un `.hdr` depuis `public/hdri/`
- `activeHdriId` détermine quel HDRI est chargé (liste générée par `hdriOptionsPlugin`)
- Fond bleu ciel en fallback si pas d'HDRI

---

## `SceneInteractions.jsx`

Fichier : `src/core/scene/SceneInteractions.jsx`

Composition plate de tous les interactables — aucune logique propre, juste l'assemblage :

```jsx
<>
  <ClickableDoor    cabane={cabane} active={introWaitingAtDoor} ... />
  <ClickableReception ... isInteractable={receptionActive} />
  <ClickableTree    ... isInteractable={treePhaseActive} />
  <ClickableWorkbench ... isInteractable={workbenchPhaseActive} />
  <ClickableGreenhouseDoor ... isInteractable={greenhousePhaseActive} />
  {journalVisible && bookPosition && <JournalBook ... />}
</>
```

`bookPosition` est calculé dynamiquement à partir de la position du mesh `counter01` dans la scène cabane.

---

## `SceneCharacters.jsx`

Fichier : `src/core/scene/SceneCharacters.jsx`

Charge et instancie les personnages. Voir [CHARACTERS.md](./CHARACTERS.md) pour le détail.

---

## `StatsCollector.jsx`

Composant R3F qui, à chaque frame, collecte des métriques via `gl.info` et les remonte à `App.jsx` via `onStats` :

- FPS
- Draw calls (`render.calls`)
- Triangles (`render.triangles`)
- Géométries (`memory.geometries`)
- Textures (`memory.textures`)

Ces métriques s'affichent dans `ViewerControls.jsx` (mode dev).

---

## `Floor.jsx`

Crée un plan invisible au sol qui sert de **collider** pour `PlayerControls`. Il est ajouté à `collisionObjects` passé à `PlayerControls`.

`mainFloorRef` est un callback ref : quand le mesh est monté, il remonte le collider à `Scene.jsx` via `setMainFloorCollider`.

---

## `BackgroundPlanes.jsx`

Plans billboard-style qui forment le fond visuel (ciel, horizon). Suivent `hutPosition` pour rester centrés sur la cabane.

---

## `SlidingDoors.jsx`

Fichier : `src/world/entities/SlidingDoors.jsx` (~205 lignes)

Gère l'ouverture/fermeture automatique de toutes les portes coulissantes de la cabane en fonction de la proximité du joueur.

### Constantes

```js
const TRIGGER_DIST   = 5     // Distance (unités) pour ouvrir une porte
const SLIDE_AMOUNT   = 1.5   // Translation Z appliquée à chaque panneau
const LERP_SPEED     = 0.07  // Facteur de lerp exponentiel (frame-rate independent)
const MAX_FRAME_DELTA = 0.05 // Anti-spike
```

### Détection automatique des portes

Au mount, `collectDoors(cabane)` parcourt le groupe Three.js et identifie les paires de meshes `door_right` / `door_left` partageant le même parent :

```
hut01.glb → door01 → door01_1 → door_right (Mesh)
                               → door_left  (Mesh)
```

Seuls les objets dont un ancêtre a un nom commençant par `door` (regex `/^door/i`) sont retenus.

### Ouverture

En `firstPersonMode`, la référence est `camera.position`. Sinon, c'est `OrbitControls.target` :

```js
const dist = viewerPos.distanceTo(door.center)
const isTargetOpen = forceOpen || dist < TRIGGER_DIST

// Lerp exponentiel frame-rate independent :
const lerpAlpha = 1 - Math.pow(1 - LERP_SPEED, frameDelta * 60)
const progress = prev + (target - prev) * lerpAlpha

right.position.z = rightOriginZ + progress * SLIDE_AMOUNT
left.position.z  = leftOriginZ  - progress * SLIDE_AMOUNT
```

### Son et flags

- `playOnce('slidingDoor')` est joué quand l'état cible change (ouverture ou fermeture)
- Quand `progress > 0.5` : `userData.isDoorOpen = true` — les deux panneaux sont traversables par `PlayerControls`

### `forceOpen`

Prop qui force toutes les portes ouvertes. Utilisé par `useIntroFlow` pendant la cinématique intro (porte d'entrée ouverte par script).

### Debug mode

Quand `debug=true`, affiche des sphères semi-transparentes autour des triggers et des panneaux colorés sur chaque porte (bleu=right, orange=left, vert/rouge selon état).
