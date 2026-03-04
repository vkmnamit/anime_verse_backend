import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { parsePagination, buildMeta } from '../utils/pagination.util'
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

        const postData: any = {
            title: title.trim(),
            content: content?.trim() || null,
            image_url: image_url || null,
            community_id: community_id || null,
            community_name: community_name || null,
            is_spoiler: is_spoiler || false,
            meta_tag: meta_tag || null,
            user_id: userId,
            username,
            avatar_url,
            votes: 0,
            comment_count: 0,
            share_count: 0,
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
 * Get comments for a specific post (includes replies via parent_id)
 */
export async function getPostComments(req: Request, res: Response, next: NextFunction) {
    try {
        const postId = req.params.id

        let comments: any[] = [];
        try {
            const { data, error } = await supabase
                .from('post_comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true })

            if (error) throw error
            comments = data || []
        } catch {
            comments = []
        }

        // Build a tree: top-level comments + replies nested
        const topLevel: any[] = []
        const byId: Record<string, any> = {}

        for (const c of comments) {
            c.replies = []
            byId[c.id] = c
        }

        for (const c of comments) {
            if (c.parent_id && byId[c.parent_id]) {
                byId[c.parent_id].replies.push(c)
            } else {
                topLevel.push(c)
            }
        }

        return response.success(res, topLevel)
    } catch (err) {
        return next(err)
    }
}

/**
 * POST /api/v1/posts/:id/comment
 * Add a comment (or reply) to a post
 * Body: { content, parent_id? }
 */
export async function addPostComment(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const postId = req.params.id
        const { content, parent_id } = req.body

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

        const insertData: any = {
            post_id: postId,
            user_id: userId,
            content: content.trim(),
            username,
            avatar_url,
            parent_id: parent_id || null,
            likes: 0,
        }

        const { data, error } = await supabase
            .from('post_comments')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error

        // Increment comment count on the post
        try {
            await supabase.rpc('increment_post_comment_count', { post_id_input: Number(postId) })
        } catch {
            // Manual fallback
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

        return response.created(res, { ...data, replies: [] })
    } catch (err) {
        return next(err)
    }
}

/**
 * DELETE /api/v1/posts/comments/:commentId
 * Delete a comment (only by owner)
 */
export async function deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const commentId = req.params.commentId

        // Check ownership
        const { data: comment, error: findErr } = await supabase
            .from('post_comments')
            .select('id, post_id, user_id')
            .eq('id', commentId)
            .single()

        if (findErr || !comment) {
            return response.failure(res, 404, 'not_found', 'Comment not found')
        }

        if (comment.user_id !== userId) {
            return response.failure(res, 403, 'forbidden', 'You can only delete your own comments')
        }

        const { error: delErr } = await supabase
            .from('post_comments')
            .delete()
            .eq('id', commentId)

        if (delErr) throw delErr

        // Decrement comment count
        try {
            await supabase.rpc('decrement_post_comment_count', { post_id_input: Number(comment.post_id) })
        } catch {
            try {
                const { data: post } = await supabase
                    .from('community_posts')
                    .select('comment_count')
                    .eq('id', comment.post_id)
                    .single()
                if (post) {
                    await supabase
                        .from('community_posts')
                        .update({ comment_count: Math.max((post.comment_count || 0) - 1, 0) })
                        .eq('id', comment.post_id)
                }
            } catch { }
        }

        return response.success(res, { deleted: true })
    } catch (err) {
        return next(err)
    }
}

/**
 * POST /api/v1/posts/:id/like
 * Toggle like for a post (current user). Updates vote count.
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

            // Decrement votes
            try {
                await supabase.rpc('decrement_post_votes', { post_id_input: Number(postId) })
            } catch {
                try {
                    const { data: post } = await supabase
                        .from('community_posts')
                        .select('votes')
                        .eq('id', postId)
                        .single()
                    if (post) {
                        await supabase
                            .from('community_posts')
                            .update({ votes: Math.max((post.votes || 0) - 1, 0) })
                            .eq('id', postId)
                    }
                } catch { }
            }

            return response.success(res, { liked: false })
        } else {
            // Add like
            const { error: addErr } = await supabase
                .from('post_likes')
                .insert({ user_id: userId, post_id: postId })

            if (addErr) throw addErr

            // Increment votes
            try {
                await supabase.rpc('increment_post_votes', { post_id_input: Number(postId) })
            } catch {
                try {
                    const { data: post } = await supabase
                        .from('community_posts')
                        .select('votes')
                        .eq('id', postId)
                        .single()
                    if (post) {
                        await supabase
                            .from('community_posts')
                            .update({ votes: (post.votes || 0) + 1 })
                            .eq('id', postId)
                    }
                } catch { }
            }

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
 * POST /api/v1/posts/comments/:commentId/like
 * Toggle like on a comment
 */
export async function toggleCommentLike(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const commentId = req.params.commentId

        const { data: existing, error: fetchErr } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('user_id', userId)
            .eq('comment_id', commentId)
            .maybeSingle()

        if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr

        if (existing) {
            const { error: delErr } = await supabase
                .from('comment_likes')
                .delete()
                .eq('id', existing.id)
            if (delErr) throw delErr

            // Decrement comment likes
            try {
                await supabase.rpc('decrement_comment_likes', { comment_id_input: Number(commentId) })
            } catch {
                try {
                    const { data: c } = await supabase.from('post_comments').select('likes').eq('id', commentId).single()
                    if (c) await supabase.from('post_comments').update({ likes: Math.max((c.likes || 0) - 1, 0) }).eq('id', commentId)
                } catch { }
            }

            return response.success(res, { liked: false })
        } else {
            const { error: addErr } = await supabase
                .from('comment_likes')
                .insert({ user_id: userId, comment_id: commentId })
            if (addErr) throw addErr

            // Increment comment likes
            try {
                await supabase.rpc('increment_comment_likes', { comment_id_input: Number(commentId) })
            } catch {
                try {
                    const { data: c } = await supabase.from('post_comments').select('likes').eq('id', commentId).single()
                    if (c) await supabase.from('post_comments').update({ likes: (c.likes || 0) + 1 }).eq('id', commentId)
                } catch { }
            }

            return response.success(res, { liked: true })
        }
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/posts/comments/likes/me
 * Get list of comment IDs the current user has liked
 */
export async function getMyLikedComments(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id
        if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

        const { data, error } = await supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', userId)

        if (error) throw error
        return response.success(res, data.map((d: any) => d.comment_id))
    } catch (err) {
        return next(err)
    }
}

/**
 * POST /api/v1/posts/:id/share
 * Track a share action on a post (increments share_count)
 */
export async function trackPostShare(req: Request, res: Response, next: NextFunction) {
    try {
        const postId = req.params.id

        try {
            await supabase.rpc('increment_post_share_count', { post_id_input: Number(postId) })
        } catch {
            try {
                const { data: post } = await supabase.from('community_posts').select('share_count').eq('id', postId).single()
                if (post) {
                    await supabase.from('community_posts').update({ share_count: (post.share_count || 0) + 1 }).eq('id', postId)
                }
            } catch { }
        }

        return response.success(res, { shared: true })
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
        const { page, limit, offset } = parsePagination(req.query as any);

        let query = supabase
            .from('community_posts')
            .select('*', { count: 'exact' });

        // We will sort in memory or sort by created at if looking at specific
        if (community || slug) {
            query = query.order('created_at', { ascending: false });
        }

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
                share_count: 120,
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
                share_count: 340,
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
                share_count: 55,
                created_at: new Date().toISOString(),
                meta_tag: "Anime"
            }
        ];

        query = query.range(offset, offset + limit - 1);

        let posts;
        let totalCount = 0;
        try {
            console.log(`📡 [getPosts] Querying posts for slug: ${slug || 'HOME'}, page: ${page}`);

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

            const { data, error, count } = await Promise.race([
                resolvedSlugQuery,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500))
            ]) as any;

            if (error) throw error;
            posts = data || [];
            totalCount = count || 0;
        } catch (err) {
            console.warn("⚠️  [getPosts] Database slow or failed, using mock data instantly");
            posts = mockPosts.slice(offset, offset + limit);
            totalCount = mockPosts.length;
        }

        if (!slug && !community) {
            // Shuffle for fresh home feed
            posts = posts.sort(() => Math.random() - 0.5);
        }

        console.log(`[getPosts] Returning ${posts.length} posts`);
        return response.success(res, posts, buildMeta(totalCount, page, limit));
    } catch (err) {
        return next(err);
    }
}
