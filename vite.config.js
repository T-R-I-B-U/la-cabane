import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import { existsSync, readdirSync, mkdirSync, copyFileSync, statSync } from 'node:fs'
import { relative, resolve, sep, basename } from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import process from 'node:process'

const VIRTUAL_HDRI_MODULE_ID = 'virtual:hdri-options'
const RESOLVED_VIRTUAL_HDRI_MODULE_ID = `\0${VIRTUAL_HDRI_MODULE_ID}`
const VIRTUAL_PUBLIC_ASSET_MANIFEST_MODULE_ID = 'virtual:public-asset-manifest'
const RESOLVED_VIRTUAL_PUBLIC_ASSET_MANIFEST_MODULE_ID =
  `\0${VIRTUAL_PUBLIC_ASSET_MANIFEST_MODULE_ID}`

function toPublicUrl(rootDir, filePath) {
  const publicRoot = resolve(rootDir, 'public')
  const relativePath = relative(publicRoot, filePath)
  return `/${relativePath.split(sep).map(encodeURIComponent).join('/')}`
}

function listPublicFiles(directory, matcher) {
  if (!existsSync(directory)) return []

  const files = []

  function visit(currentDirectory) {
    const entries = readdirSync(currentDirectory, { withFileTypes: true })

    entries.forEach((entry) => {
      const entryPath = resolve(currentDirectory, entry.name)
      if (entry.isDirectory()) {
        visit(entryPath)
        return
      }

      if (matcher.test(entry.name)) files.push(entryPath)
    })
  }

  visit(directory)
  return files.sort((a, b) => a.localeCompare(b))
}

function listHdriFiles() {
  const rootDir = process.cwd()
  const hdriDir = resolve(rootDir, 'public/hdri')
  return listPublicFiles(hdriDir, /\.(hdr|exr)$/i).map((filePath) => toPublicUrl(rootDir, filePath))
}

function createPublicAssetManifest() {
  const rootDir = process.cwd()

  return {
    textureFiles: listPublicFiles(resolve(rootDir, 'public/textures'), /\.(png|jpe?g|webp|ktx2)$/i).map(
      (filePath) => toPublicUrl(rootDir, filePath)
    ),
    compressedModelFiles: listPublicFiles(
      resolve(rootDir, 'public/models/compressed'),
      /\.(glb|gltf)$/i
    ).map((filePath) => toPublicUrl(rootDir, filePath)),
  }
}

function hdriOptionsPlugin() {
  return {
    name: 'hdri-options',
    resolveId(id) {
      if (id === VIRTUAL_HDRI_MODULE_ID) return RESOLVED_VIRTUAL_HDRI_MODULE_ID
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_HDRI_MODULE_ID) return null

      return `export const hdriFiles = ${JSON.stringify(listHdriFiles())}`
    },
    configureServer(server) {
      const hdriDir = resolve(process.cwd(), 'public/hdri')
      server.watcher.add(hdriDir)
      server.watcher.on('all', (_event, filePath) => {
        if (!filePath.startsWith(hdriDir)) return

        const hdriModule = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_HDRI_MODULE_ID)
        if (hdriModule) server.moduleGraph.invalidateModule(hdriModule)
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

function publicAssetManifestPlugin() {
  return {
    name: 'public-asset-manifest',
    resolveId(id) {
      if (id === VIRTUAL_PUBLIC_ASSET_MANIFEST_MODULE_ID) {
        return RESOLVED_VIRTUAL_PUBLIC_ASSET_MANIFEST_MODULE_ID
      }
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_PUBLIC_ASSET_MANIFEST_MODULE_ID) return null

      return `export const publicAssetManifest = ${JSON.stringify(createPublicAssetManifest())}`
    },
    configureServer(server) {
      const rootDir = process.cwd()
      const watchedDirectories = [
        resolve(rootDir, 'public/textures'),
        resolve(rootDir, 'public/models/compressed'),
      ]

      server.watcher.add(watchedDirectories)
      server.watcher.on('all', (_event, filePath) => {
        if (!watchedDirectories.some((directory) => filePath.startsWith(directory))) return

        const manifestModule = server.moduleGraph.getModuleById(
          RESOLVED_VIRTUAL_PUBLIC_ASSET_MANIFEST_MODULE_ID
        )
        if (manifestModule) server.moduleGraph.invalidateModule(manifestModule)

        // KTX2 files are written by the compress API — no page reload needed,
        // the UI updates via SSE and the manifest is already invalidated above.
        if (filePath.endsWith('.ktx2')) return

        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

const SRGB_SUFFIXES = new Set(['color', 'basecolor', 'albedo', 'emissive'])

function getKtx2Flags(filename) {
  const base = basename(filename, '.png').toLowerCase()
  const suffix = base.split('-').at(-1)
  const isNormal = suffix === 'normal' || suffix === 'norm'
  const isSrgb = SRGB_SUFFIXES.has(suffix)
  const flags = ['--t2', '--genmipmap']
  if (isSrgb) flags.push('--assign_oetf', 'srgb')
  if (isNormal) {
    flags.push('--encode', 'uastc', '--zcmp', '18')
  } else {
    flags.push('--encode', 'etc1s', '--clevel', '2', '--qlevel', '128')
  }
  return flags
}

async function loadSharpOrNull() {
  try {
    return (await import('sharp')).default
  } catch {
    return null
  }
}

function compressApiPlugin() {
  return {
    name: 'compress-api',
    buildStart() {
      const rootDir = process.cwd()
      const basisDir = resolve(rootDir, 'public/basis')
      if (!existsSync(basisDir)) {
        const basisSrc = resolve(rootDir, 'node_modules/three/examples/jsm/libs/basis')
        mkdirSync(basisDir, { recursive: true })
        copyFileSync(resolve(basisSrc, 'basis_transcoder.js'), resolve(basisDir, 'basis_transcoder.js'))
        copyFileSync(resolve(basisSrc, 'basis_transcoder.wasm'), resolve(basisDir, 'basis_transcoder.wasm'))
      }
    },
    configureServer(server) {
      const rootDir = process.cwd()
      const publicDir = resolve(rootDir, 'public')
      const ktx2Dir = resolve(publicDir, 'textures/ktx2')

      server.middlewares.use('/api/compress', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')

        if (req.method === 'GET' && req.url === '/textures') {
          const sharp = await loadSharpOrNull()
          if (!sharp) {
            res.writeHead(503, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                error:
                  'sharp not found. Run "npm install" to restore dev dependencies before using the compress API.',
              })
            )
            return
          }
          const files = listPublicFiles(resolve(publicDir, 'textures'), /\.(png|jpe?g)$/i)
          const results = await Promise.all(
            files.map(async (file) => {
              try {
                const meta = await sharp(file).metadata()
                const { size } = statSync(file)
                return { url: toPublicUrl(rootDir, file), width: meta.width, height: meta.height, size }
              } catch {
                return { url: toPublicUrl(rootDir, file), width: null, height: null, size: 0 }
              }
            })
          )
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(results))
          return
        }

        if (req.method === 'GET' && req.url === '/ktx2-status') {
          const files = existsSync(ktx2Dir)
            ? listPublicFiles(ktx2Dir, /\.ktx2$/i).map((f) => toPublicUrl(rootDir, f))
            : []
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(files))
          return
        }

        if (req.method === 'POST' && req.url === '/convert') {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', async () => {
            let texture, targetSize
            try {
              ;({ texture, size: targetSize } = JSON.parse(body))
            } catch {
              res.writeHead(400)
              res.end('invalid json')
              return
            }

            const srcPath = resolve(publicDir, texture.replace(/^\//, ''))
            if (!existsSync(srcPath)) {
              res.writeHead(404)
              res.end('texture not found')
              return
            }

            // Check toktx is available
            try {
              execFileSync('toktx', ['--version'], { stdio: 'pipe' })
            } catch {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'toktx not found — download KTX-Software from https://github.com/KhronosGroup/KTX-Software/releases and copy toktx to /usr/local/bin/' }))
              return
            }

            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            })

            const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

            try {
              const sharp = await loadSharpOrNull()
              if (!sharp) {
                send({
                  type: 'error',
                  text: 'sharp not found. Run "npm install" to restore dev dependencies before using the compress API.',
                })
                res.end()
                return
              }
              const { mkdtemp, rm } = await import('node:fs/promises')

              const tmpDir = await mkdtemp(resolve(tmpdir(), 'ktx2-'))
              const tmpPng = resolve(tmpDir, 'resized.png')

              send({ type: 'log', text: `Resizing to ${targetSize}px…` })
              let img = sharp(srcPath)
              if (targetSize !== 'original') {
                const size = Number(targetSize)
                img = img.resize(size, size, { fit: 'inside', withoutEnlargement: true })
              }
              await img.png().toFile(tmpPng)

              if (!existsSync(ktx2Dir)) mkdirSync(ktx2Dir, { recursive: true })

              const outName = basename(srcPath, '.png') + '.ktx2'
              const outPath = resolve(ktx2Dir, outName)

              const flags = getKtx2Flags(srcPath)
              send({ type: 'log', text: `Running: toktx ${flags.join(' ')} ${outName} resized.png` })

              await new Promise((resolve2, reject2) => {
                const proc = spawn('toktx', [...flags, outPath, tmpPng])
                proc.stdout.on('data', (d) => send({ type: 'log', text: d.toString() }))
                proc.stderr.on('data', (d) => send({ type: 'log', text: d.toString() }))
                proc.on('close', (code) => {
                  if (code === 0) resolve2()
                  else reject2(new Error(`toktx exited with code ${code}`))
                })
              })

              await rm(tmpDir, { recursive: true, force: true })

              // Invalidate manifest so the main app picks up the new .ktx2 on next load.
              const manifestModule = server.moduleGraph.getModuleById(
                RESOLVED_VIRTUAL_PUBLIC_ASSET_MANIFEST_MODULE_ID
              )
              if (manifestModule) server.moduleGraph.invalidateModule(manifestModule)

              send({ type: 'done', url: `/textures/ktx2/${outName}` })
            } catch (err) {
              send({ type: 'error', text: err.message })
            }

            res.end()
          })
          return
        }

        res.writeHead(404)
        res.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    glsl(),
    hdriOptionsPlugin(),
    publicAssetManifestPlugin(),
    compressApiPlugin(),
  ],
  assetsInclude: ['**/*.glb', '**/*.gltf']
})
