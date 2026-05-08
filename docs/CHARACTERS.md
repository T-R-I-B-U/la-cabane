# Personnages

## Vue d'ensemble

Trois personnages sont présents dans la scène : **Thomas**, **Marie**, **Zoé**. Ils sont tous instanciés dans `SceneCharacters.jsx` via le composant générique `AnimatedCharacter.jsx`.

---

## `AnimatedCharacter.jsx`

Fichier : `src/world/entities/AnimatedCharacter.jsx` (189 lignes)

Composant générique pour tout personnage animé. Gère le clonage du modèle, l'application de textures, et l'enchaînement d'animations.

### Constantes

```js
const CROSSFADE_DURATION = 0.2   // secondes de fondu entre deux clips
const CLIP_END_EPSILON   = 1/60  // offset pour éviter le frame freeze en reverse
```

### Props

```js
{
  url,                 // string : chemin vers le GLB (squelette + animations)
  animationUrl,        // string? : fichier animations séparé (optionnel)
  clip,                // string? : clip unique à jouer (si pas de sequence)
  animationSequence,   // Array<{ clip, reverse?, duration? }> (prioritaire sur clip)
  textureName,         // string : clé pour auto-texturing (ex: 'thomas')
  textureBasePaths,    // string[] : chemins fallback pour les textures
  // + tout autre prop Three.js (position, rotation, scale…)
}
```

### Cycle de vie

```
1. useGLTF(url)                  → charge scene
   useGLTF(animationUrl ?? url)  → charge animations (fichier séparé ou même GLB)
2. useMemo(cloneCharacterScene)  → clone via SkeletonUtils.clone + clone géométrie + matériaux
3. useAnimations(animations, group) → crée les actions Three.js
4. useEffect → applyAutoTextures() via textureResolver
5. useEffect → lance animationSequence OU clip simple
```

### Clonage profond (`cloneCharacterScene`)

```js
const clonedScene = clone(scene)   // SkeletonUtils.clone — préserve le squelette
clonedScene.traverse((obj) => {
  if (!obj.isMesh) return
  obj.geometry = obj.geometry.clone()    // clone géométrie
  obj.material = cloneMaterial(obj.material)  // clone matériaux + textures
})
```

Les meshes reçoivent également :
- `obj.raycast = NO_RAYCAST` — désactive raycasting sur le personnage
- `obj.frustumCulled = true`
- `obj.userData.isCharacter = true`

### `animationSequence`

Tableau d'étapes d'animation jouées dans l'ordre, **cyclique** (revient à l'index 0 après la dernière étape) :

```js
[
  { clip: 'thomas-back', duration: 999 },    // LoopRepeat, passe après 999s
  { clip: 'thomas-turn' },                    // LoopOnce, passe après la fin du clip
  { clip: 'thomas-front', duration: 999 },   // LoopRepeat, passe après 999s
]
```

| Propriété `step` | Comportement |
|-----------------|-------------|
| `duration` fourni | `LoopRepeat Infinity`, `clampWhenFinished=false`, setTimeout après `duration` secondes |
| Pas de `duration` | `LoopOnce 1`, `clampWhenFinished=true`, setTimeout après `clip.duration` secondes |
| `reverse: true` | `timeScale = -1`, `time = clipDuration - CLIP_END_EPSILON` (démarre à la fin) |

**Transition** : `crossFadeFrom(previousAction, 0.2s)` puis `previousAction.stop()` après 200ms.

### Mode `clip` simple (sans sequence)

Si `animationSequence` est absent, `pickDefaultClip` choisit :
1. Le clip dont le nom matche `/idle/i`
2. Sinon `names[0]`
3. Sinon rien

Le clip tourne en `LoopRepeat Infinity`.

---

## `SceneCharacters.jsx`

Fichier : `src/core/scene/SceneCharacters.jsx`

**Important** : seul **Thomas** est actuellement rendu. Marie et Zoé ne sont plus dans ce composant (ils ont probablement été retirés lors d'une refactorisation narrative).

### Résolution des URLs (performance mode)

La résolution vérifie si le fichier compressé existe réellement via `import.meta.glob` :

```js
const compressedModelModules = import.meta.glob('/public/models/compressed/*.{glb,gltf}')

function resolveCharacterUrl(fileName, performanceMode) {
  const compressedKey = `/public/models/compressed/${fileName}`
  if (performanceMode && compressedModelModules[compressedKey]) {
    return `/models/compressed/${fileName}`
  }
  return `/models/${fileName}`
}
```

Si le fichier compressé n'existe pas dans le glob, le fallback standard est utilisé automatiquement.

### Séquences Thomas

```js
const THOMAS_SEQUENCES = {
  back: [
    { clip: 'thomas-back', duration: 999 }     // Dos à la caméra, boucle
  ],
  talking: [
    { clip: 'thomas-turn' },                    // Se retourne (joue une fois)
    { clip: 'thomas-front', duration: 999 }    // Face à la caméra, boucle
  ],
  returning: [
    { clip: 'thomas-turn', reverse: true },    // Se retourne à l'envers
    { clip: 'thomas-back', duration: 999 }     // Dos à la caméra, boucle
  ],
}
```

`thomasAnimPhase` change dans `useIntroFlow` :
- `'back'` → état initial
- `'talking'` → déclenché par `handleThomasEtabliInteract()`
- `'returning'` → déclenché dans le `onDone` de `thomasEtabliDialogue`

### Position Thomas dans la scène

```js
<AnimatedCharacter
  key={thomasUrl}               // remonte si URL change (performance toggle)
  url={thomasUrl}
  animationSequence={sequence}
  textureName="thomas"
  textureBasePaths={textureBasePaths}
  position={[-3.0, FLOOR_Y, -13.259]}       // FLOOR_Y = 0.04
  rotation={[0, (110 * Math.PI) / 180, 0]} // ~110 degrés
  scale={9}
/>
```

### `ClickableThomas`

Toujours rendu (même quand `thomasEtabliPhaseActive = false`) mais inactif. Fournit le hitbox cliquable overlay Thomas.

---

## `ClickableThomas.jsx`

Fichier : `src/world/entities/ClickableThomas.jsx`

Hotspot invisible placé devant Thomas. Active `useCenterScreenMeshInteraction` quand `thomasEtabliPhaseActive = true`.

Lorsque le joueur vise Thomas et clique, `onThomasEtabliInteract()` est appelé → `useIntroFlow` déclenche la transition caméra vers Thomas et l'animation `'talking'`.

---

## Ajouter un nouveau personnage

1. Exporter le GLB depuis Cinema 4D avec le squelette et les clips d'animation
2. Ajouter le fichier dans `public/models/` (et `compressed/` si nécessaire)
3. Définir les textures dans `public/textures/` avec le bon nommage
4. Instancier `<AnimatedCharacter>` dans `SceneCharacters.jsx` avec l'`animationSequence` souhaitée
5. Si le personnage est interactif, créer un composant `ClickableXxx.jsx` sur le même modèle que `ClickableThomas.jsx`
