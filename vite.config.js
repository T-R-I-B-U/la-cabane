import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import { existsSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
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
    textureFiles: listPublicFiles(resolve(rootDir, 'public/textures'), /\.(png|jpe?g|webp)$/i).map(
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
        server.ws.send({ type: 'full-reload' })
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
  ],
  assetsInclude: ['**/*.glb', '**/*.gltf']
})
