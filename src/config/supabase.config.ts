import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

/**
 * Get the Supabase client (lazy singleton).
 * Safe to call anywhere — env vars are read on first call.
 */
export function getSupabase(): SupabaseClient {
    if (_supabase) return _supabase

    const url = process.env.SUPABASE_URL || ''
    const anonKey = process.env.SUPABASE_ANON_KEY || ''

    if (!url || !anonKey) {
        throw new Error(
            'Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
            'Copy .env.example → .env and fill in your Supabase credentials.'
        )
    }

    _supabase = createClient(url, anonKey)
    return _supabase
}

/** Alias kept for backwards compat — but calls getSupabase() under the hood */
export { getSupabase as supabase }

let _serviceSupabase: SupabaseClient | null = null

/**
 * Get a service-role Supabase client (bypasses RLS).
 * Use for all server-side reads/writes.
 * Falls back to anon client if no service key is set.
 */
export function getServiceSupabase(): SupabaseClient {
    if (_serviceSupabase) return _serviceSupabase

    const url = process.env.SUPABASE_URL || ''
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || ''

    if (!url || !serviceKey) {
        console.warn('[supabase] No service key — falling back to anon client (RLS active)')
        return getSupabase()
    }

    _serviceSupabase = createClient(url, serviceKey)
    return _serviceSupabase
}

export function createServiceRoleClient(): SupabaseClient | null {
    const url = process.env.SUPABASE_URL || ''
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || ''

    if (!url || !serviceKey) {
        console.warn('Supabase URL or Service Key is missing.')
        return null
    }
    return createClient(url, serviceKey)
}
