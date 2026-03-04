import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { parsePagination, buildMeta } from '../utils/pagination.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * GET /api/v1/anime
 */
export async function getAnimeList(req: Request, res: Response, next: NextFunction) {
    try {
        const { page, limit, offset, sort, filters } = parsePagination(req.query as any)
        const q = req.query.q as string

        let query = supabase.from('anime').select('*', { count: 'exact' })

        // Filters
        if (q) {
            query = query.or(`title.ilike.%${q}%,genres.cs.{"${q}"}`)
        }
        if (filters?.genre) {
            query = query.contains('genres', [filters.genre])
        }
        if (filters?.status) {
            query = query.eq('status', filters.status)
        }
        if (req.query.year) {
            // Only apply year filter if column exists (prevent crash if migration not run)
            try {
                query = query.gte('release_date', `${req.query.year}-01-01`).lte('release_date', `${req.query.year}-12-31`)
            } catch (e) {
                console.warn('[Backend] Release date filter failed, likely missing column.');
            }
        }

        // Sorting
        if (sort === 'popular') {
            query = query.order('popularity', { ascending: false })
        } else if (sort === 'score') {
            query = query.order('average_score', { ascending: false })
        } else if (sort === 'trending') {
            query = query.order('popularity', { ascending: false }).order('average_score', { ascending: false })
        } else if (sort === 'recent') {
            // Fallback to created_at if release_date is not yet available in schema
            query = query.order('created_at', { ascending: false })
        } else {
            query = query.order('created_at', { ascending: false })
        }

        query = query.range(offset, offset + limit - 1)

        let { data, error, count } = await query

        if (error) {
            // Handle common "column does not exist" error during migrations
            if (error.code === '42703' && (req.query.year || sort === 'recent')) {
                console.error('[Backend] Schema mismatch detected, retrying without release_date filter/sort');
                // Retry simple query
                const retry = await supabase.from('anime').select('*', { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);
                data = retry.data;
                error = retry.error;
                count = retry.count;
            }
        }

        if (error) throw error

        return response.success(res, data || [], buildMeta(count || 0, page, limit))
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/anime/search?q=
 */
export async function searchAnime(req: Request, res: Response, next: NextFunction) {
    try {
        const q = String(req.query.q || '')
        const page = parseInt(String(req.query.page || '1'), 10) || 1
        const limit = parseInt(String(req.query.limit || '20'), 10) || 20
        const offset = (page - 1) * limit

        const { data, error, count } = await supabase
            .from('anime')
            .select('*', { count: 'exact' })
            .ilike('title', `%${q}%`)
            .range(offset, offset + limit - 1)

        if (error) throw error
        return response.success(res, data || [], buildMeta(count || 0, page, limit))
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/anime/:id
 */
export async function getAnimeDetails(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id

        const { data, error } = await supabase.from('anime').select('*').eq('id', id).single()
        if (error || !data) return response.failure(res, 404, 'not_found', 'Anime not found')

        return response.success(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * POST /api/v1/anime/batch
 * Fetch multiple anime by an array of IDs
 */
export async function batchAnime(req: Request, res: Response, next: NextFunction) {
    try {
        const { ids } = req.body
        if (!Array.isArray(ids) || ids.length === 0) {
            return response.failure(res, 400, 'bad_request', 'ids must be a non-empty array')
        }
        if (ids.length > 50) {
            return response.failure(res, 400, 'bad_request', 'Maximum 50 IDs per request')
        }

        const { data, error } = await supabase
            .from('anime')
            .select('*')
            .in('id', ids)

        if (error) throw error
        return response.success(res, data || [])
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/anime/trending
 * Anime with most reactions in recent period, fallback to popularity
 */
export async function getTrending(req: Request, res: Response, next: NextFunction) {
    try {
        const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50)

        // Get anime IDs with most reactions in the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        const { data: recentReactions, error: rErr } = await supabase
            .from('reactions')
            .select('anime_id')
            .gte('created_at', sevenDaysAgo)

        if (rErr) throw rErr

        // Count reactions per anime
        const countMap: Record<string, number> = {}
        for (const r of recentReactions || []) {
            countMap[r.anime_id] = (countMap[r.anime_id] || 0) + 1
        }

        const trendingIds = Object.entries(countMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => parseInt(id, 10))
            .filter(id => !isNaN(id))

        console.log('[getTrending] IDs being fetched:', trendingIds)

        if (trendingIds.length > 0) {
            const { data, error } = await supabase
                .from('anime')
                .select('*')
                .in('id', trendingIds)

            if (error) {
                console.error('[getTrending] DB Error:', error)
                throw error
            }

            // Sort by reaction count
            const sorted = (data || []).sort(
                (a, b) => (countMap[String(b.id)] || 0) - (countMap[String(a.id)] || 0)
            )
            return response.success(res, sorted)
        }

        // Fallback: order by popularity
        const { data, error } = await supabase
            .from('anime')
            .select('*')
            .order('popularity', { ascending: false })
            .limit(limit)

        if (error) throw error
        return response.success(res, data || [])
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/anime/popular
 * Top anime by popularity score
 */
export async function getPopular(req: Request, res: Response, next: NextFunction) {
    try {
        const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50)

        const { data, error } = await supabase
            .from('anime')
            .select('*')
            .order('popularity', { ascending: false })
            .limit(limit)

        if (error) throw error
        return response.success(res, data || [])
    } catch (err) {
        return next(err)
    }
}
