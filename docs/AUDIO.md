# Système Audio

## Vue d'ensemble

Le système audio est entièrement géré par **`audioStore.js`** (`src/utils/audioStore.js`, ~467 lignes). C'est un **singleton non-React** — il ne dépend d'aucun contexte React et peut être appelé de n'importe où.

L'intégration React se fait via :
- **`AudioManager.jsx`** : monte l'AudioListener sur la caméra Three.js
- **`useNpcDialogue.js`** : wrapper React léger pour `playDialogue`
- **`Subtitles.jsx`** : s'abonne aux sous-titres via `subscribeSubtitles`

---

## Architecture du store

```js
// État interne (singleton)
const store = {
  camera: null,          // Caméra Three.js active
  listener: null,        // THREE.AudioListener unique
  tracks: {},            // Map<id, { audio: THREE.Audio, cfg: TrackConfig }>
  globalVolume: 1,       // Multiplicateur global [0–1]
  unlocked: false,       // AudioContext déverrouillé par user gesture
  pending: {},           // Map<id, callback[]> : en attente de chargement
}

const subtitleState = {
  activeId: null,        // Track en cours
  startedAt: null,       // performance.now() au démarrage
  current: '',           // Texte de sous-titre courant
  listeners: new Set(),  // Abonnés (Subtitles.jsx)
  rafId: null,           // requestAnimationFrame id
  hideTimeoutId: null,   // setTimeout pour masquer le texte
  textTimers: [],        // Timers pour dialogues text-only
}
```

---

## Cycle de vie

### 1. Initialisation

Appelée par `AudioManager.jsx` au premier render du Canvas :

```js
initAudio(camera)
  └─ new THREE.AudioListener()
  └─ camera.add(listener)       // Positionne le listener dans la scène 3D
  └─ _loadTracks()
      └─ Pour chaque track dans audioConfig.json :
          ├─ Si track.src existe :
          │   new THREE.Audio(listener)
          │   loader.load('/audio/' + src, buffer => audio.setBuffer(buffer))
          │   _loadSubtitles(cfg)  → fetch('/subtitles/' + cfg.subtitles)
          │   Si autoplay : audio.play() dès que déverrouillé
          └─ Sinon (text-only) :
              Register track sans audio
```

### 2. Déverrouillage AudioContext

Les navigateurs bloquent l'audio sans interaction utilisateur. `unlockAndPlay()` est appelé par `App.jsx` au premier clic sur `IntroLoader` :

```js
unlockAndPlay()
  ├─ store.unlocked = true
  ├─ AudioContext.resume() si suspended
  └─ play() tous les tracks autoplay
```

### 3. Lecture

```js
play(id)           // Lance la piste, attend si pas encore chargée
playOnce(id)       // Stop puis play (évite chevauchement)
stop(id)           // Stop et reset position
stopAll()          // Stop toutes les pistes
```

### 4. Dialogues (avec sous-titres)

```js
playDialogue(id, { onDone })
  ├─ Si track.src : play audio + _startSubtitles(id)
  │   audio.onEnded = () => { stopSubtitles(); onDone?.() }
  └─ Si text-only : _startTextSubtitles(id, onDone)
      └─ setTimeout sur chaque cue SRT
```

### 5. Séquences

```js
playSequence(ids, { gap = 0, stopOthers = false, onComplete })
  // Joue chaque id dans l'ordre, gap ms entre chaque
  // Rappelle onComplete après le dernier
```

---

## API publique complète

| Méthode | Paramètres | Description |
|---------|-----------|-------------|
| `initAudio(camera)` | `THREE.Camera` | Initialise le listener et charge toutes les pistes |
| `detachAudio(camera)` | `THREE.Camera` | Détache le listener (appelé au unmount de AudioManager) |
| `unlockAndPlay()` | — | Déverrouille AudioContext après user gesture |
| `play(id)` | `string` | Lance une piste (attend si pas chargée) |
| `playOnce(id)` | `string` | Stop + play (pas de chevauchement) |
| `stop(id)` | `string` | Arrête et reset |
| `stopAll()` | — | Arrête tout |
| `fade(id, to, duration?)` | `string, number, number` | Fade Web Audio API (défaut 500ms) |
| `playDialogue(id, opts?)` | `string, { onDone }` | Dialogue avec sous-titres |
| `stopDialogue()` | — | Arrête le dialogue en cours |
| `playSequence(ids, opts?)` | `string[], { gap, stopOthers }` | Séquence ordonnée (async/await) |
| `showDialog(text, duration?)` | `string, number` | Affiche du texte direct (sans audio). `duration=0` = persistent |
| `hideDialog()` | — | Masque le texte courant |
| `setTrackVolume(id, vol)` | `string, number` | Volume normalisé [0–1] |
| `setGlobalVolume(vol)` | `number` | Multiplicateur global |
| `subscribeSubtitles(fn)` | `(text: string) => void` | Abonnement aux sous-titres, retourne unsubscribe fn |
| `getConfig()` | — | Retourne l'objet audioConfig.json |
| `getTracks()` | — | Retourne le Map des tracks chargées |
| `getGlobalVolume()` | — | Retourne le volume global |

---

## `fade()` — Détail d'implémentation

`fade()` utilise l'**API Web Audio** directement (pas Three.js `setVolume`) pour un fade fluide sans saut :

```js
const gain = audio.gain.gain          // AudioParam Web Audio
const now = ctx.currentTime
const end = now + duration / 1000

gain.cancelScheduledValues(now)
gain.setValueAtTime(gain.value, now)   // fixe la valeur courante
gain.linearRampToValueAtTime(target, end)  // rampe linéaire

// Si fade vers 0 : stoppe l'audio après la durée
if (to === 0) setTimeout(() => audio.stop(), duration)
```

Les fades actifs sont stockés dans `store.fadeTimeouts` (Map) pour annulation si nécessaire.

## `playSequence()` — Implémentation

```js
export async function playSequence(ids, { gap = 0, stopOthers = false } = {}) {
  for (const id of ids) {
    await new Promise((resolve) => {
      _whenReady(id, async () => {
        // Si loop : joue et résout immédiatement
        if (cfg.loop) { audio.play(); resolve(); return }
        if (stopOthers) stopAll()
        await _playAndWait(audio, id)  // attend onEnded
        resolve()
      })
    })
    if (gap > 0) await new Promise(r => setTimeout(r, gap))
  }
}
```

## Système de sous-titres

### Format SRT

```
1
00:00:00,000 --> 00:00:03,500
Texte de la première ligne.

2
00:00:04,000 --> 00:00:07,200
Deuxième phrase.
```

### Parsing

```js
_parseSRT(text)
  // Split sur \n\n
  // Extrait timestamp : /(\d+:\d+:\d+,\d+) --> (\d+:\d+:\d+,\d+)/
  // Convert via _srtTimeToSec("00:00:03,500") → 3.5
  // Retourne Array<{ from: number, to: number, text: string }>
```

### Affichage temps-réel (avec audio)

Un `requestAnimationFrame` loop tourne pendant la lecture :

```js
_tickSubtitles()
  ├─ elapsed = (performance.now() - startedAt) / 1000
  ├─ Trouve cue où from <= elapsed < to
  ├─ _emitSubtitle(cue.text) → notifie tous les listeners
  └─ requestAnimationFrame(_tickSubtitles)  ← se reschedule
```

`Subtitles.jsx` appelle `subscribeSubtitles(setText)` — chaque émission déclenche un re-render React.

### Dialogues text-only (sans fichier audio)

Quand une track n'a pas de `src` (ex: `marieDialogue`, `thomasDialogue`), les sous-titres sont affichés via des `setTimeout` :

```js
cues.forEach(cue => {
  textTimers.push(setTimeout(() => _emitSubtitle(cue.text), cue.from * 1000))
  textTimers.push(setTimeout(() => _emitSubtitle(''), cue.to * 1000))
})
```

---

## `audioConfig.json` — Toutes les pistes

Fichier source : `src/core/audio/audioConfig.json`

### SFX (ambiance)

| id | src | loop | volume | usage |
|----|-----|------|--------|-------|
| `ambianceWorkbench` | `Ambiance-Workbench.mp3` | oui | 0.7 | Ambiance atelier, lancé pendant phase établi |
| `ambianceGreenhouse` | `Ambiance-Greenhouse-ZoeNotTalking.mp3` | oui | 0.7 | Ambiance serre |
| `slidingDoor` | `Sliding-Door.mp3` | non | 0.9 | Son porte coulissante |
| `book` | `Book.mp3` | non | 0.9 | Son ouverture journal |

### Dialogues voix-off (tree/)

| id | src | subtitles | usage dans la story |
|----|-----|-----------|---------------------|
| `01-voice-tree` | `tree/01-voice-tree.mp3` | `tree/01-voice-tree.srt` | Accueil Tree (avant input nom) |
| `02-voice-tree` | `tree/02-voice-tree.mp3` | `tree/02-voice-tree.srt` | Suite après input nom |
| `receptionDialogue` | `tree/03-voice-tree.mp3` | `tree/03-voice-tree.srt` | Intro réception |
| `receptionYesDialogue` | `tree/04-voice-tree.mp3` | `tree/04-voice-tree.srt` | Réponse oui réception |
| `receptionNoDialogue` | `tree/05-voice-tree.mp3` | `tree/05-voice-tree.srt` | Réponse non réception |
| `bookIntroDialogue` | `tree/06-voice-tree.mp3` | `tree/06-voice-tree.srt` | Intro avant puzzle |
| `bookImg1Dialogue` | `tree/07-voice-tree.mp3` | `tree/07-voice-tree.srt` | Pièce puzzle 1 |
| `bookImg2Dialogue` | `tree/08-voice-tree.mp3` | `tree/08-voice-tree.srt` | Pièce puzzle 2 |
| `bookImg3Dialogue` | `tree/09-voice-tree.mp3` | `tree/09-voice-tree.srt` | Pièce puzzle 3 |
| `bookImg4Dialogue` | `tree/10-voice-tree.mp3` | `tree/10-voice-tree.srt` | Pièce puzzle 4 |
| `treePiedDialogue` | `tree/11-voice-tree.mp3` | `tree/11-voice-tree.srt` | Séquence arbre 1 |
| `treeRacinesDialogue` | `tree/12-voice-tree.mp3` | `tree/12-voice-tree.srt` | Séquence arbre 2 |
| `treeBorneDialogue` | `tree/13-voice-tree.mp3` | `tree/13-voice-tree.srt` | Séquence arbre 3 |
| `treeArbreDialogue` | `tree/14-voice-tree.mp3` | `tree/14-voice-tree.srt` | Séquence arbre 4 |
| `treeOutroDialogue` | `tree/15-voice-tree.mp3` | `tree/15-voice-tree.srt` | Outro arbre |
| `etabliDialogue` | `tree/16-voice-tree.mp3` | `tree/16-voice-tree.srt` | POV établi |

### Dialogues text-only (pas de src)

| id | subtitles | usage |
|----|-----------|-------|
| `marieDialogue` | `marie-dialogue.srt` | Dialogue personnage Marie |
| `thomasDialogue` | `thomas-dialogue.srt` | Dialogue personnage Thomas |
| `thomasEtabliDialogue` | `thomas-etabli-dialogue.srt` | Thomas à l'établi |

### Dialogues arbre (feat/tree-script)

| id | subtitles | usage |
|----|-----------|-------|
| `arbrePlateforme` | `arbre-plateforme.srt` | Description plateforme |
| `arbreFeuilles` | `arbre-feuilles.srt` | Description feuilles |
| `arbreFinal` | `arbre-final.srt` | Conclusion arbre |

---

## `useNpcDialogue.js`

Wrapper React minimal qui expose `playDialogue` avec gestion du token pour éviter les callbacks périmés :

```js
const { dialogueActive, playDialogue, stopDialogue } = useNpcDialogue()

playDialogue('01-voice-tree', {
  onDone: () => setShowNameInput(true)
})
```

Le **token de lecture** garantit qu'un `onDone` d'une lecture annulée ne s'exécute pas :

```js
const token = ++playbackTokenRef.current
playStoreDialogue(id, {
  onDone: () => {
    if (playbackTokenRef.current !== token) return  // Lecture annulée
    onDone?.()
  }
})
```

---

## `AudioManager.jsx`

Composant R3F minimal qui appelle `initAudio(camera)` au mount :

```jsx
export default function AudioManager() {
  const camera = useThree(state => state.camera)
  useEffect(() => { initAudio(camera) }, [camera])
  return null
}
```

Il est rendu à l'intérieur du `<Canvas>` pour avoir accès à la caméra Three.js, mais n'affiche rien.

---

## `Subtitles.jsx`

Overlay UI fixé en bas de l'écran, en dehors du Canvas :

```jsx
export default function Subtitles() {
  const [text, setText] = useState('')
  useEffect(() => subscribeSubtitles(setText), [])

  return (
    <div style={{ position: 'fixed', bottom: 48, … }}>
      <div style={BOX_STYLE(Boolean(text))}>{text || ' '}</div>
    </div>
  )
}
```

Le `' '` (espace insécable) quand il n'y a pas de texte maintient la hauteur du conteneur pour éviter un saut de layout.
