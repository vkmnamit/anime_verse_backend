import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { optionalAuthMiddleware } from '../middlewares/optionalAuth.middleware'
import * as ReactionController from '../controllers/reaction.controller'

const router = Router()

router.post('/', authMiddleware, ReactionController.createOrUpdateReaction)
router.get('/anime/:animeId', optionalAuthMiddleware, ReactionController.getReactionsForAnime)
router.get('/me/:animeId', authMiddleware, ReactionController.getMyReaction)
router.delete('/:animeId', authMiddleware, ReactionController.removeReaction)

export default router