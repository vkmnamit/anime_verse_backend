import { Request, Response, NextFunction } from 'express'
import response from './response.util'

export class ApiError extends Error {
    statusCode: number
    code: string
    details?: any

    constructor(statusCode: number, code: string, message: string, details?: any) {
        super(message)
        this.statusCode = statusCode
        this.code = code
        this.details = details
        Error.captureStackTrace(this, this.constructor)
    }
}

export function notFoundHandler(req: Request, res: Response) {
    return response.failure(res, 404, 'not_found', 'Resource not found')
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    if (res.headersSent) {
        return next(err)
    }

    if (err instanceof ApiError) {
        return response.failure(res, err.statusCode, err.code, err.message, err.details)
    }

    // fallback
    console.error(err)
    return response.failure(res, 500, 'internal_error', 'An unexpected error occurred')
}

export default { ApiError, notFoundHandler, errorHandler }
