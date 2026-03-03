import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import * as PostController from '../controllers/post.controller'

const router = Router()

router.get('/', PostController.getPosts)
router.post('/', authMiddleware, PostController.createPost)
router.post('/:id/like', authMiddleware, PostController.togglePostLike)
router.get('/likes/me', authMiddleware, PostController.getMyLikedPosts)
router.get('/:id/comments', PostController.getPostComments)
router.post('/:id/comment', authMiddleware, PostController.addPostComment)

export default router
