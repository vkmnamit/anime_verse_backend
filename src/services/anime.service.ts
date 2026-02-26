import { parse } from 'path'
import { getOrSetCache } from './cache.service'
import * as Trending from './trending.service'
import * as Repo from '../repositories/anime.repository'
import { redisKeys } from '../utils/redisKeys.util'

type ListParams = {
    page: number
    limit: number
    offset: number
    sort?: string | null
    filters?: Record<string, any>
}

/**
 * List anime with pagination. Uses repository for data and cache service when available.
 */
export async function listAnime(params: ListParams, opts: { req?: any; supabase?: any; redis?: any } = {}) {
    const { page, limit } = params
    const cacheKey = `${redisKeys.trending()}:list:${page}:${limit}:${params.sort || 'default'}`

    const fetchFn = async () => {
        // delegate to repository
        const dbRes = await Repo.fetchList(params, { supabase: opts.supabase })
        return dbRes
    }

    const data = await getOrSetCache(opts.redis || null, cacheKey, 30, fetchFn)
    return data
}

export async function getAnimeDetails(id: string | number, opts: { req?: any; supabase?: any; redis?: any } = {}) {
    const cacheKey = redisKeys.animeDetails(id)
    const fetchFn = async () => {
        const row = await Repo.getById(id, { supabase: opts.supabase })
        return row
    }
    return getOrSetCache(opts.redis || null, cacheKey, 60, fetchFn)
}

export async function searchAnime(q: string, pager: { page: number; limit: number }, opts: { req?: any; supabase?: any; redis?: any } = {}) {
    // use repository search (should be highly cached at edge)
    const res = await Repo.search(q, pager, { supabase: opts.supabase })
    return res
}

export async function recordView(redis: any, animeId: number | string, weight = 1) {
    return Trending.recordTrendingEvent(redis, animeId, weight)
}

export default { listAnime, getAnimeDetails, searchAnime, recordView }
