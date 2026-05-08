# Système d'interactions

## Vue d'ensemble

Trois patterns d'interaction distincts sont utilisés selon le contexte :

| Pattern | Fichier | Utilisé par |
|---------|---------|-------------|
| A — Hover géométrie (mouse) | `ClickableDoor.jsx` | Porte d'entrée |
| B — Center-screen raycasting | `useCenterScreenMeshInteraction.js` | Arbre, réception, établi, serre |
| C — Trigger sphérique | `TriggerZone.jsx` | Transition zones |

---

## Pattern A — Hover géométrie (mouse)

Fichier : `src/world/entities/ClickableDoor.jsx`

Utilisé uniquement pour la **porte d'entrée** pendant l'intro. Le joueur n'est pas encore en pointer lock, donc le curseur souris est disponible.

### Fonctionnement

```js
useFrame(() => {
  if (!active || !doorMeshes.length) return

  raycaster.setFromCamera(mouseNDC, camera)
  const hits = raycaster.intersectObjects(doorMeshes, true)
  const isHovered = hits.length > 0

  if (hoveredRef.current !== isHovered) {
    hoveredRef.current = isHovered
    // Met à jour : outline visible, emissive change
    applyDoorHoverEffect(doorMeshes, isHovered)
  }
})
```

Le clic est écouté sur le `canvas` directement :

```js
canvas.addEventListener('click', () => {
  if (hoveredRef.current) {
    canvas.requestPointerLock()
    onDoorClickRef.current?.()
  }
})
```

### Feedback visuel

- Outline géometry (edges) qui apparaît au hover
- Changement d'intensité emissive du matériau

---

## Pattern B — Center-screen raycasting

Fichier : `src/world/interactions/useCenterScreenMeshInteraction.js`

Utilisé en mode **first-person pointer lock**. Le raycasting part du centre de l'écran (NDC `[0, 0]`) comme un "viseur".

### Implémentation

```js
const CENTER_NDC = new THREE.Vector2(0, 0)

useFrame(() => {
  if (!isInteractable || !interactionMeshes.length) return

  raycasterRef.current.setFromCamera(CENTER_NDC, camera)
  const hits = raycasterRef.current.intersectObjects(interactionMeshes, true)
  const isHovered = hits.length > 0

  if (hoveredRef.current !== isHovered) {
    hoveredRef.current = isHovered
    // Lerp emissive vers HOVER_EMISSIVE ou couleur originale
    updateEmissive(interactionMeshes, isHovered)
  }
})
```

**Important** : avant de modifier l'émissive, le hook **clone les matériaux** des meshes trouvés :

```js
mesh.material = mesh.material.clone()
// Évite de partager l'état emissive entre instances du même modèle
// (ex: deux counter01 dans la scène partageant le même matériau GLB)
```

```js

document.addEventListener('pointerdown', (e) => {
  if (e.button === 0 && hoveredRef.current && isInteractable) {
    onInteractRef.current?.()
  }
})
```

### Signature du hook

```js
useCenterScreenMeshInteraction({
  cabaneGroup,               // THREE.Group source pour trouver les meshes
  isInteractable,            // boolean : actif ou non
  findMeshes,                // (group) => THREE.Mesh[] : sélecteur
  hoverEmissive,             // THREE.Color : couleur hover
  hoverEmissiveIntensity,    // number
  onInteract,                // () => void
})
```

### Utilisations

| Composant | `findMeshes` cible | Callback |
|-----------|-------------------|----------|
| `ClickableTree.jsx` | Mesh du tronc | `onTreeInteract` |
| `ClickableReception.jsx` | Meshes accueil | `onReceptionInteract` |
| `ClickableWorkbench.jsx` | Meshes établi | `onWorkbenchInteract` |
| `ClickableGreenhouseDoor.jsx` | Porte serre | `onGreenhouseDoorClick` |
| `ClickableThomas.jsx` | Hitbox Thomas | `onThomasEtabliInteract` |

---

## Pattern C — Trigger sphérique

Fichier : `src/world/interactions/TriggerZone.jsx`

Détecte si la caméra entre ou sort d'une sphère, sans raycasting.

### Implémentation

```js
const r2 = radius * radius                    // Carré du rayon (évite sqrt)
const inside = useRef(false)

useFrame(({ camera }) => {
  const dist2 = camera.position.distanceToSquared(centerVec)

  if (!inside.current && dist2 < r2) {
    inside.current = true
    onEnter?.()
  } else if (inside.current && dist2 >= r2) {
    inside.current = false
    onLeave?.()
  }
})
```

### Utilisations

| Emplacement | Center | Radius | Trigger |
|-------------|--------|--------|---------|
| `CabaneScene.jsx` | `platformPosition` | 10 | `onEnter` → `setZone('arbre')` |
| `ArbreScene.jsx` | `platformPosition` | 10 | `onLeave` → `setZone('cabane')` |

---

## `TreeLeaves.jsx` — Interactions feuilles

Fichier : `src/world/entities/TreeLeaves.jsx` (~328 lignes)

Les feuilles sont un **InstancedMesh** (1 draw call, N instances). L'index d'instance est directement disponible dans `e.instanceId` via les événements pointer R3F.

### Props

```js
{
  leafMesh,           // THREE.InstancedMesh source (extrait par CabaneScene du group)
  active,             // boolean : interactions activées
  onLeafClick,        // (instanceId: number) => void
  onLeafHover,        // (isHovered: boolean) => void
  leafMaterialMode,   // 'standard' | 'physical' | 'emissive'
}
```

### Modes matériau (`leafMaterialMode`)

| Mode | Description |
|------|-------------|
| `'standard'` | MeshStandardMaterial, DoubleSide, pas de transparency |
| `'physical'` | MeshPhysicalMaterial, transmission=0.5, thickness=1, ior=1.45 |
| `'emissive'` | Émissive verte simulant la translucidité (`emissive: 0x446633`) |

Le mode est contrôlable depuis `ViewerControls` (dev).

### Animation des feuilles

**20 profils** générés par un PRNG seedé (Mulberry32, seed=42) — reproductibles à chaque reload :

```js
const animProfiles = Array.from({ length: 20 }, () => ({
  freqX:   0.3 + rand() * 0.8,
  freqZ:   0.3 + rand() * 0.8,
  freqY:   0.2 + rand() * 0.6,
  ampRotX: 0.04 + rand() * 0.08,  // rotation oscillation X (radians)
  ampRotZ: 0.04 + rand() * 0.08,  // rotation oscillation Z
  ampPosY: 0.005 + rand() * 0.03, // translation oscillation Y
  phaseX, phaseZ, phaseY,          // phases aléatoires indépendantes
}))
```

Chaque instance reçoit un profil via un hash de Knuth : `(i * 2654435761 >>> 0) % 20`.

Chaque frame, la matrice de l'instance est calculée comme :
```
matrixFinal = baseMatrix × offset
```
où `offset` est une matrice de rotation Euler + translation Y sinusoïdales.

### LOD — optimisation distance

```js
const LOD_DISTANCE_SQ = 12 * 12   // 144 unités carrées

// En local space (caméra transformée dans l'espace InstancedMesh) :
if (dx*dx + dy*dy + dz*dz > LOD_DISTANCE_SQ) {
  // Feuille trop loin → restore baseMatrix, pas d'animation
  leafMesh.setMatrixAt(i, baseMatrices[i])
  continue
}
```

### Teinte par instance

Seedée (seed=137) — chaque instance reçoit une teinte gris allant de `TINT_MIN=0.45` à `TINT_MAX=1.0` sur les 3 canaux RGB, donnant des variations naturelles de vert sans texture supplémentaire.

### Proxy outline

Pour éviter d'afficher l'outline sur toutes les instances à la fois, un mesh proxy unique (`<lineSegments>`) suit la feuille survolée :

```js
function syncProxy(instanceId) {
  // Récupère la matrice monde de l'instance
  leafMesh.getMatrixAt(instanceId, _instanceMatrix)
  _worldMatrix.multiplyMatrices(leafMesh.matrixWorld, _instanceMatrix)
  // Décompose et recompose sur le proxy
  _worldMatrix.decompose(_pos, _quat, _scl)
  proxy.matrix.compose(_pos, _quat, _scl)
}
```

Le proxy reste `visible=false` sauf pendant le hover, `matrixAutoUpdate=false` pour performance.

### Interactions

```js
<primitive object={leafMesh}
  onPointerMove={(e) => {
    const id = e.instanceId
    if (id === undefined || !inRangeRef.current?.[id]) return
    syncProxy(id)
    proxy.visible = true
    hoverOver(e)
  }}
  onPointerDown={(e) => {
    if (!active || e.instanceId === undefined) return
    onLeafClick(e.instanceId)   // instanceId = number (index Three.js)
  }}
/>
```

**Filtre LOD** : même si Three.js émet un hit sur une instance lointaine, `inRangeRef.current[id]` vaut 0 et l'interaction est ignorée.

---

## `Fruit.jsx` — Fruit interactif

Fichier : `src/world/entities/Fruit.jsx` (~133 lignes)

Chaque fruit est un modèle `growingfruit.gltf` cloné avec un matériau violet et un **outline** qui s'affiche au hover.

### Props

```js
{
  fruitId,          // string : identifiant stable du fruit (ex: 'fruit_01')
  position,         // [x, y, z] world position (défaut: [-25.5, 25.5, -9])
  active,           // boolean
  onFruitClick,     // (fruitId: string) => void
  onFruitHover,     // (isHovered: boolean, fruitId: string) => void
}
```

### Structure

```
<group position={position}>
  <primitive object={cloned.root}    ← modèle violet, reçoit les events pointer
    onPointerOver / onPointerOut / onPointerDown
  />
</group>
<lineSegments ref={proxyRef}         ← outline, visible=false par défaut
  geometry={edgesGeometry}           ← createOutlineGeometry(bodyMesh, seuil=5°, factor=3)
  matrixAutoUpdate={false}
/>
```

### Matériau

```js
const PURPLE = new THREE.Color('#7c3aed')
// MeshStandardMaterial appliqué à tous les sous-meshes du clone
// roughness=0.5, metalness=0.0
```

### Détection du mesh principal

Le mesh avec le plus grand volume (bounding box) dans la hiérarchie est identifié comme `bodyMesh` — c'est sur lui que l'outline est créé.

### Proxy outline

Même technique que `TreeLeaves` : un `<lineSegments>` séparé suit le mesh principal chaque frame via `matrixWorld.decompose()`. Il passe `visible=true` au hover et revient à `false` au blur.

### Nettoyage

`disposeObject3D(cloned.root)` au unmount — libère géométries et matériaux.

---

## `GrowingFruit.jsx` — Fruit animé (décoratif)

Fichier : `src/world/entities/GrowingFruit.jsx` (~65 lignes)

Version **non-interactive** du fruit, uniquement visuelle. Se répète indéfiniment :

```js
const GROW_DURATION  = 3.0  // secondes pour passer de scale 0 → 1
const CYCLE_DURATION = 6.0  // période totale avant redémarrage
```

```js
// Animation chaque frame
elapsedRef.current = (elapsedRef.current + delta) % CYCLE_DURATION
const t = Math.min(elapsed / GROW_DURATION, 1)
const s = easeOutQuart(t)   // 1 - (1-t)^4 : départ rapide, décélère
pivotRef.current.scale.setScalar(s)
```

**Structure** : un groupe outer fixe la position monde, un groupe inner (`pivotRef`) gère le scale depuis l'origine — ainsi le fruit pousse depuis son point d'attache vers le bas (`position.y = -box.max.y` dans le clone).

---

## `InteractionPoint.jsx`

Indicateur visuel (point animé) signalant qu'un objet est interactif. Typiquement une sphère émissive avec une animation de pulsation. Utilisé dans `ArbreScene` (branche `feat/tree-script`) pour signaler les fruits et l'échelle.

---

## `useHoverEffect.js`

Hook utilitaire simple pour gérer l'état hover d'un mesh :

```js
const { isHovered, onPointerEnter, onPointerLeave } = useHoverEffect()
```

Utilisé pour les cas simples où les events R3F `onPointerEnter/Leave` sont disponibles (composants non-InstancedMesh).

---

## `useStableInteractionCallback.js`

Évite de recréer les event listeners à chaque render :

```js
export function useStableInteractionCallback(fn) {
  const ref = useRef(fn)
  useEffect(() => { ref.current = fn }, [fn])
  return ref
}
```

Chaque composant d'interaction qui écoute `document.addEventListener` utilise ce pattern pour référencer toujours la dernière version du callback sans avoir à retirer/ajouter le listener.
