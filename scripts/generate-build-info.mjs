// Génère src/build-info.json au moment du build.
// Les commits sont lus depuis `develop` (fallback origin/develop → HEAD) pour
// que la landing page affiche l'activité de dev même quand on build sur `main`.
import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const JURY_DATE = '2026-06-03'
const COMMIT_COUNT = 8
const OUTPUT = 'src/build-info.json'

function pickRef() {
  // Cherche develop local, puis remote, puis HEAD courant.
  for (const ref of ['develop', 'origin/develop', 'HEAD']) {
    try {
      execSync(`git rev-parse --verify ${ref}`, { stdio: 'ignore' })
      return ref
    } catch {
      // try next
    }
  }
  return null
}

function getCommits(ref) {
  if (!ref) return []
  // \x1f = séparateur unit pour éviter toute collision avec le message.
  const fmt = '%h%x1f%s%x1f%ct'
  const out = execSync(`git log ${ref} -n ${COMMIT_COUNT} --pretty=format:${fmt}`, {
    encoding: 'utf8',
  })
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, subject, ts] = line.split('\x1f')
      return { hash, subject, ts: Number(ts) * 1000 }
    })
}

function daysUntil(iso) {
  const ms = new Date(iso + 'T00:00:00Z').getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86400000))
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const ref = pickRef()
const info = {
  builtAt: new Date().toISOString(),
  sourceRef: ref ?? 'unknown',
  juryDate: JURY_DATE,
  daysUntilJury: daysUntil(JURY_DATE),
  commits: getCommits(ref),
  versions: {
    three: pkg.dependencies?.three ?? '',
    fiber: pkg.dependencies?.['@react-three/fiber'] ?? '',
    drei: pkg.dependencies?.['@react-three/drei'] ?? '',
    react: pkg.dependencies?.react ?? '',
    vite: pkg.devDependencies?.vite ?? '',
    glsl: pkg.devDependencies?.['vite-plugin-glsl'] ?? '',
  },
}

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, JSON.stringify(info, null, 2) + '\n')
console.log(
  `[build-info] ref=${info.sourceRef} commits=${info.commits.length} daysUntilJury=${info.daysUntilJury}`,
)
