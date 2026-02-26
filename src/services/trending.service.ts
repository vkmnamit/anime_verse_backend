import { redisKeys } from '../utils/redisKeys.util'

type RedisZAddLike = {
    zincrby: (key: string, increment: number, member: string) => Promise<number>
    zrevrange: (key: string, start: number, stop: number, withScores?: string) => Promise<string[]>
    zadd?: (key: string, score: number, member: string) => Promise<number>
}

/**
 * Record an event that affects trending score in Redis (e.g., view, reaction)
 */
export async function recordTrendingEvent(redis: RedisZAddLike | null, animeId: number | string, weight = 1) {
    if (!redis) return
    try {
        await redis.zincrby(redisKeys.trending(), weight, String(animeId))
    } catch (err) {
        console.warn('recordTrendingEvent error', err)
    }
}

/**
 * Get top N trending anime IDs from Redis. Returns array of { id, score }
 */
export async function getTrending(redis: RedisZAddLike | null, limit = 20) {
    if (!redis) return [] as Array<{ id: string; score: number }>
    try {
        // WITHSCORES returns [member, score, member, score, ...]
        const res = await redis.zrevrange(redisKeys.trending(), 0, limit - 1, 'WITHSCORES')
        const out: Array<{ id: string; score: number }> = []
        for (let i = 0; i < res.length; i += 2) {
            const id = res[i]
            const score = Number(res[i + 1])
            out.push({ id, score })
        }
        return out
    } catch (err) {
        console.warn('getTrending error', err)
        return []
    }
}

/**
 * Optional: recompute trending from a canonical source (e.g., aggregated views table)
 * This function is intentionally abstract — accept a fetchFn that returns [[id,score],...]
 */
export async function recomputeTrendingFromSource(redis: { zadd: (k: string, score: number, member: string) => Promise<any> } | null, fetchFn: () => Promise<Array<[string, number]>>) {
    if (!redis) return
    try {
        const rows = await fetchFn()
        // naive: write top N into redis sorted set
        for (const [id, score] of rows) {
            await redis.zadd(redisKeys.trending(), score, id)
        }
    } catch (err) {
        console.warn('recomputeTrendingFromSource error', err)
    }
}

export default { recordTrendingEvent, getTrending, recomputeTrendingFromSource }
