# Pipeline Assets — Construction de la cabane

## Vue d'ensemble

La cabane n'est pas chargée comme un unique fichier GLB. Elle est **construite dynamiquement** à partir d'une description JSON (`cabane.json`) et de fichiers 3D individuels. Ce pipeline permet de contrôler finement la visibilité par zone, le mode performance, et l'instancing.

```
cabane.json
    │
    ▼ buildCabane() [Cabane.js]
    │
    ├─ Pour chaque node
    │   ├─ type=Mesh       → loadModel() + applyAutoTextures() [nodeBuilder.js]
    │   └─ type=InstancedMesh → buildInstancedMesh() [instancing.js]
    │
    └─ THREE.Group complet
```

---

## `cabane.json` — Format

Fichier : `public/cabane.json`

Hiérarchie de nodes exportée depuis Cinema 4D :

```json
[
  {
    "name": "hut01",
    "type": "Mesh",
    "position": [-5.011, 2.361, 0.955],
    "rotation": [0, 0, 0],
    "scale": [1, 1, 1],
    "children": [
      {
        "name": "counter01",
        "type": "Mesh",
        "position": [...],
        "children": []
      }
    ]
  },
  {
    "name": "leaf",
    "type": "InstancedMesh",
    "position": [0, 0, 0],
    "children": []
  }
]
```

### Types de nodes

| Type | Traitement |
|------|-----------|
| `"Mesh"` | Charge le GLTF correspondant, applique textures |
| `"InstancedMesh"` | Charge template GLTF + fichier `.bin` matrices |

---

## `Cabane.js` — Factory

Fichier : `src/world/entities/Cabane.js`

Point d'entrée async :

```js
export async function buildCabane({ performanceMode }) {
  const nodes = await fetch('/cabane.json').then(r => r.json())

  const modelBasePaths = performanceMode
    ? ['/models/compressed/', '/models/']
    : ['/models/']

  const textureBasePaths = performanceMode
    ? ['/textures/compressed/', '/textures/']
    : ['/textures/']

  // Traite TOUS les nodes racine (pas seulement nodes[0])
  const children = await Promise.all(
    nodes.map(node => buildNode(node, { modelBasePaths, textureBasePaths }))
  )
  const root = new THREE.Group()
  children.forEach(c => root.add(c))

  // Colliders programmatiques (pas dans cabane.json)
  attachNestColliders(root.getObjectByName('nest'))
  attachRailingColliders(root.getObjectByName('railling'))
  attachRailingColliders(root.getObjectByName('railling-hut'))

  // Flags userData post-traversal
  root.traverse(obj => {
    if (!obj.isMesh) return
    if (/^stairs-marche/i.test(obj.name)) obj.userData.isStair = true
    if (obj.name === 'platform' || obj.name === 'platform-hut') obj.userData.isFloor = true
  })

  // Extrait la position de hut01 depuis le JSON brut (avant construction)
  root.userData.hutPosition = findNodePosition(nodes, 'hut01')

  return root
}
```

---

## `nodeBuilder.js` — Construction récursive

Fichier : `src/world/cabane/nodeBuilder.js`

```js
async function buildNode(node, { modelBasePaths, textureBasePaths }) {
  // 1. InstancedMesh → pipeline instancing
  if (node.type === 'InstancedMesh')
    return buildInstancedMesh(node, { modelBasePaths })

  // 2. Cherche le fichier modèle (essaie .glb puis .gltf pour chaque basePath)
  const baseName = modelBaseName(node.name)
  let object3d = null

  for (const basePath of modelBasePaths) {
    for (const ext of ['.glb', '.gltf']) {
      try {
        object3d = await loadModel(basePath + baseName + ext)
        await applyAutoTextures(object3d, baseName, textureBasePaths)
        break
      } catch (_) {
        continue  // Essaie le chemin/extension suivant
      }
    }
    if (object3d) break
  }

  // 3. Fallback : groupe vide (node structurel sans géométrie)
  if (!object3d) object3d = new THREE.Group()

  // 4. Applique transform depuis cabane.json
  applyTransform(object3d, node)

  // 5. Construit récursivement les enfants
  if (node.children?.length) {
    const children = await Promise.all(
      node.children.map(child => buildNode(child, { modelBasePaths, textureBasePaths }))
    )
    children.forEach(c => object3d.add(c))
  }

  return object3d
}
```

### `applyTransform`

Extrait `position`, `rotation`, `scale` du node JSON et les applique à l'Object3D via `object3d.position.set(...)`, `object3d.rotation.set(...)`, `object3d.scale.set(...)`. Les valeurs sont utilisées directement (radians pour la rotation).

---

## `instancing.js` — InstancedMesh

Fichier : `src/world/cabane/instancing.js`

Les feuilles (et potentiellement d'autres objets répétitifs) utilisent le **instancing** Three.js pour un rendu très efficace (1 draw call pour 1000+ instances).

### Format du fichier `.bin`

```
Offset 0 : uint32 (4 bytes) → nombre d'instances N
Offset 4 : Float32Array (N × 16 floats) → matrices 4×4 de chaque instance
```

### Reconstruction

```js
async function buildInstancedMesh(node, { modelBasePaths }) {
  // 1. Charge le template GLTF (géométrie + matériau source)
  const template = await loadModel(basePath + baseName + '.gltf')

  // 2. Fetch et parse le binaire
  const buffer = await fetch(baseName + '.bin').then(r => r.arrayBuffer())
  const count = new DataView(buffer).getUint32(0, true)
  const matrices = new Float32Array(buffer, 4, count * 16)

  // 3. Extrait géométrie et matériau du template
  let geometry, material
  template.traverse(child => {
    if (!geometry && child.isMesh) {
      geometry = child.geometry.clone()
      material = cloneMaterialWithTextures(child.material)
    }
  })

  // 4. Crée et configure l'InstancedMesh
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.array.set(matrices)
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false    // Évite culling incorrect sur instances étendues
  mesh.raycast = () => {}       // Désactive raycasting (géré par TreeLeaves)

  return mesh
}
```

---

## `textureResolver.js` — Auto-texturing

Fichier : `src/world/cabane/textureResolver.js`

Applique automatiquement les textures PBR aux meshes en cherchant des fichiers selon des conventions de nommage.

### Slots de textures

```js
const TEXTURE_SLOTS = [
  {
    suffixes: ['color', 'basecolor', 'albedo'],
    materialKey: 'map',
    colorSpace: THREE.SRGBColorSpace,
  },
  {
    suffixes: ['metallic', 'metalness'],
    materialKey: 'metalnessMap',
  },
  {
    suffixes: ['roughness'],
    materialKey: 'roughnessMap',
  },
  {
    suffixes: ['normal'],
    materialKey: 'normalMap',
  },
  {
    suffixes: ['ao', 'occlusion'],
    materialKey: 'aoMap',
  },
  {
    suffixes: ['emissive'],
    materialKey: 'emissiveMap',
    colorSpace: THREE.SRGBColorSpace,
  },
]
```

### Alias de mesh

Certains meshes utilisent une texture différente du nom par défaut :

```js
const MESH_TEXTURE_ALIASES = {
  'platform-details': 'railling',  // utilise la texture de railling
  // ...
}
```

Certains meshes forcent l'application de texture même si le matériau en a déjà une :

```js
const FORCE_TEXTURE_OVERRIDE_MESHES = ['hut01', 'platform', ...]
```

### Transforms UV

Certaines textures nécessitent des transformations UV (offset/rotation) :

```js
const TEXTURE_TRANSFORMS = {
  'nest_foot': { rotation: Math.PI / 2, ... },
  // ...
}
```

### Cache et clonage

- `textureCache` : `Map<url, Promise<Texture>>` — évite les doubles chargements
- `cloneTexture(tex)` : clone par usage (évite l'état partagé entre instances)
- `clearTextureCache()` : libère toutes les textures chargées (appelé au unmount dans `CabaneMap.jsx`)

### `import.meta.glob`

Les textures disponibles sont scannées au build time :

```js
const textureModules = import.meta.glob('/public/textures/**/*.{png,jpg,webp,ktx2}')
```

Ce glob détermine quels fichiers existent sans faire de requêtes HTTP au runtime.

### Algorithme de résolution

```js
async function applyAutoTextures(object3d, baseName, textureBasePaths) {
  object3d.traverse(obj => {
    if (!obj.isMesh) return

    const meshName = MESH_TEXTURE_ALIASES[obj.name] ?? obj.name
    const candidates = textureNameCandidates(meshName)
    // ex: ['counter01', 'counter', 'hut01-counter01']

    for (const slot of TEXTURE_SLOTS) {
      for (const suffix of slot.suffixes) {
        const url = findTextureUrl(candidates, suffix, textureBasePaths)
        if (url) {
          loadTexture(url).then(tex => {
            tex.colorSpace = slot.colorSpace ?? THREE.NoColorSpace
            obj.material[slot.materialKey] = cloneTexture(tex)
            obj.material.needsUpdate = true
          })
          break
        }
      }
    }
  })
}
```

---

## `assetNaming.js` — Normalisation des noms

Fichier : `src/world/cabane/assetNaming.js`

### `normalizeAssetName(name)`

Nettoie un nom d'asset pour le matching fichier :

```
"Porte_Entrée_01"  →  "porte-entree-01"
"counter01"        →  "counter01"
"Arbre Nid"        →  "arbre-nid"
```

```js
name
  .normalize('NFD')                        // Décompose "é" → "e" + accent
  .replace(/[̀-ͯ]/g, '')        // Supprime diacritiques
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')           // Remplace tout non-alnum par "-"
  .replace(/^-|-$/g, '')                 // Trim tirets
```

### `modelBaseName(name)`

Gère les alias entre modèles :

```js
if (/^window0[23]$/i.test(name)) return 'window01'
// window02 et window03 utilisent le même modèle que window01

return name.replace(/_\d+$/, '')
// counter01_2 → counter01 (instances multiples d'un même modèle)
```

---

## `runtime.js` — Helpers transform

Fichier : `src/world/cabane/runtime.js`

### `applyTransform(object3d, nodeData)`

Applique position/rotation/scale depuis le JSON au Object3D Three.js.

### `cloneMaterialWithTextures(material)`

Clone un matériau Three.js en préservant toutes les références de textures :

```js
const cloned = material.clone()
// Les textures ne sont pas clonées, juste référencées
// → économise mémoire GPU
cloned.needsUpdate = true
return cloned
```

---

## `zoneMap.json` — Visibilité par zone

Fichier : `src/world/cabane/zoneMap.json`

Détermine quels nodes sont visibles selon la zone active.

### Format

```json
{
  "zones": {
    "cabane": ["ground-hut", "hut01", "counter01", "trunk", "stairs01"],
    "arbre":  ["trunk", "leaf", "platform", "ladder", "stairs02"]
  },
  "hidden": {
    "arbre": ["platforme-hut.gltf"]
  }
}
```

### Application

`CabaneScene.jsx` appelle `applyVisibilityZone(cabaneGroup, [activeZone])` dans un `useEffect` sur le changement de zone. Cette fonction traverse le groupe Three.js et ajuste `mesh.visible` selon les listes.

---

## Performance mode

Quand `performanceMode = true`, tous les chargements preferent le dossier `compressed/` :

| Ressource | Normal | Performance |
|-----------|--------|-------------|
| Modèles | `/models/hut01.gltf` | `/models/compressed/hut01.glb` (Draco) |
| Textures | `/textures/hut01-color.png` | `/textures/compressed/hut01-color.webp` |
| Personnages | `/models/thomas-animated.glb` | `/models/compressed/thomas-animated.glb` |

Le fallback est automatique : si le fichier compressé n'existe pas, le builder essaie le chemin standard.
