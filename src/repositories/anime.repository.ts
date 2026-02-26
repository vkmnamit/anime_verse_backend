/**
 * Minimal repository layer for anime. It expects a Supabase-like client to be injected
 * so the repository doesn't hard-depend on a specific DB driver.
 */

export async function fetchList(params: { page: number; limit: number; offset: number; sort?: string | null; filters?: any }, opts: { supabase?: any } = {}) {
    const { supabase } = opts
    if (!supabase) {
        // fallback / mock: return empty set
        return { items: [], total: 0 }
    }

    try {
        const { limit, offset, filters } = params
        let query = supabase.from('anime').select('*', { count: 'exact' }).range(offset, offset + limit - 1)
        if (filters && filters.genre) {
            query = query.eq('genre', filters.genre)
        }
        if (filters && filters.status) {
            query = query.eq('status', filters.status)
        }

        const { data, error, count } = await query
        if (error) throw error
        return { items: data || [], total: count || (data ? data.length : 0) }
    } catch (err) {
        console.warn('fetchList repo error', err)
        return { items: [], total: 0 }
    }
}

export async function getById(id: string | number, opts: { supabase?: any } = {}) {
    const { supabase } = opts
    if (!supabase) return null
    try {
        const { data, error } = await supabase.from('anime').select('*').eq('id', id).single()
        if (error) throw error
        return data
    } catch (err) {
        console.warn('getById repo error', err)
        return null
    }
}

export async function search(q: string, pager: { page: number; limit: number }, opts: { supabase?: any } = {}) {
    const { supabase } = opts
    if (!supabase) return { items: [], total: 0 }
    try {
        const offset = (pager.page - 1) * pager.limit
        const { data, error, count } = await supabase
            .from('anime')
            .select('*', { count: 'exact' })
            .textSearch('title', q)
            .range(offset, offset + pager.limit - 1)

        if (error) throw error
        return { items: data || [], total: count || (data ? data.length : 0) }
    } catch (err) {
        console.warn('search repo error', err)
        return { items: [], total: 0 }
    }
}

export default { fetchList, getById, search }

