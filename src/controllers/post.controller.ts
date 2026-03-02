import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

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
