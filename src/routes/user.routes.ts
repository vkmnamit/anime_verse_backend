import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { optionalAuthMiddleware } from '../middlewares/optionalAuth.middleware'
import { v } from '../middlewares/validate.middleware'
import * as UserController from '../controllers/user.controller'

const router = Router()

// PATCH /api/v1/users/me — update own profile (auth required)
router.patch('/me', authMiddleware, v.profileUpdate, UserController.updateProfile)

// GET /api/v1/users/me/stats — own stats (auth required)
router.get('/me/stats', authMiddleware, UserController.getMyStats)

// GET /api/v1/users/:username/stats — public user stats
router.get('/:username/stats', optionalAuthMiddleware, UserController.getUserStats)

// GET /api/v1/users/:username — get public profile
router.get('/:username', optionalAuthMiddleware, UserController.getProfile)

// Activities & Votes
router.get('/:username/comments', optionalAuthMiddleware, UserController.getUserComments)
router.get('/:username/battles', optionalAuthMiddleware, UserController.getUserBattles)

// Social Relationships
router.get('/search', UserController.searchUsers)
router.get('/:username/followers', optionalAuthMiddleware, UserController.getFollowers)
router.get('/:username/following', optionalAuthMiddleware, UserController.getFollowing)
router.post('/:username/follow', authMiddleware, UserController.followUser)
router.delete('/:username/follow', authMiddleware, UserController.unfollowUser)

export default router
