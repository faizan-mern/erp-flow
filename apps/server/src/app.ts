import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import authRoutes from './modules/auth/auth.routes'
import { errorHandler } from './middleware/error.middleware'

const app = express()
const PORT = process.env.PORT || 5000

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet())  // Sets security-related HTTP headers automatically
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,  // Required to allow cookies (refresh token) to be sent cross-origin
}))

// Rate limiting: max 100 requests per 15 minutes per IP
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }))

// ─── General middleware ───────────────────────────────────────────────────────
app.use(morgan('dev'))        // Logs every request: GET /api/auth/login 200 45ms
app.use(cookieParser())       // Parses cookies so we can read req.cookies.refreshToken
app.use(express.json())       // Parses JSON request bodies
app.use(express.urlencoded({ extended: true }))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// Health check endpoint — used by Docker healthcheck and monitoring
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
})

export default app
