import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import * as CommunityController from '../controllers/community.controller'

const router = Router()

router.get('/', CommunityController.listCommunities)
router.post('/', authMiddleware, CommunityController.createCommunity)
router.get('/:slug', CommunityController.getCommunityBySlug)

export default router
