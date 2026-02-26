import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()
import { parsePagination, buildMeta } from '../utils/pagination.util'

/**
 * GET /api/v1/notifications
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

    const { page, limit, offset } = parsePagination(req.query)

    const countQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const dataQuery = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])

    if (dataResult.error) throw dataResult.error
    const total = countResult.count ?? 0
    return response.success(res, dataResult.data, buildMeta(total, page, limit))
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/notifications/:id/read
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

    const { id } = req.params

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !data) return response.failure(res, 404, 'not_found', 'Notification not found')
    return response.success(res, data)
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/notifications/read-all
 */
export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return response.success(res, { message: 'All notifications marked as read' })
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/v1/notifications/unread/count
 */
export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return response.success(res, { unread_count: count ?? 0 })
  } catch (err) {
    return next(err)
  }
}
