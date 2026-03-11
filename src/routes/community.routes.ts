import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import * as CommunityController from '../controllers/community.controller'

const router = Router()

// Community management
router.get('/', CommunityController.listCommunities)
router.post('/', authMiddleware, CommunityController.createCommunity)
router.get('/joined', authMiddleware, CommunityController.getMyJoinedCommunities)
router.get('/:slug', CommunityController.getCommunityBySlug)

// Membership
router.post('/:slug/join', authMiddleware, CommunityController.toggleMembership)

// Settings
router.patch('/:id', authMiddleware, CommunityController.updateCommunity)

export default router
