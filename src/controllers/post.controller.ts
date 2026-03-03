import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * POST /api/v1/posts
 * Create a new community post
 */
export async function createPost(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { title, content, image_url, community_id, community_name, is_spoiler, meta_tag } = req.body

        if (!title || title.trim().length === 0) {
            return response.failure(res, 400, 'validation', 'Title is required')
        }

        const postData: any = {
            title: title.trim(),
            content: content?.trim() || null,
            image_url: image_url || null,
            community_id: community_id || null,
            community_name: community_name || null,
            is_spoiler: is_spoiler || false,
            meta_tag: meta_tag || null,
            user_id: userId,
            votes: 0,
            comment_count: 0,
        }

        const { data, error } = await supabase
            .from('community_posts')
            .insert(postData)
            .select()
            .single()

        if (error) throw error
        return response.created(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/posts/:id/comments
 * Get comments for a specific post
 */
export async function getPostComments(req: Request, res: Response, next: NextFunction) {
    try {
        const postId = req.params.id

        let comments;
        try {
            const { data, error } = await supabase
                .from('post_comments')
                .select('*, profiles(username, avatar_url)')
                .eq('post_id', postId)
                .order('created_at', { ascending: false })

            if (error) throw error
            comments = data || []
        } catch {
            comments = []
        }

        return response.success(res, comments)
    } catch (err) {
        return next(err)
    }
}

/**
 * POST /api/v1/posts/:id/comment
 * Add a comment to a post
 */
export async function addPostComment(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const postId = req.params.id
        const { content } = req.body

        if (!content || content.trim().length === 0) {
            return response.failure(res, 400, 'validation', 'Comment content is required')
        }

        // Get user profile
        let username = 'Anonymous'
        let avatar_url = null
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', userId)
                .single()
            if (profile) {
                username = profile.username || 'Anonymous'
                avatar_url = profile.avatar_url
            }
        } catch { }

        const { data, error } = await supabase
            .from('post_comments')
            .insert({
                post_id: postId,
                user_id: userId,
                content: content.trim(),
                username,
                avatar_url
            })
            .select()
            .single()

        if (error) throw error

        // Increment comment count on the post
        try {
            await supabase.rpc('increment_post_comment_count', { post_id_input: postId })
        } catch {
            // If RPC doesn't exist, try manual update
            try {
                const { data: post } = await supabase
                    .from('community_posts')
                    .select('comment_count')
                    .eq('id', postId)
                    .single()
                if (post) {
                    await supabase
                        .from('community_posts')
                        .update({ comment_count: (post.comment_count || 0) + 1 })
                        .eq('id', postId)
                }
            } catch { }
        }

        return response.created(res, data)
    } catch (err) {
        return next(err)
    }
}

/**
 * POST /api/v1/posts/:id/like
 * Toggle like for a post (current user)
 */
export async function togglePostLike(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const postId = req.params.id

        // Check if like already exists
        const { data: existing, error: fetchErr } = await supabase
            .from('post_likes')
            .select('id')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .maybeSingle()

        if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr

        if (existing) {
            // Remove like
            const { error: delErr } = await supabase
                .from('post_likes')
                .delete()
                .eq('id', existing.id)

            if (delErr) throw delErr
            return response.success(res, { liked: false })
        } else {
            // Add like
            const { error: addErr } = await supabase
                .from('post_likes')
                .insert({ user_id: userId, post_id: postId })

            if (addErr) throw addErr
            return response.success(res, { liked: true })
        }
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/posts/likes/me
 * Get a list of post IDs the current user has liked
 */
export async function getMyLikedPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { data, error } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', userId)

        if (error) throw error
        return response.success(res, data.map((d: any) => d.post_id))
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/posts
 * Fetch all community posts
 */
export async function getPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const { community, slug } = req.query;
        let query = supabase
            .from('community_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (community) {
            query = query.eq('community_id', community);
        }

        // Define mock data as fallback
        const mockPosts = [
            {
                id: 1,
                title: "One Piece Chapter 1110 Discussion",
                content: "What a crazy chapter! The Gorosei are terrifying.",
                image_url: "https://images.unsplash.com/photo-1578632738981-433069410217",
                community_name: "r/OnePiece",
                votes: 4500,
                comment_count: 520,
                created_at: new Date().toISOString(),
                meta_tag: "Discussion"
            },
            {
                id: 2,
                title: "Gojo vs Sukuna: Final Thoughts",
                content: "It has been an incredible ride. Who do you think actually won?",
                image_url: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa",
                community_name: "r/JujutsuKaisen",
                votes: 8200,
                comment_count: 1240,
                created_at: new Date().toISOString(),
                meta_tag: "Theories"
            },
            {
                id: 3,
                title: "Solo Leveling Episode 12 Hype!",
                content: "The animation in the latest episode was on another level.",
                image_url: "https://images.unsplash.com/photo-1541562232579-512a21359920",
                community_name: "r/SoloLeveling",
                votes: 3100,
                comment_count: 180,
                created_at: new Date().toISOString(),
                meta_tag: "Anime"
            }
        ];

        let posts;
        try {
            console.log(`📡 [getPosts] Querying posts for slug: ${slug || 'HOME'}`);

            // Protect against slow community ID lookup
            let resolvedSlugQuery = query;
            if (slug) {
                const slugStr = String(slug);
                const formattedSlug = slugStr.startsWith('r/') ? slugStr : `r/${slugStr}`;

                const commRes = await Promise.race([
                    supabase.from('communities').select('id').or(`slug.eq.${slugStr},slug.eq.${formattedSlug}`).maybeSingle(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500))
                ]) as any;

                if (commRes.data) {
                    resolvedSlugQuery = resolvedSlugQuery.or(`community_id.eq.${commRes.data.id},community_name.eq.${formattedSlug}`);
                } else {
                    resolvedSlugQuery = resolvedSlugQuery.eq('community_name', formattedSlug);
                }
            }

            // Main posts query with timeout
            const { data, error } = await Promise.race([
                resolvedSlugQuery,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500))
            ]) as any;

            if (error) throw error;
            posts = data || [];
        } catch (err) {
            console.warn("⚠️  [getPosts] Database slow or failed, using mock data instantly");
            posts = mockPosts;
        }

        console.log(`[getPosts] Returning ${posts.length} posts`);
        return response.success(res, posts);
    } catch (err) {
        return next(err);
    }
}
