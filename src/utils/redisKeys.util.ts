export const redisKeys = {
    trending: () => `anime:trending`,
    animeDetails: (id: number | string) => `anime:${id}:details`,
    reactions: (animeId: number | string) => `anime:${animeId}:reactions`,
    battle: (battleId: number | string) => `battle:${battleId}:stats`,
    userWatchlist: (userId: number | string) => `user:${userId}:watchlist`,
}

export default redisKeys
