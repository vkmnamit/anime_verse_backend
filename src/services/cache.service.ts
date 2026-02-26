/**
 * Small helper to read/write from a Redis client with a fetch fallback.
 * The implementation is intentionally framework-agnostic: accept any client
 * implementing get/set/expire or provide your own wrapper.
 */

type RedisLike = {
    get: (k: string) => Promise<string | null>
    set: (k: string, v: string) => Promise<'OK' | null>
    expire?: (k: string, ttl: number) => Promise<number>
}

export async function getOrSetCache<T>(redis: RedisLike | null, key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    if (!redis) {
        // no redis available — just fetch fresh
        return fetchFn()
    }

    try {
        const cached = await redis.get(key)
        if (cached) {
            return JSON.parse(cached) as T
        }

        const data = await fetchFn()
        await redis.set(key, JSON.stringify(data))
        if (typeof redis.expire === 'function') {
            await redis.expire(key, ttlSeconds)
        }
        return data
    } catch (err) {
        // failing cache should not break the request — log upstream and return the fresh data
        console.warn('cache getOrSet error', err)
        return fetchFn()
    }
}

export default { getOrSetCache }
