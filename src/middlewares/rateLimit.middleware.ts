import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'

/**
 * In-memory rate limiter (no external dependency needed).
 *
 * For production at scale, swap this with Redis-based rate limiting
 * (e.g. `rate-limit-redis` or a custom Redis INCR + EXPIRE approach).
 *
 * Usage:
 *   app.use('/api/v1/reactions', rateLimit({ windowMs: 60_000, max: 30 }), reactionRoutes)
 *   app.use('/api/v1/opinions', rateLimit({ windowMs: 60_000, max: 20 }), opinionRoutes)
 */

interface RateLimitOptions {
    /** Time window in milliseconds (default: 60 seconds) */
    windowMs?: number
    /** Max requests per window per IP (default: 100) */
    max?: number
    /** Error message shown when limit exceeded */
    message?: string
}

interface HitRecord {
    count: number
    resetTime: number
}

export function rateLimit(options: RateLimitOptions = {}) {
    const windowMs = options.windowMs ?? 60_000       // 1 minute default
    const max = options.max ?? 100                     // 100 req/min default
    const message = options.message ?? 'Too many requests, please try again later'

    // Simple in-memory store — keyed by IP
    const hits = new Map<string, HitRecord>()

    // Periodic cleanup to prevent memory leaks (every 5 minutes)
    const cleanupInterval = setInterval(() => {
        const now = Date.now()
        for (const [key, record] of hits) {
            if (now > record.resetTime) {
                hits.delete(key)
            }
        }
    }, 5 * 60_000)

    // Allow Node to exit even if interval is active
    if (cleanupInterval.unref) {
        cleanupInterval.unref()
    }

    return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
        // Use IP as the rate-limit key. For authenticated routes you could use req.user.id instead.
        const key = req.ip || req.socket.remoteAddress || 'unknown'
        const now = Date.now()

        let record = hits.get(key)

        // If no record or window expired → start fresh
        if (!record || now > record.resetTime) {
            record = { count: 1, resetTime: now + windowMs }
            hits.set(key, record)
        } else {
            record.count++
        }

        // Set standard rate-limit headers
        const remaining = Math.max(0, max - record.count)
        const resetSeconds = Math.ceil((record.resetTime - now) / 1000)

        res.setHeader('X-RateLimit-Limit', String(max))
        res.setHeader('X-RateLimit-Remaining', String(remaining))
        res.setHeader('X-RateLimit-Reset', String(resetSeconds))

        if (record.count > max) {
            res.setHeader('Retry-After', String(resetSeconds))
            return response.failure(res, 429, 'rate_limit_exceeded', message)
        }

        return next()
    }
}

export default rateLimit
