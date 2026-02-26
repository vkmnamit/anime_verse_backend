import './loadEnv'
import { getServiceSupabase } from './config/supabase.config'

async function check() {
    const sb = getServiceSupabase()

    const tables = ['profiles', 'anime', 'reactions', 'opinions', 'opinion_votes', 'comments', 'watchlist', 'battles', 'battle_votes', 'notifications']

    for (const t of tables) {
        const { data, error } = await sb.from(t).select('*').limit(0)
        if (error) {
            console.log('X ' + t + ': ' + error.message)
        } else {
            console.log('OK ' + t)
        }
    }

    // Check comments columns
    const { data: comment, error: cErr } = await sb.from('comments').select('*').limit(1)
    console.log('\ncomments sample:', JSON.stringify(comment), cErr ? cErr.message : 'no error')

    // Try selecting parent_id specifically
    const { error: pidErr } = await sb.from('comments').select('parent_id').limit(1)
    console.log('comments parent_id column:', pidErr ? 'MISSING - ' + pidErr.message : 'EXISTS')

    // Check battle_votes
    const { error: bvErr } = await sb.from('battle_votes').select('*').limit(1)
    console.log('battle_votes:', bvErr ? 'ERROR - ' + bvErr.message : 'OK')

    process.exit(0)
}
check()
