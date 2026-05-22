import { createServer } from 'http'
import { Server } from 'socket.io'
import { networkInterfaces } from 'os'

const httpServer = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/mobile-url') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ url: `http://${getLocalIP()}:5173/?mode=mobile` }))
  } else {
    res.writeHead(404)
    res.end()
  }
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

const PORT = 3001
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
  console.log(`Serveur Socket.io démarré`)
  console.log(`  → local  : http://localhost:${PORT}`)
  console.log(`  → réseau : http://${ip}:${PORT}`)
  console.log(`  → mobile : http://${ip}:5173/?mode=mobile`)
})
