import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { buildMeta } from '../utils/pagination.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * GET /api/v1/battles
 */
export async function getBattles(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(String(req.query.page || '1'), 10) || 1
    const limit = parseInt(String(req.query.limit || '20'), 10) || 20
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('battles')
      .select('*, anime_a_rel:anime!battles_anime_a_fkey(*), anime_b_rel:anime!battles_anime_b_fkey(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return response.success(res, data || [], buildMeta(count || 0, page, limit))
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/battles
 */
export async function createBattle(req: Request, res: Response, next: NextFunction) {
  try {
    const { anime_a, anime_b } = req.body

    const { data, error } = await supabase
      .from('battles')
      .insert({ anime_a, anime_b })
      .select()
      .single()

    if (error) throw error
    return response.created(res, data)
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/v1/battles/:id
 */
export async function getBattleDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    // Fetch battle with anime details
    const { data: battle, error } = await supabase
      .from('battles')
      .select('*, anime_a_rel:anime!battles_anime_a_fkey(*), anime_b_rel:anime!battles_anime_b_fkey(*)')
      .eq('id', id)
      .single()

    if (error || !battle) return response.failure(res, 404, 'not_found', 'Battle not found')

    // Fetch vote counts
    const { data: votes } = await supabase
      .from('battle_votes')
      .select('vote_for')
      .eq('battle_id', id)

    const votesA = (votes || []).filter(v => v.vote_for === 'A').length
    const votesB = (votes || []).filter(v => v.vote_for === 'B').length
    const total = votesA + votesB

    return response.success(res, {
      ...battle,
      votes: {
        A: votesA,
        B: votesB,
        total,
        percentA: total ? Math.round((votesA / total) * 100) : 0,
        percentB: total ? Math.round((votesB / total) * 100) : 0,
      },
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/battles/:id/vote
 */
export async function voteBattle(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

    const battleId = req.params.id
    const { vote_for } = req.body // 'A' or 'B'

    const { data, error } = await supabase
      .from('battle_votes')
      .upsert({ user_id: userId, battle_id: battleId, vote_for }, { onConflict: 'user_id,battle_id' })
      .select()
      .single()

    if (error) throw error
    return response.success(res, data)
  } catch (err) {
    return next(err)
  }
}
