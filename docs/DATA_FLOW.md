# Flux de données

## Vue d'ensemble

Ce document trace le chemin de chaque donnée importante depuis sa source jusqu'à son consommateur final.

---

## Props App.jsx → Scene.jsx

`App.jsx` passe ses props à `<Scene>` groupées en objets thématiques :

```jsx
<Scene
  performanceMode={performanceMode}
  activeHdriId={activeHdriId}
  leafMaterialMode={leafMaterialMode}
  interactionsEnabled={areInteractionsEnabled}
  shaderEnabled={shaderEnabled}
  shaderRadius={shaderRadius}
  pointerControlsRef={pointerControlsRef}
  journalAutoOpenToken={journalAutoOpenToken}
  journalCloseToken={journalCloseToken}
  journalPuzzleEnabled={journalPuzzleEnabled}

  sceneState={{
    onStats: handleSceneStats,
    onReady: handleSceneReady,
    onError: handleSceneError,
  }}

  player={{
    mode: isPlayerModeActive,
    flyMode: isFlyModeActive,
    spawn: playerSpawn,
    spawnKey: playerSpawnKey,
    movementLocked: isMovementLocked,
  }}

  debug={{
    doors: debugDoors,
    collisions: debugCollisions,
  }}

  intro={{
    active: introActive,
    doorOpen: introDoorOpen,
    waitingAtDoor: introWaitingAtDoor,
    shouldAdvance: introShouldAdvance,
    journalUnlocked,
    spawn: introSpawn,
    storyCameraTransition,
    postIntro,
    postIntroLocked,
    receptionActive,
    treePhaseActive,
    workbenchPhaseActive,
    greenhousePhaseActive,
    thomasEtabliPhaseActive,
    thomasAnimPhase,
    interactionLocked,
    onEvent: onIntroEvent,
    onReceptionInteract,
    onTreeInteract,
    onWorkbenchInteract,
    onGreenhouseDoorClick,
    onThomasEtabliInteract,
    onStoryCameraTransitionComplete,
  }}

  interactions={{
    onLeafClick,
    onLeafHover,
    onFruitClick,
    onFruitHover,
    onJournalStart,
    onJournalEnd,
    onJournalOpenComplete,
    onJournalCancel,
    onJournalPiecePlaced,
  }}
/>
```

---

## Exemple : `treePhaseActive` de bout en bout

```
useIntroFlow.js
  setTeePhaseActive(true)     ← appelé par handleJournalEnd() post-transition
       │
       ▼
App.jsx
  const { treePhaseActive } = useIntroFlow(...)
       │
       ▼ props: intro={{ treePhaseActive, onTreeInteract: handleTreeInteract }}
Scene.jsx
  const { treePhaseActive, onTreeInteract } = intro
       │
       ▼ props
CabaneScene.jsx
  reçoit: treePhaseActive, onTreeInteract
       │
       ▼ props
SceneInteractions.jsx
  reçoit: treePhaseActive, onTreeInteract
       │
       ▼ props
ClickableTree.jsx
  useCenterScreenMeshInteraction({
    isInteractable: treePhaseActive,
    onInteract: onTreeInteract,
    findMeshes: (group) => findTrunkMeshes(group),
  })
       │
       │ [joueur vise le tronc]
       ▼
  useFrame : raycasting CENTER_NDC → hover = true → emissive change
       │
       │ [joueur clique]
       ▼
  document pointerdown → onInteractRef.current()
       │
       ▼
  handleTreeInteract() dans App.jsx
  → treePhaseActive = false
  → playTreeDialogueSequence()
```

---

## Flux du système de zones

```
TriggerZone (dans CabaneScene)
  onEnter={() => setZone('arbre')}       ← utils/gameManagerStore.js
       │
       │ notifie subscribers
       ▼
  useActiveZone() dans Scene.jsx
  → re-render conditionnel :
    {zone === 'arbre' && <ArbreScene />}
       │
  useActiveZone() dans CabaneScene.jsx
  → useEffect([zone]) → applyVisibilityZone(cabaneGroup, [zone])
    → traverse le group, ajuste .visible selon zoneMap.json
```

---

## Flux audio

```
useIntroFlow.js
  playDialogue('01-voice-tree', { onDone })
  └─ via useNpcDialogue → playStoreDialogue(id, opts)
       │
       ▼
  audioStore.js
  playDialogue(id, { onDone })
  ├─ Si track.src : audio.play() + _startSubtitles(id)
  │   audio.onEnded → _stopSubtitles() + onDone()
  └─ Si text-only : _startTextSubtitles(id, onDone)
       │
       ▼
  subscribeSubtitles callbacks notifiés à chaque cue
       │
       ▼
  Subtitles.jsx
  → setText(cue.text) → re-render → texte affiché
```

---

## Flux journal → narration

```
JournalBook.jsx
  onPiecePlaced('img04')          ← 4ème pièce déposée
       │
       ▼
interactions.onJournalPiecePlaced('img04')  dans App.jsx
       │
       ▼
handleJournalPiecePlaced('img04')  dans useIntroFlow.js
  journalPlacedCountRef.current = 4
  journalCompletedRef.current = true
  playDialogue('bookImg4Dialogue', {
    onDone: () => {
      setJournalCloseToken(t => t + 1)   ← ferme le livre
    }
  })
       │
       ▼
JournalBook.jsx
  useEffect([closeToken]) → bookState = CLOSING → animation fermeture
  onInteractionEnd()
       │
       ▼
handleJournalEnd()  dans useIntroFlow.js
  isPostBookTransitionRef.current = true
  setStoryCameraTransition({ pov: 'arbre' })
       │
       ▼
StoryCameraTransition.jsx
  [interpolation terminée]
  onComplete() → handleStoryCameraTransitionComplete()
       │
       ▼
handleStoryCameraTransitionComplete()
  isPostBookTransitionRef.current → true
  setTreePhaseActive(true)
```

---

## Flux savoir (feuille)

```
TreeLeaves.jsx
  onLeafClick(instanceId)         ← raycasting → hit détecté + clic
       │
       ▼
onLeafClick dans App.jsx
  openSavoirFromLeaf(instanceId)
  ├─ suspendPointerUnlockExit()
  ├─ document.exitPointerLock()
  └─ openSavoirForLeaf(instanceId)
       │
       ▼
useSavoirAssignment.js
  // Round-robin : chaque nouvelle feuille reçoit le savoir suivant
  assignment = map.get(instanceId) ?? roundRobin(nextIndex++)
  setSelectedSavoirAssignment({ instanceId, savoir: savoirs[assignment] })
       │
       ▼
App.jsx
  {selectedSavoirAssignment && (
    <SavoirPanel
      savoir={selectedSavoirAssignment.savoir}
      onClose={closeSavoir}
    />
  )}
```

---

## Flux contact (fruit)

```
Fruit.jsx
  onFruitClick(fruitId)           ← fruitId fixe du composant (ex: 'fruit_01')
       │
       ▼
onFruitClick dans App.jsx
  openContactFromFruit(fruitId)
  ├─ suspendPointerUnlockExit()
  ├─ document.exitPointerLock()
  └─ openContactForFruit(fruitId)
       │
       ▼
useContactAssignment.js
  // Lookup DIRECT (pas round-robin) :
  const contact = contacts.find(c => c.fruitId === fruitId)
  if (!contact) return false      ← rien n'est affiché
  setSelectedContactAssignment({ fruitId, contact })
       │
       ▼
App.jsx
  {selectedContactAssignment && (
    <ContactPanel
      contact={selectedContactAssignment.contact}
      onClose={closeContact}
    />
  )}
```

---

## Stores externes — qui écrit / qui lit

### `gameManagerStore.js`

| Action | Qui | Quand |
|--------|-----|-------|
| `setZone('arbre')` | `TriggerZone` dans `CabaneScene` | Joueur entre dans la sphère plateforme |
| `setZone('cabane')` | `TriggerZone` dans `ArbreScene` | Joueur sort de la sphère plateforme |
| `useActiveZone()` | `Scene.jsx` | Chaque render — conditional rendering |
| `useActiveZone()` | `CabaneScene.jsx` | useEffect sur zone — visibility |

### `audioStore.js`

| Action | Qui | Quand |
|--------|-----|-------|
| `initAudio(camera)` | `AudioManager.jsx` | Mount du Canvas |
| `unlockAndPlay()` | `App.jsx` | Premier clic IntroLoader |
| `playDialogue(id)` | `useIntroFlow.js` | Chaque transition narrative |
| `play('ambianceWorkbench')` | `useIntroFlow.js` | Phase établi active |
| `playOnce('book')` | `JournalBook.jsx` | Ouverture du livre |
| `subscribeSubtitles(fn)` | `Subtitles.jsx` | Mount du composant |
| `stopAll()` | `App.jsx` | (si nécessaire, ex: erreur scène) |

### `visibilityZoneStore.js`

| Action | Qui | Quand |
|--------|-----|-------|
| `applyVisibilityZone(group, [zone])` | `CabaneScene.jsx` | useEffect sur zone + cabaneGroup |
