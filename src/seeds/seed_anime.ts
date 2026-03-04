import { getServiceSupabase } from '../config/supabase.config';
import '../loadEnv';

const supabase = getServiceSupabase();
const KITSU_BASE = 'https://kitsu.io/api/edge';

async function fetchAnimeFromKitsu(category: string | null = null, limit = 20) {
    let url = `${KITSU_BASE}/anime?page[limit]=${limit}&sort=-userCount`;
    if (category) {
        url += `&filter[categories]=${category}`;
    }

    console.log(`Fetching: ${url}`);
    const res = await fetch(url, { headers: { Accept: 'application/vnd.api+json' } });
    if (!res.ok) {
        console.error(`Fetch failed: ${res.status} ${res.statusText}`);
        return [];
    }

    const json: any = await res.json();
    return (json.data || []).map((a: any) => ({
        id: a.id,
        api_id: a.id,
        title: a.attributes.canonicalTitle,
        synopsis: a.attributes.synopsis,
        cover_image: a.attributes.posterImage?.large || a.attributes.posterImage?.medium,
        banner_image: a.attributes.coverImage?.large || a.attributes.coverImage?.original,
        episodes: a.attributes.episodeCount,
        status: a.attributes.status,
        average_score: a.attributes.averageRating ? parseFloat(a.attributes.averageRating) : null,
        popularity: a.attributes.userCount || 0,
        genres: []
    }));
}

async function fetchCategories(animeId: string) {
    try {
        const res = await fetch(`${KITSU_BASE}/anime/${animeId}/categories?fields[categories]=title`, { headers: { Accept: 'application/vnd.api+json' } });
        if (!res.ok) return [];
        const json: any = await res.json();
        return (json.data || []).map((c: any) => c.attributes.title);
    } catch {
        return [];
    }
}

async function seed() {
    console.log('Fetching anime from Kitsu...');

    const animeToSeed = await fetchAnimeFromKitsu(null, 20);

    console.log(`Fetched ${animeToSeed.length} anime. Enriching with categories...`);

    for (const anime of animeToSeed) {
        anime.genres = await fetchCategories(anime.id);

        const { data: existing } = await supabase
            .from('anime')
            .select('id')
            .eq('title', anime.title)
            .maybeSingle();

        if (existing) {
            console.log(`Skipping: ${anime.title} (already exists)`);
            continue;
        }

        const payload = {
            api_id: anime.api_id,
            title: anime.title,
            synopsis: anime.synopsis,
            cover_image: anime.cover_image,
            banner_image: anime.banner_image,
            episodes: anime.episodes,
            status: anime.status,
            average_score: anime.average_score,
            popularity: anime.popularity,
            genres: anime.genres
        };

        const { error } = await supabase
            .from('anime')
            .insert(payload);

        if (error) {
            console.error(`Failed to seed ${anime.title}:`, error.message);
        } else {
            console.log(`Seeded: ${anime.title}`);
        }
    }

    console.log('Seeding complete!');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
