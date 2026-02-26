import  {Router} from 'express'
import { optionalAuthMiddleware } from '../middlewares/optionalAuth.middleware'
import * as ReactionController from '../controllers/reaction.controller'

const router = Router()

router.post('/', optionalAuthMiddleware, ReactionController.createOrUpdateReaction)
router.get('/anime/:animeId', optionalAuthMiddleware, ReactionController.getReactionsForAnime)

export default router