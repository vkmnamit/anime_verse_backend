import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { buildMeta } from '../utils/pagination.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

const KITSU_BASE = 'https://kitsu.io/api/edge'

/** Fetch the poster image URL for an anime name from Kitsu */
async function fetchKitsuPoster(name: string): Promise<string> {
  try {
    const url = `${KITSU_BASE}/anime?filter[text]=${encodeURIComponent(name)}&page[limit]=1`
    const res = await fetch(url, { headers: { Accept: 'application/vnd.api+json' } })
    if (!res.ok) return ''
    const json: any = await res.json()
    const attrs = json?.data?.[0]?.attributes
    if (!attrs) return ''
    return (
      attrs.posterImage?.large ||
      attrs.posterImage?.medium ||
      attrs.posterImage?.small ||
      ''
    )
  } catch {
    return ''
  }
}

/** Enrich a raw DB battle row with Kitsu images */
async function enrichBattle(raw: any) {
  const nameA: string = raw.anime_a_name ?? ''
  const nameB: string = raw.anime_b_name ?? ''

  // Fetch both images in parallel
  const [imageA, imageB] = await Promise.all([
    nameA ? fetchKitsuPoster(nameA) : Promise.resolve(''),
    nameB ? fetchKitsuPoster(nameB) : Promise.resolve(''),
  ])

  return {
    ...raw,
    animeA: { name: nameA, image: imageA },
    animeB: { name: nameB, image: imageB },
  }
}

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
      .select('id, anime_a_name, anime_b_name, round, status, winner, created_at', { count: 'exact' })
      .not('anime_a_name', 'is', null)
      .order('round', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Enrich all battles with Kitsu images in parallel
    const enriched = await Promise.all((data || []).map(enrichBattle))

    return response.success(res, enriched, buildMeta(count || 0, page, limit))
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/battles
 */
export async function createBattle(req: Request, res: Response, next: NextFunction) {
  try {
    const { anime_a_name, anime_b_name, round } = req.body

    const { data, error } = await supabase
      .from('battles')
      .insert({ anime_a_name, anime_b_name, round: round ?? 1, status: 'active' })
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
    const userId = req.user?.id

    const { data: battle, error } = await supabase
      .from('battles')
      .select('id, anime_a_name, anime_b_name, round, status, winner, created_at')
      .eq('id', id)
      .single()

    if (error || !battle) return response.failure(res, 404, 'not_found', 'Battle not found')

    // Fetch images from Kitsu
    const [imageA, imageB] = await Promise.all([
      battle.anime_a_name ? fetchKitsuPoster(battle.anime_a_name) : Promise.resolve(''),
      battle.anime_b_name ? fetchKitsuPoster(battle.anime_b_name) : Promise.resolve(''),
    ])

    // Fetch vote counts
    const { data: votes } = await supabase
      .from('battle_votes')
      .select('vote_for')
      .eq('battle_id', id)

    const votesA = (votes || []).filter(v => v.vote_for === 'A').length
    const votesB = (votes || []).filter(v => v.vote_for === 'B').length
    const total = votesA + votesB

    // Fetch user's own vote if logged in
    let userVote: string | null = null
    if (userId) {
      const { data: myVote } = await supabase
        .from('battle_votes')
        .select('vote_for')
        .eq('battle_id', id)
        .eq('user_id', userId)
        .single()
      userVote = myVote?.vote_for ?? null
    }

    return response.success(res, {
      ...battle,
      animeA: { name: battle.anime_a_name, image: imageA },
      animeB: { name: battle.anime_b_name, image: imageB },
      votes: {
        A: votesA,
        B: votesB,
        total,
        percentA: total ? Math.round((votesA / total) * 100) : 0,
        percentB: total ? Math.round((votesB / total) * 100) : 0,
      },
      userVote,
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

/**
 * GET /api/v1/battles/my-votes
 * Returns all battle_votes for the logged-in user as { [battle_id]: "A" | "B" }
 */
export async function getMyVotes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

    const { data, error } = await supabase
      .from('battle_votes')
      .select('battle_id, vote_for')
      .eq('user_id', userId)

    if (error) throw error

    const votesMap: Record<string, string> = {}
    for (const row of data || []) {
      votesMap[row.battle_id] = row.vote_for
    }
    return response.success(res, votesMap)
  } catch (err) {
    return next(err)
  }
}
