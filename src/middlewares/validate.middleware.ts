import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/errors.util'


type ValidatorFn = (req: Request) => string[]

export function validate(validatorFn: ValidatorFn) {
    return function validateMiddleware(req: Request, _res: Response, next: NextFunction) {
        const errors = validatorFn(req)
        if (errors.length > 0) {
            return next(new ApiError(400, 'validation_error', 'Validation failed', errors))
        }
        return next()
    }
}

// ─── Common validators (reusable across routes) ──────────────────────

export function validateReaction(req: Request): string[] {
    const errors: string[] = []
    if (!req.body.anime_id) errors.push('anime_id is required')
    if (!req.body.reaction_type) errors.push('reaction_type is required')
    const allowed = ['masterpiece', 'great', 'good', 'mid', 'bad', 'overrated', 'underrated']
    if (req.body.reaction_type && !allowed.includes(req.body.reaction_type)) {
        errors.push(`reaction_type must be one of: ${allowed.join(', ')}`)
    }
    return errors
}

export function validateOpinion(req: Request): string[] {
    const errors: string[] = []
    if (!req.body.anime_id) errors.push('anime_id is required')
    if (!req.body.content) errors.push('content is required')
    if (req.body.content && req.body.content.length > 500) errors.push('content must be 500 characters or less')
    return errors
}

export function validateComment(req: Request): string[] {
    const errors: string[] = []
    if (!req.body.anime_id) errors.push('anime_id is required')
    if (!req.body.content) errors.push('content is required')
    if (req.body.content && req.body.content.length > 2000) errors.push('content must be 2000 characters or less')
    return errors
}

export function validateVote(req: Request): string[] {
    const errors: string[] = []
    if (req.body.vote === undefined || req.body.vote === null) errors.push('vote is required')
    if (![1, -1].includes(Number(req.body.vote))) errors.push('vote must be 1 or -1')
    return errors
}

export function validateBattle(req: Request): string[] {
    const errors: string[] = []
    if (!req.body.anime_a) errors.push('anime_a is required')
    if (!req.body.anime_b) errors.push('anime_b is required')
    if (req.body.anime_a && req.body.anime_b && req.body.anime_a === req.body.anime_b) {
        errors.push('anime_a and anime_b must be different')
    }
    return errors
}

export function validateBattleVote(req: Request): string[] {
    const errors: string[] = []
    if (!req.body.vote_for) errors.push('vote_for is required')
    if (req.body.vote_for && !['A', 'B'].includes(req.body.vote_for)) {
        errors.push('vote_for must be "A" or "B"')
    }
    return errors
}

export function validateWatchlist(req: Request): string[] {
    const errors: string[] = []
    if (!req.body.anime_id) errors.push('anime_id is required')
    if (!req.body.status) errors.push('status is required')
    const allowed = ['watching', 'completed', 'plan_to_watch', 'dropped', 'on_hold']
    if (req.body.status && !allowed.includes(req.body.status)) {
        errors.push(`status must be one of: ${allowed.join(', ')}`)
    }
    return errors
}

export function validateProfileUpdate(req: Request): string[] {
    const errors: string[] = []
    if (!req.body.bio && !req.body.avatar_url && !req.body.username) {
        errors.push('At least one field (bio, avatar_url, username) is required')
    }
    if (req.body.bio && req.body.bio.length > 300) errors.push('bio must be 300 characters or less')
    if (req.body.username && req.body.username.length < 3) errors.push('username must be at least 3 characters')
    return errors
}

// ─── Convenience object for routes ─────────────────────────────────
// Usage in routes: import { v } from '...'; router.post('/', auth, v.reaction, handler)
export const v = {
    reaction: validate(validateReaction),
    opinion: validate(validateOpinion),
    comment: validate(validateComment),
    vote: validate(validateVote),
    battle: validate(validateBattle),
    battleVote: validate(validateBattleVote),
    watchlist: validate(validateWatchlist),
    profileUpdate: validate(validateProfileUpdate),
}

export default validate
