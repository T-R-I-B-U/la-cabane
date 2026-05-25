import { createServer } from 'http'
import { Server } from 'socket.io'
import { networkInterfaces } from 'os'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, '../dist')

const httpServer = createServer((req, res) => {
  // 1. API Mobile URL
  if (req.method === 'GET' && req.url === '/api/mobile-url') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ url: `http://${getLocalIP()}:${PORT}/?mode=mobile` }))
  }

  // 2. Servir les fichiers statiques du build (Vite)
  let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url)

  // Gestion du SPA (fallback sur index.html si le fichier n'existe pas)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distPath, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.hdr': 'application/octet-stream',
    '.wasm': 'application/wasm',
    '.ktx2': 'image/ktx2',
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404)
        res.end('File not found')
      } else {
        res.writeHead(500)
        res.end(`Error: ${error.code}`)
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
      res.end(content, 'utf-8')
    }
  })
})

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

function getLocalIP() {
  const nets = networkInterfaces()
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return 'localhost'
}

const PORT = process.env.PORT || 3001
const ip = getLocalIP()

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connecté`)

  // Legacy POC drawing relay
  socket.on('send-message', (data) => {
    socket.broadcast.emit('message-received', data)
  })

  // Formulaire savoir complet
  socket.on('savoir-submit', (data) => {
    socket.broadcast.emit('savoir-received', data)
  })

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} déconnecté`)
  })
})

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur complet démarré`)
  console.log(`  → local  : http://localhost:${PORT}`)
  console.log(`  → réseau : http://${ip}:${PORT}`)
  console.log(`  → mobile : http://${ip}:${PORT}/?mode=mobile`)
})
