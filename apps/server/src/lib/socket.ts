import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import { verifyAccessToken } from '../utils/jwt'

let io: Server

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.['token'] as string | undefined
    if (!token) return next(new Error('No token provided'))
    try {
      const payload = verifyAccessToken(token)
      socket.data['userId']    = payload.userId
      socket.data['companyId'] = payload.companyId
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (socket) => {
    const companyId = socket.data['companyId'] as string
    const userId    = socket.data['userId']    as string
    socket.join(`company:${companyId}`)
    socket.join(`user:${userId}`)
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket first')
  return io
}
