import { Request, Response, NextFunction } from 'express'
import { getServiceSupabase } from '../config/supabase.config'
import response from '../utils/response.util'

const supabase = getServiceSupabase()

/**
 * POST /api/v1/watchlist
 * Add or update watchlist entry
 */
export async function addOrUpdateWatchlist(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id
        const { anime_id, status } = req.body

        if (!anime_id) {
            return response.failure(res, 400, 'bad_request', 'anime_id is required')
        }

        const { data, error } = await supabase
            .from('watchlist')
            .upsert({
                user_id: userId,
                anime_id,
                status: status || 'watching',
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,anime_id' })
            .select()
            .single()

        if (error) throw error
        return response.success(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/watchlist
 * Get current user's watchlist
 */
export async function getWatchlist(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id
        const { status } = req.query

        let query = supabase
            .from('watchlist')
            .select('*, anime(*)')
            .eq('user_id', userId)

        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query.order('updated_at', { ascending: false })

        if (error) throw error
        return response.success(res, data || [])
    } catch (err) {
        return next(err)
    }
}

/**
 * DELETE /api/v1/watchlist/:animeId
 * Remove from watchlist
 */
export async function removeFromWatchlist(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id
        const { animeId } = req.params

        const { error } = await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', userId)
            .eq('anime_id', animeId)

        if (error) throw error
        return response.success(res, { message: 'Removed from watchlist' })
    } catch (err) {
        return next(err)
    }
}