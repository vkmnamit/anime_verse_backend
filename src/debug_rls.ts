import './loadEnv'
import { getServiceSupabase, getSupabase } from './config/supabase.config'

async function debug() {
    console.log('SERVICE_KEY exists:', Boolean(process.env.SUPABASE_SERVICE_KEY))
    console.log('SERVICE_KEY prefix:', (process.env.SUPABASE_SERVICE_KEY || '').substring(0, 12))

    const service = getServiceSupabase()
    const anon = getSupabase()

    // Test with service role
    const r1 = await service.from('profiles').select('username').eq('id', '0a58a6b8-b29b-4f49-8a29-def4fea608ee').single()
    console.log('SERVICE read:', r1.data, r1.error?.message || 'no error')

    // Test with anon
    const r2 = await anon.from('profiles').select('username').eq('id', '0a58a6b8-b29b-4f49-8a29-def4fea608ee').single()
    console.log('ANON read:', r2.data, r2.error?.message || 'no error')

    process.exit(0)
}
debug()
