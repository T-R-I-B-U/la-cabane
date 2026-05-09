# Intégrer une nouvelle partie de scénario

Guide pratique pour ajouter une séquence scénarisée complète : dialogue → interaction → transition caméra → progression.

---

## Vue d'ensemble du flux

```
audioConfig.json        → déclare les pistes audio/dialogue
storyScript.js          → définit les étapes de la narration
useIntroFlow.js         → orchestre les séquences (dialogues, caméras, phases)
SceneInteractions.jsx   → connecte les entités clickables à l'orchestrateur
Entité (ClickableXxx)   → écoute isInteractable, remonte onInteract
storyCameraPovs.js      → positions de caméra prédéfinies
visibilityZoneStore.js  → contrôle quels objets 3D sont visibles
```

---

## Étape 1 — Déclarer le dialogue dans `audioConfig.json`

Fichier : `src/core/audio/audioConfig.json`

### Avec fichier audio + sous-titres

```json
{
  "id": "monNouveauDialogue",
  "type": "dialogue",
  "src": "tree/16-voice-tree.mp3",
  "loop": false,
  "volume": 1,
  "autoplay": false,
  "subtitles": "tree/16-voice-tree.srt"
}
```

### Texte seul (pas de fichier .mp3)

```json
{
  "id": "monNouveauDialogue",
  "type": "dialogue",
  "loop": false,
  "volume": 1,
  "autoplay": false,
  "subtitles": "mon-dialogue.srt"
}
```

Le fichier `.srt` doit être dans `public/subtitles/`. Format standard SRT :

```
1
00:00:00,000 --> 00:00:03,500
Première ligne du dialogue.

2
00:00:04,000 --> 00:00:07,000
Deuxième ligne.
```

### Son d'ambiance (SFX)

```json
{
  "id": "monAmbiance",
  "type": "sfx",
  "src": "Ambiance-Workbench.mp3",
  "loop": true,
  "volume": 0.7,
  "autoplay": false
}
```

---

## Étape 2 — Ajouter les étapes dans `storyScript.js`

Fichier : `src/app/storyScript.js`

Chaque étape a un `type` : `'dialogue'` | `'input'` | `'objective'`

```js
'maScene.etape1': {
  id: 'maScene.etape1',
  type: 'dialogue',
  dialogueId: 'monNouveauDialogue',   // id dans audioConfig.json
  next: 'maScene.etape2',
},
'maScene.etape2': {
  id: 'maScene.etape2',
  type: 'objective',
  objective: 'Clique sur l\'objet',   // texte affiché à l'écran
  next: 'maScene.etape3',
},
'maScene.etape3': {
  id: 'maScene.etape3',
  type: 'dialogue',
  dialogueId: 'autreDialogue',
  next: null,                          // null = fin de séquence
},
```

> `next: null` signifie que `useStoryFlow` n'avance plus automatiquement.
> C'est `useIntroFlow` qui prend le relais manuellement.

---

## Étape 3 — Orchestrer dans `useIntroFlow.js`

Fichier : `src/app/useIntroFlow.js`

### Ajouter un état de phase

```js
const [maNouvellePhaseActive, setMaNouvellePhaseActive] = useState(false)
```

Ajouter la remise à zéro dans `resetFlowState` :

```js
setMaNouvellePhaseActive(false)
```

### Déclencher la séquence

Pattern type : dialogue → attente interaction → dialogue suite

```js
const handleMonObjetInteract = useCallback(() => {
  setMaNouvellePhaseActive(false)   // désactiver l'interaction pendant la séquence

  setStoryCameraTransition({
    ...STORY_CAMERA_POVS.monPov,    // position/target depuis storyCameraPovs.js
    duration: 1.2,
  })

  scheduleFlowTimeout(() => {
    playDialogue('monNouveauDialogue', {
      onDone: () => {
        completeStep('maScene.etape2')  // avancer dans storyScript
        setMaNouvellePhaseActive(true)  // ré-activer si besoin
        // ou déclencher la suite ici
      },
    })
  }, 800)  // délai après transition caméra
}, [playDialogue, scheduleFlowTimeout, completeStep, setStoryCameraTransition])
```

### Démarrer la séquence depuis un événement de jeu

Si la séquence démarre à un step précis du `storyScript` :

```js
useEffect(() => {
  if (currentStepId === 'maScene.etape1') {
    setMaNouvellePhaseActive(true)
  }
}, [currentStepId])
```

### Jouer une ambiance en parallèle

```js
import { play, fade, stop } from '../utils/audioStore'

// Démarrer
play('monAmbiance')

// Fade out propre à la fin
scheduleFlowTimeout(() => fade('monAmbiance', 0, 800), 2000)
```

---

## Étape 4 — Définir une position de caméra

Fichier : `src/app/storyCameraPovs.js`

```js
export const STORY_CAMERA_POVS = {
  // ... existants ...
  monPov: {
    position: { x: -14.0, y: 1.5, z: -5.0 },
    target:   { x: -12.0, y: 1.7, z: -5.2 },
  },
}
```

Récupérer les coordonnées en mode dev : afficher `camera.position` et `controls.target` dans la console via `useThree`.

---

## Étape 5 — Créer une entité clickable (si besoin)

Si la phase nécessite un objet cliquable dans la scène.

**Nouveau fichier** : `src/world/entities/ClickableMonObjet.jsx`

```jsx
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = '#ffffff'
const HOVER_EMISSIVE_INTENSITY = 0.3

function findMonObjetMesh(group) {
  const mesh = group.getObjectByName('NomDuMeshDansLeGLB')
  return mesh ? [mesh] : []
}

export function ClickableMonObjet({ cabane, isInteractable, onInteract }) {
  useCenterScreenMeshInteraction({
    cabaneGroup: cabane,
    isInteractable,
    findMeshes: findMonObjetMesh,
    hoverEmissive: HOVER_EMISSIVE,
    hoverEmissiveIntensity: HOVER_EMISSIVE_INTENSITY,
    onInteract,
  })
  return null
}
```

> Le nom du mesh vient du GLB exporté depuis Cinema 4D. Vérifier avec `group.traverse(c => console.log(c.name))`.

---

## Étape 6 — Connecter à `SceneInteractions`

Fichier : `src/core/scene/SceneInteractions.jsx` (ou équivalent)

### Ajouter la prop

```jsx
export function SceneInteractions({
  cabane,
  // ...
  maNouvellePhaseActive,
  onMonObjetInteract,
}) {
  return (
    <>
      {/* ... existants ... */}
      <ClickableMonObjet
        cabane={cabane}
        isInteractable={maNouvellePhaseActive}
        onInteract={onMonObjetInteract}
      />
    </>
  )
}
```

### Passer la prop depuis la scène parente

Remonter `maNouvellePhaseActive` et `handleMonObjetInteract` depuis `useIntroFlow` jusqu'à `SceneInteractions` via les props React habituelles.

---

## Étape 7 — Contrôler la visibilité de zone (optionnel)

Si la séquence change de zone visible :

```js
import { setVisibilityZones } from '../utils/visibilityZoneStore'

// Activer une zone
setVisibilityZones(['cabane'])

// Plusieurs zones
setVisibilityZones(['cabane', 'serre'])
```

Zones disponibles (définies dans `zoneMap.json`) : `'all'`, `'cabane'`, `'serre'`, `'arbre'`, `'nid'`.

---

## Récapitulatif : checklist d'intégration

```
[ ] audioConfig.json     — ajouter la piste (id, src, subtitles)
[ ] public/subtitles/    — ajouter le fichier .srt
[ ] public/audio/        — ajouter le fichier .mp3
[ ] storyScript.js       — ajouter les étapes (dialogue / objective / input)
[ ] storyCameraPovs.js   — ajouter le POV si transition caméra
[ ] useIntroFlow.js      — ajouter l'état de phase + les handlers
[ ] ClickableXxx.jsx     — créer l'entité si objet cliquable (src/world/entities/)
[ ] SceneInteractions    — monter l'entité + passer les props
[ ] resetFlowState()     — remettre à zéro les nouveaux états
```

---

## Patterns courants

### Dialogue chainé (A → B → C)

```js
playDialogue('dialogueA', {
  onDone: () => {
    scheduleFlowTimeout(() => {
      playDialogue('dialogueB', {
        onDone: () => {
          playDialogue('dialogueC', { onDone: () => completeStep('maScene.fin') })
        },
      })
    }, 500)
  },
})
```

### Attendre une interaction player après un dialogue

```js
playDialogue('monDialogue', {
  onDone: () => {
    completeStep('maScene.objectif')    // affiche le texte objectif
    setMaNouvellePhaseActive(true)      // active le clickable
    // handleMonObjetInteract() sera appelé par l'entité quand le joueur clique
  },
})
```

### Transition caméra + dialogue synchronisé

```js
setStoryCameraTransition({ ...STORY_CAMERA_POVS.monPov, duration: 1.0 })
scheduleFlowTimeout(() => playDialogue('monDialogue', { onDone: ... }), 1000)
// délai ≈ duration de la transition
```

### Branching (choix du joueur)

Voir `handleReceptionChoice` dans `useIntroFlow.js` comme référence. Pattern :
1. Afficher un composant UI de choix (`setReceptionChoiceVisible(true)`)
2. Handler `onChoice(value)` → branche sur deux dialogues différents
3. Les deux branches convergent vers `completeStep('maScene.suite')`
