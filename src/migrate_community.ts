import './loadEnv'
import { getServiceSupabase } from './config/supabase.config'

/**
 * Auto-provision community tables if they don't exist.
 * Tables: community_posts, post_comments, post_likes, comment_likes
 */
async function migrate() {
    const sb = getServiceSupabase()

    console.log('🚀 Running community tables migration...\n')

    // Check which tables already exist
    const tables = ['community_posts', 'post_comments', 'post_likes', 'comment_likes']
    const status: Record<string, boolean> = {}

    for (const t of tables) {
        const { error } = await sb.from(t).select('*').limit(0)
        status[t] = !error
        console.log(`  ${!error ? '✅' : '❌'} ${t}: ${!error ? 'EXISTS' : error.message}`)
    }

    // If all tables exist, nothing to do
    if (tables.every(t => status[t])) {
        console.log('\n✅ All community tables already exist. Nothing to migrate.')
        process.exit(0)
    }

    console.log('\n⚠️  Some tables are missing. Please run the SQL migration in your Supabase dashboard:')
    console.log('   File: backend/src/seeds/migrate_community.sql')
    console.log('\n   Steps:')
    console.log('   1. Go to your Supabase dashboard → SQL Editor')
    console.log('   2. Copy-paste the contents of migrate_community.sql')
    console.log('   3. Click "Run"')
    console.log('   4. Restart the backend server')
    console.log('')

    // Try to create tables via RPC if possible
    console.log('🔄 Attempting auto-provision via Supabase...\n')

    // Try creating community_posts
    if (!status['community_posts']) {
        try {
            const { error } = await sb.rpc('exec_sql', {
                sql: `CREATE TABLE IF NOT EXISTS community_posts (
                    id BIGSERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    content TEXT,
                    image_url TEXT,
                    community_id BIGINT,
                    community_name TEXT,
                    community_slug TEXT,
                    user_id UUID,
                    username TEXT,
                    avatar_url TEXT,
                    is_spoiler BOOLEAN DEFAULT FALSE,
                    meta_tag TEXT,
                    votes INTEGER DEFAULT 0,
                    comment_count INTEGER DEFAULT 0,
                    share_count INTEGER DEFAULT 0,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );`
            })
            if (error) throw error
            console.log('  ✅ Created community_posts')
        } catch (e: any) {
            console.log('  ⚠️  Could not auto-create community_posts:', e.message || 'RPC not available')
        }
    }

    if (!status['post_comments']) {
        try {
            const { error } = await sb.rpc('exec_sql', {
                sql: `CREATE TABLE IF NOT EXISTS post_comments (
                    id BIGSERIAL PRIMARY KEY,
                    post_id BIGINT NOT NULL,
                    user_id UUID,
                    parent_id BIGINT,
                    content TEXT NOT NULL,
                    username TEXT,
                    avatar_url TEXT,
                    likes INTEGER DEFAULT 0,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );`
            })
            if (error) throw error
            console.log('  ✅ Created post_comments')
        } catch (e: any) {
            console.log('  ⚠️  Could not auto-create post_comments:', e.message || 'RPC not available')
        }
    }

    if (!status['post_likes']) {
        try {
            const { error } = await sb.rpc('exec_sql', {
                sql: `CREATE TABLE IF NOT EXISTS post_likes (
                    id BIGSERIAL PRIMARY KEY,
                    post_id BIGINT NOT NULL,
                    user_id UUID NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(post_id, user_id)
                );`
            })
            if (error) throw error
            console.log('  ✅ Created post_likes')
        } catch (e: any) {
            console.log('  ⚠️  Could not auto-create post_likes:', e.message || 'RPC not available')
        }
    }

    if (!status['comment_likes']) {
        try {
            const { error } = await sb.rpc('exec_sql', {
                sql: `CREATE TABLE IF NOT EXISTS comment_likes (
                    id BIGSERIAL PRIMARY KEY,
                    comment_id BIGINT NOT NULL,
                    user_id UUID NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(comment_id, user_id)
                );`
            })
            if (error) throw error
            console.log('  ✅ Created comment_likes')
        } catch (e: any) {
            console.log('  ⚠️  Could not auto-create comment_likes:', e.message || 'RPC not available')
        }
    }

    console.log('\n🏁 Migration attempt complete. Re-checking...\n')

    for (const t of tables) {
        const { error } = await sb.from(t).select('*').limit(0)
        console.log(`  ${!error ? '✅' : '❌'} ${t}: ${!error ? 'READY' : 'STILL MISSING - run SQL manually'}`)
    }

    process.exit(0)
}

migrate().catch(err => {
    console.error('Migration failed:', err)
    process.exit(1)
})
