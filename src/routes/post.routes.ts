import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import * as PostController from '../controllers/post.controller'

const router = Router()

// Posts
router.get('/', PostController.getPosts)
router.post('/', authMiddleware, PostController.createPost)

// Post likes
router.post('/:id/like', authMiddleware, PostController.togglePostLike)
router.get('/likes/me', authMiddleware, PostController.getMyLikedPosts)

// Post comments (with reply support)
router.get('/:id/comments', PostController.getPostComments)
router.post('/:id/comment', authMiddleware, PostController.addPostComment)

// Comment actions
router.delete('/comments/:commentId', authMiddleware, PostController.deleteComment)
router.post('/comments/:commentId/like', authMiddleware, PostController.toggleCommentLike)
router.get('/comments/likes/me', authMiddleware, PostController.getMyLikedComments)

// Share tracking
router.post('/:id/share', PostController.trackPostShare)

export default router
