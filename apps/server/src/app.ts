import 'dotenv/config'
import express, { Router } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import authRoutes from './modules/auth/auth.routes'
import employeeRoutes from './modules/employee/employee.routes'
import expenseRoutes from './modules/expense/expense.routes'
import userRoutes from './modules/user/user.routes'
import { errorHandler } from './middleware/error.middleware'

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }))
app.use(morgan('dev'))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const v1 = Router()
v1.use('/auth', authRoutes)
v1.use('/employees', employeeRoutes)
v1.use('/expenses', expenseRoutes)
v1.use('/users', userRoutes)
app.use('/api/v1', v1)

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
})

export default app
