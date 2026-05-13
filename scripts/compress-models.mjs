import { execSync } from 'node:child_process'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, basename, extname } from 'node:path'

const MODELS_DIR = 'public/models'
const OUT_DIR = 'public/models/compressed'
const FORCE = process.argv.includes('--force')

// Animated GLBs use skinned meshes — Draco only compresses static triangle geometry
// and strips attributes needed for skinning. Exclude them from Draco compression.
const ANIMATED_PATTERN = /-animated\.glb$/i

const files = readdirSync(MODELS_DIR).filter(
  (f) => ['.gltf', '.glb'].includes(extname(f)) && !ANIMATED_PATTERN.test(f)
)

if (files.length === 0) {
  console.log('No .gltf/.glb files found in', MODELS_DIR)
  process.exit(0)
}

let skipped = 0

for (const file of files) {
  const input = join(MODELS_DIR, file)
  const stem = basename(file, extname(file))
  const output = join(OUT_DIR, stem + '.glb')

  if (!FORCE && existsSync(output)) {
    skipped++
    continue
  }

  const before = statSync(input).size
  execSync(`gltf-transform draco "${input}" "${output}"`, { stdio: 'inherit' })
  const after = statSync(output).size
  const ratio = ((1 - after / before) * 100).toFixed(1)
  console.log(`✓ ${file} → ${stem}.glb  (${fmt(before)} → ${fmt(after)}, -${ratio}%)`)
}

if (skipped > 0) {
  console.log(`\n${skipped} file(s) skipped (already compressed). Run with --force to recompress.`)
}

function fmt(bytes) {
  return bytes > 1e6
    ? (bytes / 1e6).toFixed(1) + ' MB'
    : (bytes / 1e3).toFixed(0) + ' KB'
}
