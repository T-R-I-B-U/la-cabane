# Contrôles joueur

## Vue d'ensemble

Deux modes de déplacement existent :
- **First-person** (`PlayerControls.jsx`) — pointer lock, gravité/collision
- **Fly mode** — même composant, sans gravité, déplacement libre en 3D

Le système est géré par `SceneControls.jsx` qui choisit quel composant de caméra est actif.

---

## Constantes

```js
const MOVE_SPEED          = 5.4   // Unités/seconde en déplacement horizontal
const COLLISION_DIST      = 0.6   // Distance de détection collision (raycast)
const DESCEND_SMOOTHING   = 0.3   // Facteur lerp pour descente de marche (exponentiel)
const ASCEND_SMOOTHING    = 0.2   // Facteur lerp pour montée de marche (exponentiel)
const MAX_FRAME_DELTA     = 0.05  // Delta max par frame (anti-lag-spike)
const MAX_SNAP_DOWN_DIST  = 0.9   // Distance max de snap-down sur le sol
const FALL_GRAVITY        = 20    // Accélération gravitationnelle
const MAX_FALL_SPEED      = 12    // Vitesse de chute maximale
const FLY_SPEED           = 4.8   // Vitesse en fly mode
```

---

## Touches clavier

| Touche | Effet normal | Effet fly mode |
|--------|-------------|----------------|
| `W` | Avance | Avance |
| `S` | Recule | Recule |
| `A` | Strafe gauche | Strafe gauche |
| `D` | Strafe droit | Strafe droit |
| `Space` | (sans effet) | Monte |
| `Shift` | — | Descend (`ShiftLeft \|\| ShiftRight`) |

**Pas de flèches directionnelles.** Seuls les codes `KeyW`, `KeyS`, `KeyA`, `KeyD` sont écoutés dans `PlayerControls.jsx`.

**Pas de saut.** En mode normal, `Space` n'a aucun effet. La gravité et le suivi du sol sont gérés par le raycast vers le bas, pas par un saut.

---

## Pointer lock

Le mode first-person nécessite un **pointer lock** pour capturer la souris et orienter la caméra.

### Activation

```js
// Appelé depuis App.jsx lors des transitions narratives
canvas.requestPointerLock()
```

Plusieurs points déclenchent le pointer lock :
- `spawnAtLadder()` : téléportation au pied de l'échelle
- `spawnAtPlatform()` : téléportation sur la plateforme
- Clic sur `ClickableDoor` (intro)

### `suspendPointerUnlockExit`

Certaines transitions caméra (ex: vers POV réception) relâchent temporairement le pointer lock. Pour éviter qu'`App.jsx` réagisse à cet unlock comme à une sortie volontaire du joueur, un flag `ignoreNextPointerUnlockRef` supprime le prochain événement `pointerlockchange`.

---

## Collision detection

`PlayerControls.jsx` lance des **raycasts** dans plusieurs directions à chaque frame.

### Raycast murs (horizontal)

Le joueur effectue 3 raycasts horizontaux à **3 hauteurs différentes** pour chaque direction :

```js
const footY = camera.position.y - PLAYER_HEIGHT
// Les 3 hauteurs testées :
footY + 0.3    // Pied (obstacles bas)
footY + 0.8    // Tibia/genou
camera.position.y  // Épaules/tête
```

**Axis-split** : si un mur est détecté sur un axe (ex: X), le mouvement sur Z est quand même autorisé — le joueur glisse le long des murs au lieu d'être bloqué net.

4 directions (forward, back, left, right) depuis la position caméra :

```js
function isBlockingCollisionHit(hit) {
  if (hit.distance >= COLLISION_DIST) return false         // Trop loin
  if (hit.object.userData.isFloor) return false            // C'est le sol
  if (hit.object.userData.isDoorOpen) return false         // Porte ouverte
  if (hit.object.userData.isStair) return false            // Escalier traversable
  return true
}
```

### Raycast sol (vertical)

Raycast vers le bas pour détecter le sol et appliquer la gravité :

```js
// Si hit.distance < seuil → joueur sur le sol, vélocité Y = 0
// Sinon → appliquer gravité (fallVelocity += FALL_GRAVITY * delta)
// Clamp à MAX_FALL_SPEED
```

### userData flags

Ces flags sont définis sur les meshes de collision via `Cabane.js` lors de la construction :

| Flag | Objet | Comportement |
|------|-------|-------------|
| `userData.isFloor = true` | Plan de sol, `Floor.jsx` | Traversable horizontalement |
| `userData.isDoorOpen = true` | `SlidingDoors.jsx` (quand ouverte) | Traversable |
| `userData.isStair = true` | Meshes escaliers | Traversable |

---

## Système de spawn

Quand la narration téléporte le joueur, `App.jsx` met à jour `playerSpawn` et incrémente `playerSpawnKey`.

```js
const [playerSpawn, setPlayerSpawn] = useState(null)
const [playerSpawnKey, setPlayerSpawnKey] = useState(0)

// → passé à SceneControls → PlayerControls
// PlayerControls repositionne la caméra au mount (playerSpawnKey change → remount)
```

### Fonctions spawn (App.jsx)

```js
// Spawn en vue libre (mode dev ou debug)
function toggleFreePlayerView() {
  setPostIntro(false)
  setPlayerSpawn(getPlayerSpawn(sceneLoadInfo?.hutPosition))
  setPlayerSpawnKey(k => k + 1)
  setUserMovementLocked(false)
  setIsPlayerModeActive(true)
  setIsFlyModeActive(false)
}

// Spawn sur la plateforme (bouton "Vue plateforme" dans ViewerControls)
function enterPlatformView() {
  setPostIntro(false)
  setPlayerSpawn(getPlatformSpawn(sceneLoadInfo?.platformPosition))
  setPlayerSpawnKey(k => k + 1)
  setUserMovementLocked(true)           // Bloqué sur la plateforme
  setIsPlayerModeActive(true)
  setIsFlyModeActive(false)
  setTimeout(() => canvas.requestPointerLock(), 10)
}
```

### Fonctions de calcul (`SceneConfig.js`)

```js
const FLOOR_Y        = 0.04
const PLAYER_HEIGHT  = 1.05
const DEFAULT_HUT_POS  = [-5.0111, 2.3616, 0.9556]
const PLATFORM_POS     = [-2.3079, 23.1922, 20.21005]  // fallback avant cabane.json

function getPlayerSpawn(hutPosition = DEFAULT_HUT_POS) {
  // Spawn légèrement devant la cabane (côté Z+6)
  return new THREE.Vector3(hutX, FLOOR_Y + PLAYER_HEIGHT, hutZ + 6)
}

function getPlatformSpawn(platformPosition = PLATFORM_POS) {
  // Spawn 3 unités AU-DESSUS de la surface réelle
  // → le floor raycaster de PlayerControls snap le joueur vers le bas
  return new THREE.Vector3(px, py + PLAYER_HEIGHT + 3, pz)
}
```

---

## Fly mode

Activé via `isFlyModeActive` (toggle dans `ViewerControls` ou `App.jsx`).

En fly mode :
- La gravité est désactivée
- `Space` monte, `Shift` descend
- Le déplacement horizontal reste le même

Utile pour le debug et pour explorer la scène sans contrainte.

---

## `StoryCameraTransition.jsx`

Composant qui interpole la caméra entre la position courante et un POV narratif défini dans `storyCameraPovs.js`.

### Fonctionnement

```js
// transition = { position: {x,y,z}, target: {x,y,z}, duration?: number }
// duration par défaut = 1.2s

useFrame((_, delta) => {
  elapsedRef.current += Math.min(delta, 0.1)   // delta clampé à 0.1
  const t = easeInOut(Math.min(elapsed / duration, 1))

  camera.position.lerpVectors(startPos, targetPos, t)
  camera.quaternion.slerpQuaternions(startQuat, targetQuat, t)

  if (t >= 1) {
    // Snap exact à la position finale
    camera.position.copy(targetPos)
    camera.quaternion.copy(targetQuat)
    completeRef.current = true
    onComplete?.()   // appelé une seule fois (completeRef guard)
  }
})
```

- Interpolation **position** : `lerpVectors` (linéaire + easing)
- Interpolation **rotation** : `slerpQuaternions` (interpolation sphérique quaternions)
- `easeInOut` quadratique : `t < 0.5 ? 2t² : -1 + (4-2t)t`
- La target quaternion est calculée via `Matrix4.lookAt(position, target, camera.up)` au démarrage

### `storyCameraPovs.js`

Fichier : `src/app/storyCameraPovs.js`

Définit les positions/orientations caméra pour chaque POV narratif :

```js
export const STORY_CAMERA_POVS = {
  accueil:              { position: {...}, target: {...} },  // vue réception/comptoir
  atelier:              { position: {...}, target: {...} },  // vue établi
  talkThomas:           { position: {...}, target: {...} },  // caméra face à Thomas
  greenhouseFrontDoor:  { position: {...}, target: {...} },  // entrée serre
  greenhouseCorridor:   { position: {...}, target: {...} },  // couloir serre
  greenhouseInside:     { position: {...}, target: {...} },  // intérieur serre
}
```

Ces valeurs ont été définies visuellement via le `CameraEditorPanel.jsx` (dev tool). Les clés réelles dans le code sont `accueil`, `atelier`, `talkThomas`, `greenhouseFrontDoor`, `greenhouseCorridor`, `greenhouseInside`.

La transition après le journal pointe vers `INSIDE_POV` (constante locale dans `useIntroFlow.js`), pas vers une entrée de `STORY_CAMERA_POVS`.

---

## `IntroCamera.jsx`

Caméra cinématique pour l'intro, avant que le joueur prenne le contrôle.

Fichier : `src/world/entities/IntroCamera.jsx`

### Waypoints

La cinématique est définie par 5 waypoints fixes (`WAYPOINTS`) interpolés séquentiellement :

```js
const WAYPOINTS = [
  {
    // Waypoint 0 — position initiale (2s de délai avant de démarrer)
    position: new THREE.Vector3(-84.2679, 25.15, -24.166),
    target:   new THREE.Vector3(-9.4607,  7.3604, -2.0887),
    duration: 0, delay: 2,
  },
  {
    // Waypoint 1 — survol depuis la forêt (3.5s)
    position: new THREE.Vector3(-39.8198, 7.2813, -8.6382),
    target:   new THREE.Vector3(-11.3697, 0.642,  -1.0329),
    duration: 3.5,
  },
  {
    // Waypoint 2 — devant la porte, attend le clic (2.5s)
    position: new THREE.Vector3(-31.6806, 3.5464, -6.5206),
    target:   new THREE.Vector3(-11.8577, 0.6514,  0.0448),
    duration: 2.5, event: 'wait:door', waitForInput: true,
  },
  {
    // Waypoint 3 — passage à travers la porte (2.0s)
    position: new THREE.Vector3(-23.7944, 1.5695, -5.3764),
    target:   new THREE.Vector3(-12.4469, 0.5678, -5.3619),
    duration: 2.0, event: 'door:open',
  },
  {
    // Waypoint 4 — position intérieure finale = INSIDE_POV (2.5s)
    position: new THREE.Vector3(-14.3667, 1.3785, -5.1169),
    target:   new THREE.Vector3(-12.5066, 1.7137, -5.2008),
    duration: 2.5, event: 'inside',
  },
]
```

### Fonctionnement

- Interpolation **linéaire** (`lerpVectors`) avec easing quadratique in-out : `t < 0.5 ? 2t² : -1 + (4 - 2t)t`
- `delta` clampé à `0.1s` par frame pour éviter les sauts sur lag-spike
- Quand `waitForInput: true` → `waitingRef = true`, la progression est suspendue jusqu'à `shouldAdvance = true`
- Chaque waypoint peut émettre un `event` via `onEvent(name)` à l'arrivée

### Événements émis

| Événement | Moment | Effet dans `useIntroFlow` |
|-----------|--------|--------------------------|
| `'camera:ready'` | Au premier `useLayoutEffect` | — (interne) |
| `'wait:door'` | Arrivée waypoint 2 | `introWaitingAtDoor = true` |
| `'door:open'` | Arrivée waypoint 3 | `introDoorOpen = true` |
| `'inside'` | Arrivée waypoint 4 | `postIntro = true`, dialogue `01-voice-tree` |
