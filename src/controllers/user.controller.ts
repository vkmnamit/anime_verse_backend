import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * GET /api/v1/users/:username
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.params

        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, bio, created_at')
            .eq('username', username)
            .single()

        if (error || !data) return response.failure(res, 404, 'not_found', 'User not found')
        return response.success(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * PATCH /api/v1/users/me
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { username, avatar_url, bio } = req.body
        const updates: Record<string, any> = {}
        if (username !== undefined) updates.username = username
        if (avatar_url !== undefined) updates.avatar_url = avatar_url
        if (bio !== undefined) updates.bio = bio

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single()

        if (error) throw error
        return response.success(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * Helper: build stats for a given user ID
 */
async function buildUserStats(userId: string) {
    const [reactions, opinions, comments, watchlist, battles] = await Promise.all([
        supabase.from('reactions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('opinions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('battle_votes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ])

    // Watchlist breakdown by status
    const { data: wlData } = await supabase
        .from('watchlist')
        .select('status')
        .eq('user_id', userId)

    const watchlistBreakdown: Record<string, number> = {}
    for (const row of wlData || []) {
        watchlistBreakdown[row.status] = (watchlistBreakdown[row.status] || 0) + 1
    }

    return {
        reactions_given: reactions.count ?? 0,
        opinions_posted: opinions.count ?? 0,
        comments_posted: comments.count ?? 0,
        watchlist_total: watchlist.count ?? 0,
        watchlist_breakdown: watchlistBreakdown,
        battles_voted: battles.count ?? 0,
    }
}

/**
 * GET /api/v1/users/:username/stats
 */
export async function getUserStats(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.params

        // Resolve username → user id
        const { data: profile, error: pErr } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('username', username)
            .single()

        if (pErr || !profile) return response.failure(res, 404, 'not_found', 'User not found')

        const stats = await buildUserStats(profile.id)
        return response.success(res, { username: profile.username, ...stats })
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/users/me/stats
 */
export async function getMyStats(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const stats = await buildUserStats(userId)
        return response.success(res, stats)
    } catch (err) {
        return next(err)
    }
}
