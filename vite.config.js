import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const VIRTUAL_HDRI_MODULE_ID = 'virtual:hdri-options'
const RESOLVED_VIRTUAL_HDRI_MODULE_ID = `\0${VIRTUAL_HDRI_MODULE_ID}`

function listHdriFiles() {
  const hdriDir = resolve(process.cwd(), 'public/hdri')
  if (!existsSync(hdriDir)) return []

  return readdirSync(hdriDir)
    .filter((fileName) => /\.(hdr|exr)$/i.test(fileName))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => `/hdri/${encodeURIComponent(fileName)}`)
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

export default defineConfig({
  plugins: [
    react(),
    glsl(),
    hdriOptionsPlugin(),
  ],
  assetsInclude: ['**/*.glb', '**/*.gltf']
})
