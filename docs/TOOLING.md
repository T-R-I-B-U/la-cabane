# Tooling — Build, lint, format

## Workflow développeur

```bash
# Développement
npm run dev

# Avant tout commit/push
make check         # = eslint + prettier check

# Corriger le format
make prettier

# Voir les erreurs lint
make eslint
```

---

## `Makefile`

```makefile
prettier:
	npx prettier --write src/

eslint:
	npx eslint .

check:
	npx eslint . && npx prettier --check src/

setup:
	git config core.hooksPath .githooks
```

**Règle** : `make eslint && make prettier` avant tout push. Aucun lint error ni prettier warning ne doit atterrir dans un PR.

---

## `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
// hdriOptionsPlugin est défini directement dans ce fichier (pas importé)

export default defineConfig({
  plugins: [
    react(),
    glsl(),
    hdriOptionsPlugin(),   // plugin local, défini dans vite.config.js
  ],
  assetsInclude: ['**/*.glb', '**/*.gltf'],
})
```

### `vite-plugin-glsl`

Permet d'importer des fichiers `.glsl` directement dans les modules JS :

```js
import fragmentShader from './kuwahara.glsl'
```

### `hdriOptionsPlugin` (plugin custom)

Défini directement dans `vite.config.js`. Crée un module virtuel `virtual:hdri-options` qui expose la liste des chemins HDRI disponibles dans `public/hdri/`.

```js
// vite.config.js
function hdriOptionsPlugin() {
  return {
    name: 'hdri-options',
    resolveId(id) {
      if (id === 'virtual:hdri-options') return '\0virtual:hdri-options'
    },
    load(id) {
      if (id !== '\0virtual:hdri-options') return null

      // Scanne public/hdri/ pour les fichiers .hdr et .exr, triés alphabétiquement
      const files = readdirSync(hdriDir)
        .filter(f => /\.(hdr|exr)$/i.test(f))
        .sort((a, b) => a.localeCompare(b))
        .map(f => `/hdri/${encodeURIComponent(f)}`)

      return `export const hdriFiles = ${JSON.stringify(files)}`
    },
    configureServer(server) {
      // Surveille public/hdri/ — invalide et recharge si des fichiers changent
      server.watcher.add(hdriDir)
      server.watcher.on('all', (_event, filePath) => {
        if (!filePath.startsWith(hdriDir)) return
        // invalide le module virtuel + full-reload
      })
    }
  }
}
```

**Usage dans le code** (`src/core/scene/hdriOptions.js`) :

```js
import { hdriFiles } from 'virtual:hdri-options'
// → ['/hdri/some.hdr', '/hdri/other.hdr', ...]

// hdriOptions.js convertit en objets { id, label, file, intensity }
export const HDRI_OPTIONS = hdriFiles.map(path => ({
  id: filename.toLowerCase(),    // 'my-hdri'
  label: labelFromFilename(...), // 'My Hdri' (title case)
  file: path,
  intensity: 0.8,
}))

export const NO_HDRI_ID = 'original-lighting'   // option par défaut
export const DEFAULT_HDRI_ID = NO_HDRI_ID
// L'option 'original-lighting' utilise preset: 'apartment' (pas de fichier HDRI)
```

### `publicAssetManifestPlugin` (plugin custom)

Défini lui aussi dans `vite.config.js`. Il scanne `public/textures/` et `public/models/compressed/`, puis expose un module virtuel `virtual:public-asset-manifest` contenant uniquement des listes d'URLs publiques.

Objectif : éviter `import.meta.glob('/public/...')`, qui faisait générer un très grand nombre de modules d'assets dans le build client.

Usage actuel :
- `src/world/cabane/textureResolver.js` lit `publicAssetManifest.textureFiles`
- `src/core/scene/SceneCharacters.jsx` lit `publicAssetManifest.compressedModelFiles`

---

## ESLint (`eslint.config.js`)

Configuration flat (ESLint 9+) :

```js
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  js.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    }
  }
]
```

Points notables :
- `react-hooks` : vérifie les règles de hooks (deps arrays, ordre)
- `no-unused-vars` : strict, sauf les paramètres préfixés `_`

---

## Prettier (`.prettierrc`)

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "es5"
}
```

- Pas de point-virgule
- Guillemets simples
- Largeur 100 caractères
- Virgule trailing ES5 (tableaux, objets — pas les paramètres de fonction)

---

## Scripts npm

```json
{
  "scripts": {
    "dev":            "vite",
    "build":          "vite build",
    "preview":        "vite preview",
    "lint":           "eslint .",
    "format":         "prettier --write src/**/*.{js,jsx,css,json}",
    "format:check":   "prettier --check src/**/*.{js,jsx,css,json}"
  }
}
```

---

## Branches Git

Convention de nommage :
- `feat/xxx` : nouvelle fonctionnalité narrative ou technique
- `fix/xxx` : correction de bug
- `refactor/xxx` : refactorisation sans changement fonctionnel
- `chore/xxx` : tâches de maintenance (dépendances, config)

Messages de commits : **Conventional Commits** en anglais :
```
feat(audio): add arbre dialogue tracks
fix(player): prevent double pointer lock on spawn
refactor(scene): extract SceneCharacters from CabaneScene
chore(review): remove stale assets
```

Branche principale : `main`. Branche de développement : `develop`. Features depuis `develop`.
