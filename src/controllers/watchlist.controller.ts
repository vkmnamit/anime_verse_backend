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
        const { anime_id, status, anime_data } = req.body

        if (!anime_id) {
            return response.failure(res, 400, 'bad_request', 'anime_id is required')
        }

        // Auto-sync anime metadata if provided to satisfy FK constraints
        if (anime_data) {
            await supabase.from('anime').upsert({
                id: anime_id,
                title: anime_data.title || 'Unknown',
                cover_image: anime_data.posterImage || '',
                synopsis: anime_data.synopsis || '',
                average_score: anime_data.rating || 0,
                status: anime_data.status || 'unknown',
                genres: anime_data.categories || []
            }, { onConflict: 'id' })
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
 * PATCH /api/v1/watchlist/:animeId
 * Update status, episodes_watched, score, notes
 */
export async function updateWatchlistEntry(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id
        const { animeId } = req.params
        const { status, episodes_watched, score, notes } = req.body

        const updates: Record<string, any> = { updated_at: new Date().toISOString() }
        if (status !== undefined) updates.status = status
        if (episodes_watched !== undefined) updates.episodes_watched = Number(episodes_watched)
        if (score !== undefined) updates.score = score === null ? null : Number(score)
        if (notes !== undefined) updates.notes = notes

        const { data, error } = await supabase
            .from('watchlist')
            .update(updates)
            .eq('user_id', userId)
            .eq('anime_id', animeId)
            .select()
            .single()

        if (error) throw error
        if (!data) return response.failure(res, 404, 'not_found', 'Watchlist entry not found')
        return response.success(res, data)
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

/**
 * GET /api/v1/watchlist/:username
 * Publicly accessible watchlist for a user
 */
export async function getUserWatchlist(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.params

        const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
        if (!profile) return response.failure(res, 404, 'not_found', 'User not found')

        const { data, error } = await supabase
            .from('watchlist')
            .select('*, anime(*)')
            .eq('user_id', profile.id)
            .order('updated_at', { ascending: false })

        if (error) throw error
        return response.success(res, data || [])
    } catch (err) {
        return next(err)
    }
}