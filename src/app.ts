import express from 'express'
import cors from 'cors'
import routes from './routes'
import { errorMiddleware, notFound } from './middlewares/error.middleware'

const app = express()

// ─── Global middleware ───────────────────────────────────────────────
// Allow any origin in development; use env-var list in production
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000']

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // in non-production, allow everything
    if (process.env.NODE_ENV !== 'production') return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Respond to preflight OPTIONS requests immediately
app.options('*', cors())

// Chrome Private Network Access header
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true')
  next()
})

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
})

// ─── Health check ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/v1', (req, res) => {
  res.json({ message: "AnimeVerse API v1 is active", timestamp: new Date().toISOString() })
})

// ─── API v1 routes ──────────────────────────────────────────────────
app.use('/api/v1', routes)

// ─── Error handling ─────────────────────────────────────────────────
app.use(notFound)
app.use(errorMiddleware)

export default app
