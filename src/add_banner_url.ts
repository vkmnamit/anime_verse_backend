import './loadEnv'
import { getServiceSupabase } from './config/supabase.config'

async function migrate() {
    const sb = getServiceSupabase()

    console.log('Checking if banner_url column exists...')

    // Try selecting banner_url to see if it exists
    const { error: checkErr } = await sb.from('profiles').select('banner_url').limit(1)

    if (!checkErr) {
        console.log('✅ banner_url column already exists — nothing to do.')
        process.exit(0)
    }

    console.log('banner_url not found:', checkErr.message)
    console.log('Adding banner_url column via SQL...')

    // Use the Supabase REST API to run raw SQL (requires service role)
    const url = process.env.SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
            sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT NULL;'
        })
    })

    if (res.ok) {
        console.log('✅ banner_url column added successfully!')
    } else {
        const body = await res.text()
        console.error('❌ Failed via RPC. Please run this manually in your Supabase SQL Editor:')
        console.error('')
        console.error('  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT NULL;')
        console.error('')
        console.error('Response:', body)
    }

    process.exit(0)
}

migrate()
