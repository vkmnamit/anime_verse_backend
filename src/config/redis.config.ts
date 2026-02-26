/**
 * Small Redis client factory. Uses dynamic require so projects without ioredis
 * won't crash at import time. Call `getRedisClient()` at bootstrap and check for null.
 */

export function getRedisClient() {
    try {
        // dynamic require so this file is safe even if ioredis isn't installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IORedis = require('ioredis')
        const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
        return new IORedis(url)
    } catch (err) {
        // ioredis not available or failed to connect — return null to allow graceful fallback
        // Consumer code should handle null redis client.
        // Example: const redis = getRedisClient(); if (redis) use caching
        // console.warn('Redis client not available:', err)
        return null
    }
}

export default { getRedisClient }
