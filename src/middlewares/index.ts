/**
 * Middleware barrel file — import everything from one place.
 *
 * Usage in routes or app.ts:
 *   import { authMiddleware, optionalAuthMiddleware, rateLimit, validate, errorMiddleware, notFound } from '../middlewares'
 */

export { authMiddleware } from './auth.middleware'
export { optionalAuthMiddleware } from './optionalAuth.middleware'
export { errorMiddleware, notFound, ApiError } from './error.middleware'
export { rateLimit } from './rateLimit.middleware'
export {
    validate,
    validateReaction,
    validateOpinion,
    validateComment,
    validateVote,
    validateBattle,
    validateBattleVote,
    validateWatchlist,
    validateProfileUpdate,
} from './validate.middleware'
