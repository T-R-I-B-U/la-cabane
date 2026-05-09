# Savoirs et Contacts

## Vue d'ensemble

Le projet expose deux types de contenus consultables :
- **Savoirs** : informations associées aux **feuilles** de l'arbre
- **Contacts** : informations associées aux **fruits**

Le mécanisme est identique dans les deux cas : un hook d'assignation round-robin + un panneau modal React.

---

## Savoirs — Feuilles

### `useSavoirAssignment.js`

Fichier : `src/app/useSavoirAssignment.js`

```js
export function useSavoirAssignment() {
  const savoirs = useRef([])            // Items chargés depuis /savoirs.json
  const assignments = useRef(new Map()) // instanceId → index dans savoirs
  const nextIndex = useRef(0)           // Curseur round-robin

  // Charge savoirs.json au mount
  useEffect(() => {
    fetch('/savoirs.json').then(r => r.json()).then(items => {
      savoirs.current = items
    })
  }, [])

  const openSavoirForLeaf = useCallback((instanceId) => {
    if (!savoirs.current.length) return false

    // Assigne un savoir si pas encore assigné
    let idx = assignments.current.get(instanceId)
    if (idx === undefined) {
      idx = nextIndex.current % savoirs.current.length
      nextIndex.current += 1
      assignments.current.set(instanceId, idx)
    }

    // Ouvre le panel
    setSelectedSavoirAssignment({
      instanceId,
      savoir: savoirs.current[idx]
    })
    return true
  }, [])

  return {
    selectedSavoirAssignment,
    openSavoirForLeaf,
    closeSavoir: () => setSelectedSavoirAssignment(null)
  }
}
```

**Round-robin** : chaque nouvelle feuille cliquée reçoit le savoir suivant dans la liste. L'assignation est mémorisée — si le joueur clique deux fois sur la même feuille, il voit toujours le même savoir.

### Format `savoirs.json`

```json
[
  {
    "id": "s01",
    "title": "Titre du savoir",
    "text": "Description longue du concept…",
    "category": "Catégorie (ex: Biodiversité)",
    "contact": "contact@example.fr"
  }
]
```

### `SavoirPanel.jsx`

Modal overlay React, rendu en dehors du Canvas :

```jsx
export function SavoirPanel({ savoir, onClose }) {
  return (
    <div className="savoir-overlay" onClick={onClose}>
      <div className="savoir-card" onClick={e => e.stopPropagation()}>
        <button className="savoir-close" onClick={onClose}>✕</button>
        <p className="savoir-category">{savoir.category}</p>
        <h2 className="savoir-title">{savoir.title}</h2>
        <p className="savoir-text">{savoir.text}</p>
        {savoir.contact && <p className="savoir-contact">{savoir.contact}</p>}
      </div>
    </div>
  )
}
```

Clic sur l'overlay ferme le panel. Clic sur la card ne propage pas (stopPropagation).

---

## Contacts — Fruits

### `useContactAssignment.js`

Fichier : `src/app/useContactAssignment.js`

Contrairement à `useSavoirAssignment` (round-robin), `useContactAssignment` utilise une **correspondance directe par `fruitId`** :

```js
export function useContactAssignment() {
  const openContactForFruit = useCallback((fruitId) => {
    if (!contacts.current.length) return false

    // Cherche directement le contact associé à ce fruitId
    const contact = contacts.current.find(c => c.fruitId === fruitId)
    if (!contact) return false    // Pas de contact pour ce fruit

    setSelectedContactAssignment({ fruitId, contact })
    return true
  }, [])
}
```

Pas de round-robin : chaque fruit est lié à un contact fixe défini dans `contacts.json` via le champ `fruitId`. Si aucun contact ne correspond, la fonction retourne `false` sans rien afficher.

### Format `contacts.json`

```json
[
  {
    "id": "c01",
    "fruitId": "fruit_01",
    "name": "Prénom Nom",
    "role": "Rôle / Métier",
    "email": "email@example.fr",
    "description": "Description courte"
  }
]
```

### `ContactPanel.jsx`

Structure identique à `SavoirPanel` mais avec les champs contact (nom, rôle, email).

---

## Flow complet (feuille → savoir)

```
1. Joueur en first-person vise une feuille
      ↓
2. TreeLeaves.jsx : raycasting → instanceId détecté
      ↓
3. onLeafClick(instanceId) → App.jsx
      ↓
4. openSavoirFromLeaf(instanceId)
   ├─ suspendPointerUnlockExit()   ← évite exit pointer lock involontaire
   ├─ document.exitPointerLock()   ← relâche le curseur
   └─ openSavoirForLeaf(instanceId) → setSelectedSavoirAssignment(...)
      ↓
5. App.jsx rend <SavoirPanel savoir={selectedSavoirAssignment.savoir} />
      ↓
6. Joueur clique ✕ ou overlay
      ↓
7. closeSavoir() → selectedSavoirAssignment = null
   canvas.requestPointerLock()     ← reprend le contrôle
```

### `suspendPointerUnlockExit`

Quand un panel s'ouvre, le pointer lock est relâché. `App.jsx` écoute `pointerlockchange` pour réagir à la perte de lock (ex: mettre le jeu en pause). `suspendPointerUnlockExit` pose un flag qui ignore cet événement spécifique — l'ouverture d'un panel ne doit pas être traitée comme une sortie volontaire.

---

## Ajouter un nouveau savoir ou contact

1. Éditer `public/savoirs.json` (ou `contacts.json`) en ajoutant un objet
2. Le contenu est chargé dynamiquement — pas besoin de toucher au code
3. Si un fruit spécifique doit toujours ouvrir un contact précis, utiliser le champ `fruitId` dans `contacts.json`
