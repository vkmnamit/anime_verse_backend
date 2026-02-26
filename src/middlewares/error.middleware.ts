import { Request, Response, NextFunction } from 'express'
import { ApiError, notFoundHandler, errorHandler as coreErrorHandler } from '../utils/errors.util'
import response from '../utils/response.util'

/**
 * Global error-handling middleware.
 *
 * Must be registered LAST in your Express app (after all routes).
 *
 * Handles:
 *   - ApiError instances → structured error response with correct status
 *   - Validation errors (from validate middleware) → 400
 *   - Unknown errors → 500 with generic message (never leaks stack to client)
 *
 * Usage in app.ts:
 *   app.use(errorMiddleware)
 */
export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
    // If headers already sent, delegate to Express default handler
    if (res.headersSent) {
        return next(err)
    }

    // Known API errors (thrown via `new ApiError(...)`)
    if (err instanceof ApiError) {
        return response.failure(res, err.statusCode, err.code, err.message, err.details)
    }

    // Validation errors (e.g. from express-validator or our validate middleware)
    if (err.name === 'ValidationError' || err.type === 'validation') {
        return response.failure(res, 400, 'validation_error', err.message || 'Validation failed', err.details || err.errors)
    }

    // Supabase / Postgres errors
    if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
        console.error('[error.middleware] Database error:', err)
        return response.failure(res, 500, 'database_error', 'A database error occurred')
    }

    // Fallback — never leak internals
    console.error('[error.middleware] Unhandled error:', err)
    return response.failure(res, 500, 'internal_error', 'An unexpected error occurred')
}

/**
 * 404 handler — register AFTER all routes but BEFORE errorMiddleware.
 *
 * Usage in app.ts:
 *   app.use(notFound)
 *   app.use(errorMiddleware)
 */
export function notFound(req: Request, res: Response) {
    return notFoundHandler(req, res)
}

export { ApiError }

export default { errorMiddleware, notFound, ApiError }
