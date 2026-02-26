import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { buildMeta } from '../utils/pagination.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * POST /api/v1/comments
 */
export async function createComment(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { anime_id, content, parent_id } = req.body

        const { data, error } = await supabase
            .from('comments')
            .insert({ user_id: userId, anime_id, content, parent_id: parent_id || null })
            .select()
            .single()

        if (error) throw error
        return response.created(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/anime/:animeId/comments?sort=top|new
 */
export async function getCommentsForAnime(req: Request, res: Response, next: NextFunction) {
    try {
        const { animeId } = req.params
        const page = parseInt(String(req.query.page || '1'), 10) || 1
        const limit = parseInt(String(req.query.limit || '20'), 10) || 20
        const offset = (page - 1) * limit

        const { data, error, count } = await supabase
            .from('comments')
            .select('*, profiles(username, avatar_url)', { count: 'exact' })
            .eq('anime_id', animeId)
            .is('parent_id', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error
        return response.success(res, data || [], buildMeta(count || 0, page, limit))
    } catch (err) {
        return next(err)
    }
}

/**
 * DELETE /api/v1/comments/:id
 * Delete own comment (ownership enforced)
 */
export async function deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const commentId = req.params.id

        // Check ownership
        const { data: existing, error: fetchErr } = await supabase
            .from('comments')
            .select('id, user_id')
            .eq('id', commentId)
            .single()

        if (fetchErr || !existing) return response.failure(res, 404, 'not_found', 'Comment not found')
        if (existing.user_id !== userId) return response.failure(res, 403, 'forbidden', 'You can only delete your own comments')

        const { error } = await supabase.from('comments').delete().eq('id', commentId)
        if (error) throw error

        return response.success(res, { message: 'Comment deleted' })
    } catch (err) {
        return next(err)
    }
}
