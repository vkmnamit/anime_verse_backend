import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * GET /api/v1/users/me — own full profile (auth required)
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, banner_url, bio, genres, twitter, instagram, facebook, created_at')
            .eq('id', userId)
            .single()

        if (error || !data) return response.failure(res, 404, 'not_found', 'Profile not found')
        return response.success(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/users/:username
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.params

        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, banner_url, bio, genres, twitter, instagram, facebook, created_at')
            .eq('username', username)
            .single()

        if (error || !data) return response.failure(res, 404, 'not_found', 'User not found')
        return response.success(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * PATCH /api/v1/users/me
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { username, display_name, avatar_url, banner_url, bio, genres, twitter, instagram, facebook } = req.body
        const updates: Record<string, any> = {}
        if (username !== undefined) updates.username = username
        if (display_name !== undefined) updates.display_name = display_name
        if (avatar_url !== undefined) updates.avatar_url = avatar_url
        if (banner_url !== undefined) updates.banner_url = banner_url
        if (bio !== undefined) updates.bio = bio
        if (genres !== undefined) updates.genres = genres
        if (twitter !== undefined) updates.twitter = twitter
        if (instagram !== undefined) updates.instagram = instagram
        if (facebook !== undefined) updates.facebook = facebook

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single()

        if (error) throw error
        return response.success(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * Helper: build stats for a given user ID
 */
async function buildUserStats(userId: string, requesterId?: string) {
    const [reactions, opinions, comments, watchlist, battles, followers, following] = await Promise.all([
        supabase.from('reactions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('opinions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('battle_votes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ])

    // Watchlist breakdown by status
    const { data: wlData } = await supabase
        .from('watchlist')
        .select('status')
        .eq('user_id', userId)

    const watchlistBreakdown: Record<string, number> = {}
    for (const row of wlData || []) {
        watchlistBreakdown[row.status] = (watchlistBreakdown[row.status] || 0) + 1
    }

    let is_following = false
    if (requesterId && requesterId !== userId) {
        const { data: followCheck } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', requesterId)
            .eq('following_id', userId)
            .single()
        is_following = !!followCheck
    }

    return {
        reactions_given: reactions.count ?? 0,
        opinions_posted: opinions.count ?? 0,
        comments_posted: comments.count ?? 0,
        watchlist_total: watchlist.count ?? 0,
        watchlist_breakdown: watchlistBreakdown,
        battles_voted: battles.count ?? 0,
        follower_count: followers.count ?? 0,
        following_count: following.count ?? 0,
        is_following
    }
}

/**
 * GET /api/v1/users/:username/stats
 */
export async function getUserStats(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.params
        const requesterId = req.user?.id

        // Resolve username → user id
        const { data: profile, error: pErr } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('username', username)
            .single()

        if (pErr || !profile) return response.failure(res, 404, 'not_found', 'User not found')

        const stats = await buildUserStats(profile.id, requesterId)
        return response.success(res, { username: profile.username, ...stats })
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/users/me/stats
 */
export async function getMyStats(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const stats = await buildUserStats(userId)
        return response.success(res, stats)
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/users/me/taste
 * Derives the user's top genres from their activity:
 *  - reactions on anime (weight: 2 per reaction)
 *  - watchlist entries   (weight: 3 per entry)
 *  - comments on anime  (weight: 1 per comment)
 * Returns { topGenres: string[], rankedGenres: { genre: string, score: number }[] }
 */
export async function getMyTaste(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const genreScore: Record<string, number> = {}

        const addGenres = (genres: string[] | null | undefined, weight: number) => {
            if (!Array.isArray(genres)) return
            for (const g of genres) {
                if (g) genreScore[g] = (genreScore[g] || 0) + weight
            }
        }

        // Reactions → join anime genres
        const { data: reactions } = await supabase
            .from('reactions')
            .select('anime:anime(genres)')
            .eq('user_id', userId)
            .limit(100)

        for (const r of reactions || []) {
            addGenres((r.anime as any)?.genres, 2)
        }

        // Watchlist → join anime genres
        const { data: watchlist } = await supabase
            .from('watchlist')
            .select('anime:anime(genres)')
            .eq('user_id', userId)
            .limit(200)

        for (const w of watchlist || []) {
            addGenres((w.anime as any)?.genres, 3)
        }

        // Comments on anime → join anime genres
        const { data: comments } = await supabase
            .from('comments')
            .select('anime:anime(genres)')
            .eq('user_id', userId)
            .not('anime_id', 'is', null)
            .limit(100)

        for (const c of comments || []) {
            addGenres((c.anime as any)?.genres, 1)
        }

        const ranked = Object.entries(genreScore)
            .sort((a, b) => b[1] - a[1])
            .map(([genre, score]) => ({ genre, score }))

        return response.success(res, {
            topGenres: ranked.slice(0, 5).map(r => r.genre),
            rankedGenres: ranked.slice(0, 10),
        })
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/users/:username/comments
 */
export async function getUserComments(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.params

        const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
        if (!profile) return response.failure(res, 404, 'not_found', 'User not found')

        const { data, error } = await supabase
            .from('comments')
            .select('*, anime:anime(*)')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return response.success(res, data || [])
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/users/:username/battles
 */
export async function getUserBattles(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.params

        const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
        if (!profile) return response.failure(res, 404, 'not_found', 'User not found')

        const { data, error } = await supabase
            .from('battle_votes')
            .select(`
                *,
                battle:battles(
                    *,
                    anime_a_rel:anime!battles_anime_a_fkey(*),
                    anime_b_rel:anime!battles_anime_b_fkey(*)
                )
            `)
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return response.success(res, data || [])
    } catch (err) {
        return next(err)
    }
}

/**
 * SOCIAL: Follow/Unfollow/Search
 */

export async function followUser(req: Request, res: Response, next: NextFunction) {
    try {
        const followerId = req.user?.id
        const { username } = req.params
        if (!followerId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
        if (!profile) return response.failure(res, 404, 'not_found', 'User not found')

        if (profile.id === followerId) return response.failure(res, 400, 'bad_request', 'Cannot follow yourself')

        const { error } = await supabase.from('follows').insert({
            follower_id: followerId,
            following_id: profile.id
        })

        if (error && error.code !== '23505') throw error // ignore duplicate key
        return response.success(res, { followed: true })
    } catch (err) {
        return next(err)
    }
}

export async function unfollowUser(req: Request, res: Response, next: NextFunction) {
    try {
        const followerId = req.user?.id
        const { username } = req.params
        if (!followerId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
        if (!profile) return response.failure(res, 404, 'not_found', 'User not found')

        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', profile.id)

        if (error) throw error
        return response.success(res, { unfollowed: true })
    } catch (err) {
        return next(err)
    }
}

export async function getFollowers(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.params
        const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
        if (!profile) return response.failure(res, 404, 'not_found', 'User not found')

        const { data, error } = await supabase
            .from('follows')
            .select(`
                created_at,
                profile:profiles!follows_follower_id_fkey(id, username, avatar_url, bio)
            `)
            .eq('following_id', profile.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return response.success(res, data?.map(f => f.profile) || [])
    } catch (err) {
        return next(err)
    }
}

export async function getFollowing(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.params
        const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
        if (!profile) return response.failure(res, 404, 'not_found', 'User not found')

        const { data, error } = await supabase
            .from('follows')
            .select(`
                created_at,
                profile:profiles!follows_following_id_fkey(id, username, avatar_url, bio)
            `)
            .eq('follower_id', profile.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return response.success(res, data?.map(f => f.profile) || [])
    } catch (err) {
        return next(err)
    }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const { q } = req.query
        if (!q) return response.success(res, [])

        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, bio')
            .ilike('username', `%${q}%`)
            .limit(10)

        if (error) throw error
        return response.success(res, data || [])
    } catch (err) {
        return next(err)
    }
}
