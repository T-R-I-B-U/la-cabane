# AGENTS.md

Repository playbook for human and AI coding agents.
Apply these rules unless an explicit user instruction overrides them.

## 1) Project Context
- Stack: React 19, Vite 8, Three.js, `vite-plugin-glsl`
- Language: JavaScript + JSX (ES modules)
- Linting: ESLint flat config (`eslint.config.js`)
- Build: Vite (`vite.config.js`)
- Tests: currently not configured

## 2) External Rules Audit
Checked for editor/assistant-specific rules:
- `.cursor/rules/`: not found
- `.cursorrules`: not found
- `.github/copilot-instructions.md`: not found

If these files are added later, merge their constraints here immediately.

## 3) Branch and Commit Workflow
Never commit directly to `main`. Use feature branches and PRs.

### Branch naming
Use `<type>/<short-description>`.

Allowed types:
- `feat` new feature
- `fix` bug fix
- `devtools` tooling/config/build changes
- `refactor` internal restructuring without behavior change
- `style` visual/CSS/animation changes
- `docs` documentation-only changes
- `chore` maintenance/cleanup

Examples:
- `feat/tribe-tree-entity`
- `fix/loader-draco-path`
- `docs/readme-architecture`

### Commit format (English only)
```text
<type>(<scope>): <short description>

<body: what changed, why, and how if non-obvious>
```

Rules:
- subject <= 72 characters
- avoid vague messages (`update`, `wip`, `fix stuff`)
- include body for non-trivial changes

## 4) Commands (Build/Lint/Test)
Run from repo root: `/Users/pierrelouisrousseaux/Developer/Gobelins/threejs`.

### Install
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

### Lint all files
```bash
npm run lint
```

### Lint a single file
```bash
npx eslint src/App.jsx
```

### Tests (current status + single-test guidance)
Current state:
- no `npm test` script in `package.json`
- no Vitest/Jest config detected

If tests are introduced, add scripts immediately. Recommended pattern:
```bash
npm run test
npx vitest run
npx vitest run src/path/to/file.test.js
npx vitest run src/path/to/file.test.js -t "specific test name"
```

## 5) Folder Ownership and Architecture
Keep code within existing structure:
- `src/core/`: engine lifecycle (scene, camera, renderer, loop, loader)
- `src/world/entities/`: one module/class per 3D object
- `src/world/materials/`: reusable materials/shaders
- `src/utils/`: shared helpers/utilities
- `public/models`, `public/textures`, `public/audio`, `public/draco`: static assets

Do not create new top-level folders without explicit rationale.

## 6) Code Style Guidelines

### Imports
- use ES modules (`import` / `export`) only
- order imports: external -> internal modules -> styles/assets
- remove unused imports to satisfy ESLint
- keep dependency surface minimal

### Formatting
- follow existing style: single quotes, no semicolons, trailing commas when valid
- prefer small focused functions over long multi-purpose blocks
- prefer early returns for guard clauses
- prefer `const`; use `let` only when reassignment is needed
- keep JSX readable by splitting long props across lines

### Types and Contracts
- repository is JavaScript-first (no TypeScript config)
- use JSDoc for non-obvious shapes and function contracts
- validate external/runtime data at boundaries (loader output, API responses)
- avoid implicit data assumptions in render/animation loops

### Naming
- React components: `PascalCase` (e.g. `SceneOverlay.jsx`)
- functions, variables, helpers: `camelCase`
- constants: `UPPER_SNAKE_CASE` only for real constants
- filenames: descriptive; entity files should map 1:1 to entity names

### Error Handling
- never swallow errors silently
- wrap risky async work in `try/catch`
- include context in error messages (what failed and where)
- fail fast on critical missing assets/config
- degrade gracefully only for explicitly optional behavior

### Comments and Documentation
- comment non-trivial logic and explain why, not only what
- keep comments concise and updated with code
- avoid redundant comments for obvious code

### React / Three.js Separation
- keep engine concerns in `core/`
- keep scene content orchestration in `world/`
- avoid mixing React UI state logic with low-level Three.js lifecycle code
- clean up listeners/resources on teardown

## 7) Pull Request Quality Bar
- keep PRs focused and reviewable
- describe behavior changes and rationale
- include validation steps (`npm run lint`, `npm run build`, manual smoke test)
- include visuals for rendering/UI changes when relevant

## 8) Agent Operating Rules
- prefer targeted diffs over full-file rewrites
- do not revert user changes you did not author
- inspect existing code before proposing architecture changes
- if requirements are ambiguous and impact architecture, present options
- when adding tooling (tests/formatter/types), update this AGENTS.md in same PR
