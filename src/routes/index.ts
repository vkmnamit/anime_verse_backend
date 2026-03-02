import { Router } from 'express'

import authRoutes from './auth.routes'
import animeRoutes from './anime.routes'
import reactionRoutes from './reaction.routes'
import opinionRoutes from './opinion.routes'
import commentRoutes from './comment.routes'
import battleRoutes from './battle.routes'
import watchlistRoutes from './watchlist.routes'
import userRoutes from './user.routes'
import notificationRoutes from './notification.routes'
import postRoutes from './post.routes'
import communityRoutes from './community.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/anime', animeRoutes)
router.use('/reactions', reactionRoutes)
router.use('/opinions', opinionRoutes)
router.use('/comments', commentRoutes)
router.use('/battles', battleRoutes)
router.use('/watchlist', watchlistRoutes)
router.use('/users', userRoutes)
router.use('/notifications', notificationRoutes)
router.use('/posts', postRoutes)
router.use('/community', communityRoutes)
router.use('/communities', communityRoutes) // Plural alias for REST consistency

export default router
