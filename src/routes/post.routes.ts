import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import * as PostController from '../controllers/post.controller'

const router = Router()

router.get('/', PostController.getPosts)
router.post('/:id/like', authMiddleware, PostController.togglePostLike)
router.get('/likes/me', authMiddleware, PostController.getMyLikedPosts)

export default router
