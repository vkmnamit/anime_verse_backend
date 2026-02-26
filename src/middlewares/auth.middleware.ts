import { Request, Response, NextFunction } from 'express'
import { getServiceSupabase } from '../config/supabase.config'
import response from '../utils/response.util'
const supabase = getServiceSupabase()


declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string
                email?: string
                role?: string
            }
        }
    }
}


export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return response.failure(res, 401, 'unauthorized', 'Missing or invalid authorization header')
        }

        const token = authHeader.split(' ')[1]

        if (!token) {
            return response.failure(res, 401, 'unauthorized', 'Token not provided')
        }

        // Verify the JWT with Supabase
        const { data, error } = await supabase.auth.getUser(token)

        if (error || !data?.user) {
            return response.failure(res, 401, 'unauthorized', 'Invalid or expired token')
        }

        // Attach user to request
        req.user = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role ?? 'authenticated',
        }

        return next()
    } catch (err) {
        console.error('[auth.middleware] Unexpected error:', err)
        return response.failure(res, 500, 'internal_error', 'Authentication service error')
    }
}

export default authMiddleware
