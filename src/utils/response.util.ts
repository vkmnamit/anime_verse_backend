import { Response } from 'express'

export type ApiMeta = {
    page?: number
    limit?: number
    total?: number
}

export function success<T = any>(res: Response, data: T, meta?: ApiMeta) {
    return res.status(200).json({ success: true, data, meta })
}

export function created<T = any>(res: Response, data: T, meta?: ApiMeta) {
    return res.status(201).json({ success: true, data, meta })
}

export function failure(res: Response, status: number, code: string, message: string, details?: any) {
    return res.status(status).json({
        success: false,
        error: {
            code,
            message,
            details,
        },
    })
}

export default { success, created, failure }
