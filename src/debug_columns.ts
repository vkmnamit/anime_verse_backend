import './loadEnv'
import { getServiceSupabase } from './config/supabase.config'

async function check() {
    const sb = getServiceSupabase()
    const { data, error } = await sb.from('profiles').select('*').limit(1)
    if (data && data.length > 0) {
        console.log('Profiles columns:', Object.keys(data[0]))
    } else {
        console.log('No profiles data found or error:', error?.message)
    }
    process.exit(0)
}
check()
