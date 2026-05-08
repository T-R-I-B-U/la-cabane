# Journal — Puzzle interactif

## Vue d'ensemble

`JournalBook.jsx` est le composant le plus complexe du projet (~400 lignes). Il implémente un **livre 3D interactif avec puzzle drag-and-drop** : 4 pièces à déposer aux bons emplacements.

Fichier : `src/world/entities/JournalBook.jsx`

---

## Machine à états du livre

6 états (enum string) :

```
CLOSED
  │ [autoOpenToken change] ou [clic si active]
  ▼
CAMERA_MOVING   ← caméra se déplace en top-down (DUR_CAMERA = 0.8s)
  │ [caméra arrivée]
  ▼
OPENING   ← animation ouverture du livre (lerp position/rotation pages, DUR_OPEN = 0.9s)
  │ [animation terminée] → onOpenComplete()
  ▼
OPEN      ← puzzle interactif, pièces draggables
  │ [closeToken change]
  ▼
CAMERA_RETURNING  ← caméra revient à sa position narrative (DUR_CAMERA = 0.8s)
  │ [caméra revenue]
  ▼
CLOSING   ← animation fermeture (DUR_CLOSE = 0.7s)
  │ [animation terminée]
  ▼
CLOSED    (→ onInteractionEnd appelé)
```

**Escape** : si le livre est OPEN et que les 4 pièces ne sont pas encore placées, Escape ferme le livre.

### Constantes d'animation

```js
const DUR_CAMERA = 0.8   // durée transition caméra (secondes)
const DUR_OPEN   = 0.9   // durée animation ouverture
const DUR_CLOSE  = 0.7   // durée animation fermeture
const MODEL_SCALE = 1.8  // échelle du modèle GLB
```

### Fonction d'easing

```js
// Cubic ease in-out
function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
```

### `requestClose`

Utilise `useEffectEvent` (React 19) pour garantir que le callback accède toujours à l'état courant sans être dans les dépendances d'un `useEffect`.

---

## Props

```js
{
  position,                    // [x, y, z] world position
  rotationY,                   // number : rotation Y du livre (orientation sur le comptoir)
  active,                      // boolean : peut être ouvert (clic)
  autoOpenToken,               // number : chaque changement déclenche une ouverture auto
  closeToken,                  // number : chaque changement déclenche la fermeture
  pieceInteractionEnabled,     // boolean : pièces draggables
  onInteractionStart,          // () → clic initial sur le livre
  onInteractionEnd,            // () → fermeture complète
  onInteractionCancel,         // () → fermeture rapide/annulée
  onOpenComplete,              // () → animation ouverture terminée
  onPiecePlaced,               // (pieceName: string) → pièce déposée
}
```

---

## Puzzle — 4 pièces

### Noms des pièces

```js
const PIECE_NAMES = ['img01', 'img02', 'img03', 'img04']
```

### Positions de parking (emplacements cibles)

```js
const PARKING_POSITIONS = [
  new THREE.Vector3(-0.09, 0.015, 0.16),
  new THREE.Vector3(-0.03, 0.015, 0.16),
  new THREE.Vector3( 0.03, 0.015, 0.16),
  new THREE.Vector3( 0.09, 0.015, 0.16),
]
```

Ces positions sont relatives au centre du livre ouvert.

### États des pièces

Chaque pièce a un état interne :

| État | Description |
|------|-------------|
| `'hidden'` | Pièce non encore visible |
| `'animating_in'` | Pièce apparaît (animation entrée) |
| `'dragging'` | Pièce en cours de drag par le joueur |
| `'parking'` | Pièce s'anime vers sa position (lerp PIECE_LERP = 3) |
| `'placed'` | Pièce posée définitivement |

### Logique de placement

```js
const DROP_THRESHOLD = 0.03   // distance max pour snap automatique

// Chaque frame en drag :
const dist = draggedPiece.position.distanceTo(parkingPos)
if (dist < DROP_THRESHOLD) {
  piece.state = 'parking'     // → s'anime vers parking position
  onPiecePlaced(pieceName)
}
```

### Hover

```js
const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.18
```

La pièce sous le curseur reçoit cette emissive. Le curseur change en `'pointer'` au hover.

### Caméra top-down

Quand le livre s'ouvre, la caméra se déplace en vue de dessus via :

```js
const CAMERA_TOP_DIRECTION = new THREE.Vector3(0, 0.98, 0.2).normalize()
```

### Drag & drop

Les pièces sont draggées via raycasting sur un plan invisible perpendiculaire à la caméra (technique classique drag 3D) :

```js
// pointerdown → identifie pièce hittée, active drag
// pointermove → project sur plan horizontal à hauteur de la pièce
// pointerup   → drop, test proximity parking
```

---

## Tokens

Le livre utilise deux tokens pour la communication avec `useIntroFlow` :

### `autoOpenToken`

`App.jsx` incrémente ce token pour déclencher l'ouverture automatique du livre sans interaction utilisateur :

```js
// useIntroFlow.js — après journalUnlocked = true
setJournalAutoOpenToken(t => t + 1)
// → JournalBook useEffect([autoOpenToken]) → ouvre
```

### `closeToken`

Incrémenté quand `useIntroFlow` veut fermer le livre de force :

```js
// useIntroFlow.js — après 4ème pièce placée
setJournalCloseToken(t => t + 1)
// → JournalBook useEffect([closeToken]) → ferme
```

---

## Position du livre

`SceneInteractions.jsx` calcule dynamiquement la position du livre à partir du mesh `counter01` :

```js
const bookPosition = useMemo(() => {
  if (!cabane) return null

  const counter = cabane.getObjectByName('counter01')
  if (!counter) return null

  counter.updateWorldMatrix(true, true)

  const bounds = new THREE.Box3().setFromObject(counter)
  const center = bounds.getCenter(new THREE.Vector3())
  const offset = new THREE.Vector3(
    JOURNAL_OFFSET.x,   // 0.68
    JOURNAL_OFFSET.y,   // 0
    JOURNAL_OFFSET.z    // 1.77
  ).applyQuaternion(counter.getWorldQuaternion(new THREE.Quaternion()))

  return [center.x + offset.x, bounds.max.y + offset.y, center.z + offset.z]
}, [cabane])
```

L'offset `JOURNAL_OFFSET` et `JOURNAL_ROTATION_Y = 0.41` ont été ajustés visuellement.

---

## Intégration avec `useIntroFlow`

```
journalUnlocked = true
      ↓
autoOpenToken++         → livre s'ouvre
      ↓
onInteractionStart()    → handleJournalOpen()
                           playDialogue('bookIntroDialogue')
      ↓
onOpenComplete()        → journalPuzzleEnabled = true
      ↓
pièces déposées × 4
      ↓
onPiecePlaced × 4       → handleJournalPiecePlaced()
                           playDialogue('bookImg1-4Dialogue')
                           si 4ème: closeToken++
      ↓
closeToken++            → livre se ferme
      ↓
onInteractionEnd()      → handleJournalEnd()
                           transition caméra → arbre
```

---

## Son du livre

Le son `book` (SFX) est joué lors de l'ouverture du livre. Il est déclenché dans `JournalBook.jsx` via `playOnce('book')` depuis `audioStore`.
