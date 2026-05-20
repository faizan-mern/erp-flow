import 'dotenv/config'
import { createServer } from 'http'
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
import productRoutes from './modules/product/product.routes'
import aiRoutes from './modules/ai/ai.routes'
import dashboardRoutes from './modules/dashboard/dashboard.routes'
import notificationRoutes from './modules/notification/notification.routes'
import superAdminRoutes from './modules/super-admin/super-admin.routes'
import { errorHandler } from './middleware/error.middleware'
import { initSocket } from './lib/socket'
import { swaggerSpec } from './lib/swagger'
import swaggerUi from 'swagger-ui-express'

const app = express()
const PORT = process.env.PORT || 5000

app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  skip: (req) => req.path === '/health',
}))
app.use(morgan('dev'))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const v1 = Router()
v1.use('/auth', authRoutes)
v1.use('/employees', employeeRoutes)
v1.use('/expenses', expenseRoutes)
v1.use('/users', userRoutes)
v1.use('/products', productRoutes)
v1.use('/ai', aiRoutes)
v1.use('/dashboard', dashboardRoutes)
v1.use('/notifications', notificationRoutes)
v1.use('/super-admin', superAdminRoutes)
app.use('/api/v1', v1)

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/api/docs-json', (_req, res) => res.json(swaggerSpec))
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use(errorHandler)

const httpServer = createServer(app)
initSocket(httpServer)

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
})

export default app
