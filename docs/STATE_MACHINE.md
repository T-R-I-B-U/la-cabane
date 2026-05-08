# State Machine Narrative — `useIntroFlow`

## Fichier source

`src/app/useIntroFlow.js` (~500 lignes)

Ce hook est la machine à états centrale de toute la narration. Il est instancié une seule fois dans `App.jsx` et retourne des états + callbacks qui descendent en props vers `<Scene>`.

---

## Constante POV de base

```js
const INSIDE_POV = {
  position: { x: -14.3667, y: 1.3785, z: -5.1169 },
  target:   { x: -12.5066, y: 1.7137, z: -5.2008 },
}
```

C'est le spawn "de base" à l'intérieur de la cabane. Il est utilisé pour le spawn post-intro et pour la transition POV après le journal.

## États `useState` dans le hook

| État | Valeur initiale | Signification |
|------|----------------|---------------|
| `introActive` | `false` | Caméra cinématique intro en cours |
| `introDoorOpen` | `false` | La porte d'entrée est ouverte |
| `introWaitingAtDoor` | `false` | Caméra arrivée devant la porte, attend le clic |
| `introShouldAdvance` | `false` | Signal : l'intro peut continuer (porte cliquée) |
| `introPending` | `false` | `launchIntro()` appelé mais scène pas encore prête |
| `loaderFading` | `false` | L'écran loader est en train de disparaître |
| `postIntro` | `false` | L'intro cinématique est terminée |
| `introMovementLocked` | `false` | Mouvement du joueur bloqué pendant intro |
| `introSpawn` | `null` | Position/target de spawn initiale (INSIDE_POV) |
| `storyCameraTransition` | `null` | POV actif pour la transition caméra |
| `showNameInput` | `false` | Formulaire saisie nom visible |
| `receptionChoiceVisible` | `false` | Choix oui/non visible |
| `returnHallVisible` | `false` | Bouton "retour hall" visible |
| `journalUnlocked` | `false` | Le livre peut être cliqué |
| `journalAutoOpenToken` | `0` | Incrémenté pour ouvrir le livre automatiquement |
| `journalCloseToken` | `0` | Incrémenté pour fermer le livre de force |
| `journalPuzzleEnabled` | `false` | Les pièces du puzzle sont interactives |
| `treePhaseActive` | `false` | L'arbre dans la scène est cliquable |
| `workbenchPhaseActive` | `false` | L'établi est cliquable |
| `greenhousePhaseActive` | `false` | La porte de la serre est cliquable |
| `thomasEtabliPhaseActive` | `false` | Thomas (hotspot) est cliquable |
| `thomasAnimationPhase` | `'back'` | Animation Thomas (`back` / `talking` / `returning`) |
| `playerName` | `''` | Nom saisi par le joueur |

**Note importante** : `etabliPhaseActive` est géré par `const [, setEtabliPhaseActive] = useState(false)` — seul le setter est gardé, l'état n'est PAS exposé dans le retour du hook (usage interne uniquement).

## Intégration `useStoryFlow`

`useIntroFlow` utilise `useStoryFlow` pour suivre les étapes narratives :

```js
const { currentStepId, completeStep, goToStep, resetStory, startStory } = useStoryFlow()
const storyReady = currentStepId === 'intro.goToReception'
```

`storyReady` est utilisé dans `SceneControls.jsx` pour décider si le joueur peut bouger librement.

### `storyScript.js` — étapes définies

Fichier : `src/app/storyScript.js`

Le script ne définit que **4 étapes** — celles qui ont une `objective` affichée à l'écran ou qui correspondent à des transitions narratives trackées. Le reste de la narration est géré directement dans `useIntroFlow` :

```js
export const STORY_SCRIPT = {
  'intro.treeWelcome': {
    type: 'dialogue',
    dialogueId: 'dialogue1',
    next: 'intro.nameInput',
  },
  'intro.nameInput': {
    type: 'input',
    next: 'intro.cabanePresentation',
  },
  'intro.cabanePresentation': {
    type: 'dialogue',
    dialogueId: 'dialogue2',
    next: 'intro.goToReception',
  },
  'intro.goToReception': {
    type: 'objective',
    objective: "Clique sur l'accueil",
    next: null,      // fin du script — plus de step suivant
  },
}

export const STORY_START_STEP = 'intro.treeWelcome'
```

À partir de `intro.goToReception`, `useIntroFlow` prend le relai complet sans passer par `completeStep`.

## Touche Escape

Une écoute globale sur `Escape` déclenche `exitIntro()` :

```js
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') exitIntro()
})
```

`exitIntro()` appelle `resetFlowState()` + `resetStory()` + `stopDialogue()` — remet tout à zéro.

## `resetFlowState`

Remet **tous** les états à leur valeur initiale, annule tous les timeouts schedulés, et stoppe les ambiances audio (`stop('ambianceWorkbench')`, `stop('ambianceGreenhouse')`).

---

## Refs (non-réactives, pour coordination interne)

| Ref | Rôle |
|-----|------|
| `journalPlacedCountRef` | Nombre de pièces puzzle placées (0→4) |
| `journalCompletedRef` | Livre complété (4 pièces) |
| `isPostBookTransitionRef` | Flag : transition post-livre vers arbre en cours |
| `isEtabliTransitionRef` | Flag : transition vers POV atelier en cours |
| `isThomasTransitionRef` | Flag : transition vers POV Thomas en cours |
| `greenhouseTransitionStageRef` | Étape serre : `null` → `'front'` → `'corridor'` → `'inside'` |
| `scheduledTimeoutsRef` | Set de timeouts actifs (nettoyés à unmount) |
| `ignoreNextPointerUnlockRef` | Supprime le prochain événement de pointer unlock |

---

## Diagramme de flux narratif

```
[Page chargée]
      │
      ▼
[sceneReady = true]
      │
      ▼ handleLoaderClick()
[introActive = true]
      │
      │   IntroCamera joue la cinématique
      │   ├─ emit 'wait:door' ──────────→ introWaitingAtDoor = true
      │   │                               ClickableDoor devient actif
      │   ├─ [Clic porte] ──────────────→ introShouldAdvance = true
      │   │                               IntroCamera continue
      │   ├─ emit 'door:open' ──────────→ introDoorOpen = true
      │   └─ emit 'inside' ────────────→ postIntro = true
      │                                   introActive = false
      │
      ▼
[Dialogue 01-voice-tree]
      │
      │  onDone
      ▼
[showNameInput = true]
      │
      │ handleNameSubmit(name)
      ▼
[Dialogue 02-voice-tree]
      │
      │  onDone
      ▼
[Joueur libre dans la cabane]
      │
      │ handleReceptionInteract()
      ▼
[storyCameraTransition → POV réception]
      │
      │ handleStoryCameraTransitionComplete()
      ▼ (normal : pas de flag actif)
[receptionChoiceVisible = true]
[Dialogue receptionDialogue]
      │
      │ handleReceptionChoice(answer)
      ├─ 'yes' → playDialogue('receptionYesDialogue')
      └─ 'no'  → playDialogue('receptionNoDialogue')
                        │
                        │ onDone
                        ▼
              [journalUnlocked = true]
                        │
                        │ handleJournalOpen() (autoOpenToken)
                        ▼
              [Dialogue bookIntroDialogue]
                        │
                        │ onDone
                        ▼
              [journalPuzzleEnabled = true]
                        │
                        │ handleJournalPiecePlaced(pieceName) × 4
                        ├─ pièce 1 → bookImg1Dialogue
                        ├─ pièce 2 → bookImg2Dialogue
                        ├─ pièce 3 → bookImg3Dialogue
                        └─ pièce 4 → bookImg4Dialogue
                                     journalCompletedRef = true
                                     [closeToken++] → JournalBook se ferme
                                           │
                                           │ handleJournalEnd()
                                           │ isPostBookTransitionRef = true
                                           ▼
                              [storyCameraTransition → POV arbre]
                                           │
                                           │ handleStoryCameraTransitionComplete()
                                           │ isPostBookTransitionRef actif
                                           ▼
                                [treePhaseActive = true]
                                           │
                                           │ handleTreeInteract()
                                           ▼
                          [treePhaseActive = false]
                          [playSequence : treeRacinesDialogue
                                          treeBorneDialogue
                                          treeArbreDialogue
                                          treeOutroDialogue]
                                           │
                                           │ onComplete
                                           ▼
                                [workbenchPhaseActive = true]
                                [etabliPhaseActive = true]
                                           │
                                           │ handleWorkbenchInteract()
                                           │ isEtabliTransitionRef = true
                                           ▼
                          [storyCameraTransition → POV établi]
                                           │
                                           │ handleStoryCameraTransitionComplete()
                                           │ isEtabliTransitionRef actif
                                           ▼
                              [playDialogue('etabliDialogue')]
                                           │
                                           │ onDone
                                           ▼
                              [thomasEtabliPhaseActive = true]
                                           │
                                           │ handleThomasEtabliInteract()
                                           │ thomasAnimPhase = 'talking'
                                           │ isThomasTransitionRef = true
                                           ▼
                          [storyCameraTransition → POV Thomas]
                                           │
                                           │ handleStoryCameraTransitionComplete()
                                           │ isThomasTransitionRef actif
                                           ▼
                              [playDialogue('thomasEtabliDialogue')]
                                           │
                                           │ onDone
                                           ▼
                              [greenhousePhaseActive = true]
                                           │
                                           │ handleGreenhouseDoorClick()
                                           ▼
                          [Multi-étapes serre]
                          front → corridor → inside
```

---

## Tableau des transitions

| Événement | Callback | Avant | Après | Dialogue déclenché |
|-----------|----------|-------|-------|-------------------|
| Clic IntroLoader | `handleLoaderClick` | — | `introActive=true` | — |
| Caméra arrive porte | event `'wait:door'` | — | `introWaitingAtDoor=true` | — |
| Clic porte | — | — | `introShouldAdvance=true` | — |
| Porte ouverte | event `'door:open'` | — | `introDoorOpen=true` | — |
| Caméra à l'intérieur | event `'inside'` | `introActive=true` | `postIntro=true` | `01-voice-tree` |
| onDone 01 | — | — | `showNameInput=true` | — |
| Soumission nom | `handleNameSubmit` | — | — | `02-voice-tree` |
| onDone 02 | — | — | mouvement libre | — |
| Clic réception | `handleReceptionInteract` | — | transition POV | `receptionDialogue` |
| Transition complete | `handleStoryCameraTransitionComplete` | — | `receptionChoiceVisible=true` | — |
| Choix réception | `handleReceptionChoice` | — | — | `receptionYesDialogue` ou `receptionNoDialogue` |
| onDone choix | — | — | `journalUnlocked=true` | — |
| Livre ouvert | `handleJournalOpen` | — | — | `bookIntroDialogue` |
| onDone intro livre | — | — | `journalPuzzleEnabled=true` | — |
| Pièce 1 placée | `handleJournalPiecePlaced` | count=0 | count=1 | `bookImg1Dialogue` |
| Pièce 2 placée | `handleJournalPiecePlaced` | count=1 | count=2 | `bookImg2Dialogue` |
| Pièce 3 placée | `handleJournalPiecePlaced` | count=2 | count=3 | `bookImg3Dialogue` |
| Pièce 4 placée | `handleJournalPiecePlaced` | count=3 | count=4, `journalCompletedRef=true` | `bookImg4Dialogue`, fermeture livre |
| Livre fermé | `handleJournalEnd` | — | transition POV arbre | — |
| Transition arbre | `handleStoryCameraTransitionComplete` | `isPostBookTransitionRef=true` | `treePhaseActive=true` | — |
| Clic arbre | `handleTreeInteract` | `treePhaseActive=true` | `treePhaseActive=false` | séquence 4 dialogues arbre |
| onComplete séquence arbre | — | — | `workbenchPhaseActive=true` | — |
| Clic établi | `handleWorkbenchInteract` | — | transition POV établi | — |
| Transition établi | `handleStoryCameraTransitionComplete` | `isEtabliTransitionRef=true` | — | `etabliDialogue` |
| onDone établi | — | — | `thomasEtabliPhaseActive=true` | — |
| Clic Thomas | `handleThomasEtabliInteract` | — | transition POV Thomas | — |
| Transition Thomas | `handleStoryCameraTransitionComplete` | `isThomasTransitionRef=true` | `thomasAnimPhase='talking'` | `thomasEtabliDialogue` |
| onDone Thomas | — | — | `greenhousePhaseActive=true` | — |
| Clic porte serre | `handleGreenhouseDoorClick` | — | transition multi-étapes | — |

---

## Séquence arbre (`handleTreeInteract`)

La séquence est chaînée avec des callbacks imbriqués (pas `playSequence`) :

```js
playDialogue('treeRacinesDialogue', {
  onDone: () => playDialogue('treeBorneDialogue', {
    onDone: () => playDialogue('treeArbreDialogue', {
      onDone: () => playDialogue('treeOutroDialogue', {
        onDone: unlockWorkbenchPhase,
      }),
    }),
  }),
})
```

`unlockWorkbenchPhase()` fait :
```js
setEtabliPhaseActive(true)   // internal only
setWorkbenchPhaseActive(true) // exposed
```

**Important** : `treePiedDialogue` n'est PAS joué ici — c'est une numérotation audio (track 11) qui n'est pas utilisée dans ce flux.

---

## Gestion des timeouts

Tous les `setTimeout` sont stockés dans `scheduledTimeoutsRef` (un `Set`) et nettoyés au unmount du hook via `useEffect` cleanup. Cela évite des callbacks tardifs qui modifieraient l'état après démontage.

```js
function scheduleTimeout(fn, delay) {
  const id = setTimeout(() => {
    scheduledTimeoutsRef.current.delete(id)
    fn()
  }, delay)
  scheduledTimeoutsRef.current.add(id)
  return id
}
```

---

## `handleStoryCameraTransitionComplete`

C'est le callback appelé après **toute** transition de caméra. Il décide quelle phase démarrer en lisant les refs actives. Il commence par `setIntroSpawn(storyCameraTransition)` (persist la pose caméra comme spawn).

```
handleStoryCameraTransitionComplete()
  ├─ isPostBookTransitionRef.current  → treePhaseActive = true
  ├─ isEtabliTransitionRef.current    → playDialogue('etabliDialogue')
  │                                      onDone → setThomasEtabliPhaseActive(true)
  ├─ isThomasTransitionRef.current    → playDialogue('thomasEtabliDialogue')
  │                                      onDone → setThomasAnimationPhase('returning')
  │                                             + scheduleFlowTimeout(fade('ambianceWorkbench', 0.7), 2000)
  │                                             + setGreenhousePhaseActive(true)
  ├─ greenhouseTransitionStageRef === 'front'
  │   → stage = 'corridor'
  │   → scheduleFlowTimeout(transition POV greenhouseCorridor, 1000ms)
  ├─ greenhouseTransitionStageRef === 'corridor'
  │   → stage = 'inside'
  │   → fade('ambianceGreenhouse', 0.7, 2000)
  │   → scheduleFlowTimeout(transition POV greenhouseInside, 1000ms)
  ├─ greenhouseTransitionStageRef === 'inside'
  │   → stage = null (fin de la séquence serre)
  └─ (aucun flag)
      → completeStep('intro.goToReception')
      → playDialogue('receptionDialogue')
      → onDone → setReceptionChoiceVisible(true)
```

Cette architecture permet d'enchaîner plusieurs transitions caméra avec un seul callback.

## Fonctions debug

Ces fonctions existent pour sauter à n'importe quelle phase sans jouer toute la séquence :

| Fonction | Saute à |
|----------|---------|
| `handleDebugGoToIntroStart` | Début de l'intro cinématique |
| `handleDebugGoToDoorPassage` | Dialogue 01-voice-tree (après porte) |
| `handleDebugGoToReception` | Phase réception |
| `handleDebugGoToTree` | Séquence arbre |
| `handleDebugGoToEtabli` | Phase établi |
| `handleDebugGoToSerre` | Phase serre |

Accessibles via `ViewerControls.jsx` / `StoryDebugPanel.jsx`.
