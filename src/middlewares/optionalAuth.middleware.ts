import { Request, Response, NextFunction } from 'express'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * Optional auth middleware — does NOT reject unauthenticated requests.
 *
 * If a valid Bearer token is present → attaches `req.user`.
 * If no token or invalid token    → continues without `req.user` (it stays undefined).
 *
 * Use on routes that work for guests but show extra data for logged-in users.
 * Examples:
 *   - Anime detail page (show "your reaction" if logged in)
 *   - Opinions feed (highlight your own opinions)
 */
export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token — continue as guest
            return next()
        }

        const token = authHeader.split(' ')[1]

        if (!token) {
            return next()
        }

        const { data, error } = await supabase.auth.getUser(token)

        if (!error && data?.user) {
            req.user = {
                id: data.user.id,
                email: data.user.email,
                role: data.user.role ?? 'authenticated',
            }
        }

        // Always continue — even if token was bad, guest access is fine
        return next()
    } catch (err) {
        // Swallow errors — optional auth should never block the request
        console.warn('[optionalAuth.middleware] Error verifying token:', err)
        return next()
    }
}

export default optionalAuthMiddleware
