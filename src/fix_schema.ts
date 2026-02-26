import './loadEnv'
import { getServiceSupabase } from './config/supabase.config'

async function fixSchema() {
    const sb = getServiceSupabase()

    // Add parent_id column to comments table
    const { error } = await sb.rpc('exec_sql', {
        sql: 'ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE;'
    })

    if (error) {
        console.log('RPC not available, trying raw query approach...')
        // If rpc doesn't work, we'll need to do it from Supabase dashboard
        console.log('Please run this SQL in your Supabase SQL Editor:')
        console.log('ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE;')
    } else {
        console.log('OK: parent_id column added to comments')
    }

    process.exit(0)
}
fixSchema()
