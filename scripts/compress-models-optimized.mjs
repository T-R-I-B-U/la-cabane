import { execSync } from 'node:child_process'
import { readdirSync, statSync, existsSync, mkdirSync } from 'node:fs'
import { join, basename, extname } from 'node:path'

const MODELS_DIR = 'public/models'
const OUT_DIR = 'public/models/compressed2'
const FORCE = process.argv.includes('--force')

// Simplification presets: ratio = fraction of triangles to keep, error = max deviation tolerance.
// Lower ratio = more aggressive reduction. Higher error = allows more distortion.
const PRESETS = {
  // Dense vegetation repeated many times — aggressive reduction acceptable
  vegetation: { ratio: 0.4, error: 0.001 },
  // General props and architecture — moderate reduction
  default: { ratio: 0.4, error: 0.001 },
  // Simple flat geometry — skip simplify, just Draco
  skip: null,
}

// Per-model overrides. Stems without extension.
// Everything not listed falls back to `default`.
const MODEL_PRESETS = {
  backgroundTree: 'vegetation',
  outsideplant02: 'vegetation',
  outsideplant03: 'vegetation',
  raspberry: 'vegetation',
  pepper: 'vegetation',
  leaf: 'vegetation',
  plant01: 'vegetation',
  'plant01-1': 'vegetation',
  plant02: 'vegetation',
  'plant02-1': 'vegetation',
  plant03: 'vegetation',
  railling: 'vegetation',
  'railling-hut': 'vegetation',
  trunk: 'vegetation',

  // Flat/minimal geometry — simplify would do nothing useful
  eastBackground: 'skip',
  westBackground: 'skip',
  northBackground: 'skip',
  southBackground: 'skip',
  mainground: 'skip',
  'ground-hut': 'skip',
  drawing: 'skip',
  poster: 'skip',
  rug01: 'skip',
  hill: 'skip',
  smallHill: 'skip',
  platform: 'skip',
  timeatm: 'skip',
  bulding: 'skip',
}

mkdirSync(OUT_DIR, { recursive: true })

const files = readdirSync(MODELS_DIR).filter(
  (f) => ['.gltf', '.glb'].includes(extname(f).toLowerCase()) && !f.includes('-animated')
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

  const presetKey = MODEL_PRESETS[stem] ?? 'default'
  const preset = PRESETS[presetKey]
  const before = statSync(input).size

  if (preset === null) {
    // Skip simplify, just Draco
    execSync(`gltf-transform draco "${input}" "${output}"`, { stdio: 'inherit' })
  } else {
    // draco first: quantization welds near-duplicate vertices at UV seams,
    // making the mesh far more amenable to simplification.
    // Then simplify, then re-draco to compress the result.
    const tmp1 = `${output}.tmp1.glb`
    const tmp2 = `${output}.tmp2.glb`
    execSync(`gltf-transform draco "${input}" "${tmp1}"`, { stdio: 'inherit' })
    execSync(
      `gltf-transform simplify "${tmp1}" "${tmp2}" --ratio ${preset.ratio} --error ${preset.error}`,
      { stdio: 'inherit' }
    )
    execSync(`gltf-transform draco "${tmp2}" "${output}"`, { stdio: 'inherit' })
    execSync(`rm "${tmp1}" "${tmp2}"`)
  }

  const after = statSync(output).size
  const ratio = ((1 - after / before) * 100).toFixed(1)
  const tag = preset === null ? '[draco only]' : `[simplify ${presetKey}+draco]`
  console.log(`✓ ${file} ${tag}  (${fmt(before)} → ${fmt(after)}, -${ratio}%)`)
}

if (skipped > 0) {
  console.log(`\n${skipped} file(s) skipped (already exist). Run with --force to reprocess.`)
}

function fmt(bytes) {
  return bytes > 1e6
    ? (bytes / 1e6).toFixed(1) + ' MB'
    : (bytes / 1e3).toFixed(0) + ' KB'
}
