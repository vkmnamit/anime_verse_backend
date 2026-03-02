import express from 'express'
import cors from 'cors'
import routes from './routes'
import { errorMiddleware, notFound } from './middlewares/error.middleware'

const app = express()

// ─── Global middleware ───────────────────────────────────────────────
app.use(cors())
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
