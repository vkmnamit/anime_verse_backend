import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { buildMeta } from '../utils/pagination.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * POST /api/v1/opinions
 */
export async function createOpinion(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { anime_id, content } = req.body

        const { data, error } = await supabase
            .from('opinions')
            .insert({ user_id: userId, anime_id, content })
            .select()
            .single()

        if (error) throw error
        return response.created(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/anime/:animeId/opinions?sort=top|new
 */
export async function getOpinionsForAnime(req: Request, res: Response, next: NextFunction) {
    try {
        const { animeId } = req.params
        const page = parseInt(String(req.query.page || '1'), 10) || 1
        const limit = parseInt(String(req.query.limit || '20'), 10) || 20
        const offset = (page - 1) * limit

        const { data, error, count } = await supabase
            .from('opinions')
            .select('*, profiles(username, avatar_url)', { count: 'exact' })
            .eq('anime_id', animeId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error
        return response.success(res, data || [], buildMeta(count || 0, page, limit))
    } catch (err) {
        return next(err)
    }
}

/**
 * POST /api/v1/opinions/:id/vote
 */
export async function voteOnOpinion(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const opinionId = req.params.id
        const { vote } = req.body // +1 or -1

        const { data, error } = await supabase
            .from('opinion_votes')
            .upsert({ user_id: userId, opinion_id: opinionId, vote }, { onConflict: 'user_id,opinion_id' })
            .select()
            .single()

        if (error) throw error
        return response.success(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * DELETE /api/v1/opinions/:id
 * Delete own opinion (ownership enforced)
 */
export async function deleteOpinion(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const opinionId = req.params.id

        // Check ownership
        const { data: existing, error: fetchErr } = await supabase
            .from('opinions')
            .select('id, user_id')
            .eq('id', opinionId)
            .single()

        if (fetchErr || !existing) return response.failure(res, 404, 'not_found', 'Opinion not found')
        if (existing.user_id !== userId) return response.failure(res, 403, 'forbidden', 'You can only delete your own opinions')

        const { error } = await supabase.from('opinions').delete().eq('id', opinionId)
        if (error) throw error

        return response.success(res, { message: 'Opinion deleted' })
    } catch (err) {
        return next(err)
    }
}
