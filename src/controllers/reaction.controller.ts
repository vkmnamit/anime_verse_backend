import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * POST /api/v1/reactions
 * Upsert reaction (one per user per anime)
 */
export async function createOrUpdateReaction(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

    const { anime_id, reaction_type } = req.body

    const { data, error } = await supabase
      .from('reactions')
      .upsert({ user_id: userId, anime_id, reaction_type }, { onConflict: 'user_id,anime_id' })
      .select()
      .single()

    if (error) throw error
    return response.created(res, data)
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/v1/anime/:animeId/reactions
 * Get reaction breakdown for an anime
 */
export async function getReactionsForAnime(req: Request, res: Response, next: NextFunction) {
  try {
    const { animeId } = req.params

    const { data, error } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('anime_id', animeId)

    if (error) throw error

    // Build breakdown: { masterpiece: 5, mid: 3, ... }
    const breakdown: Record<string, number> = {}
    for (const row of data || []) {
      breakdown[row.reaction_type] = (breakdown[row.reaction_type] || 0) + 1
    }

    return response.success(res, { anime_id: animeId, breakdown, total: (data || []).length })
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/v1/anime/:id/sentiment
 * Sentiment analysis: dominant reaction, percentages, sentiment score
 */
export async function getAnimeSentiment(req: Request, res: Response, next: NextFunction) {
  try {
    const animeId = req.params.id

    const { data, error } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('anime_id', animeId)

    if (error) throw error

    const reactions = data || []
    const total = reactions.length

    if (total === 0) {
      return response.success(res, {
        anime_id: animeId,
        total: 0,
        dominant_reaction: null,
        sentiment_score: 0,
        breakdown: {},
        percentages: {},
      })
    }

    // Count per type
    const breakdown: Record<string, number> = {}
    for (const r of reactions) {
      breakdown[r.reaction_type] = (breakdown[r.reaction_type] || 0) + 1
    }

    // Percentages
    const percentages: Record<string, number> = {}
    for (const [type, count] of Object.entries(breakdown)) {
      percentages[type] = Math.round((count / total) * 1000) / 10 // one decimal
    }

    // Dominant reaction
    const dominant_reaction = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0][0]

    // Sentiment score: weight positive reactions higher, negative lower
    // masterpiece=+2, fire=+1, mid=0, trash=-1, overrated=-1, underrated=+1
    const sentimentWeights: Record<string, number> = {
      masterpiece: 2,
      fire: 1,
      underrated: 1,
      mid: 0,
      overrated: -1,
      trash: -1,
    }
    let weightedSum = 0
    for (const r of reactions) {
      weightedSum += sentimentWeights[r.reaction_type] ?? 0
    }
    // Normalize to -100 to +100 scale
    const maxPossible = total * 2
    const sentiment_score = Math.round((weightedSum / maxPossible) * 100)

    return response.success(res, {
      anime_id: animeId,
      total,
      dominant_reaction,
      sentiment_score,
      breakdown,
      percentages,
    })
  } catch (err) {
    return next(err)
  }
}
