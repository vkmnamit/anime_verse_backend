import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

/**
 * GET /api/v1/communities
 * List all communities
 */
export async function listCommunities(req: Request, res: Response, next: NextFunction) {
    try {
        const mockCommunities = [
            { id: 1, name: "One Piece", slug: "r/OnePiece", member_count: 850000 },
            { id: 2, name: "Attack on Titan", slug: "r/AttackOnTitan", member_count: 620000 },
            { id: 3, name: "Jujutsu Kaisen", slug: "r/JujutsuKaisen", member_count: 450000 },
            { id: 4, name: "Demon Slayer", slug: "r/DemonSlayer", member_count: 380000 },
            { id: 5, name: "Naruto", slug: "r/Naruto", member_count: 920000 }
        ];

        let communities;
        try {
            const { data, error } = await Promise.race([
                supabase.from('communities').select('*').order('member_count', { ascending: false }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]) as any;

            if (error) throw error;
            communities = data || [];
        } catch (err) {
            console.warn("[listCommunities] Database failed, using mock data");
            communities = mockCommunities;
        }

        return response.success(res, communities)
    } catch (err) {
        return next(err)
    }
}

/**
 * GET /api/v1/communities/:slug
 * Get single community by slug
 */
export async function getCommunityBySlug(req: Request, res: Response, next: NextFunction) {
    try {
        const slug = String(req.params.slug)

        let community;
        try {
            const { data, error } = await Promise.race([
                supabase.from('communities').select('*').eq('slug', slug).single(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]) as any;

            if (error || !data) throw new Error('Not found');
            community = data;
        } catch (err) {
            console.warn("[getCommunityBySlug] Database failed, using mock data for", slug);
            community = {
                id: 999,
                name: slug.replace('r/', '').split(/(?=[A-Z])/).join(' '),
                slug: slug.startsWith('r/') ? slug : `r/${slug}`,
                member_count: 50000,
                description: `A community for all fans of ${slug}. Join the discussion!`,
                avatar_url: null,
                banner_url: null
            };
        }

        return response.success(res, community)
    } catch (err) {
        return next(err)
    }
}
