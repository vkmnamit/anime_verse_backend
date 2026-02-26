// no imports needed

export type Pagination = {
    page: number
    limit: number
    offset: number
    sort?: string | null
    filters?: Record<string, any>
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export function parsePagination(query: Record<string, any>): Pagination {
    const page = Math.max(1, parseInt((query.page as string) || '1', 10) || 1)
    let limit = Math.max(1, parseInt((query.limit as string) || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    if (limit > MAX_LIMIT) limit = MAX_LIMIT
    const offset = (page - 1) * limit

    const sort = (query.sort as string) || null

    const filters: Record<string, any> = {}
    // extract common filters (genre, status, q etc.) - keep flexible
    if (query.genre) filters.genre = query.genre
    if (query.status) filters.status = query.status
    if (query.q) filters.q = query.q

    return { page, limit, offset, sort, filters }
}

export function buildMeta(total: number, page: number, limit: number) {
    return { total, page, limit }
}

export default { parsePagination, buildMeta }
