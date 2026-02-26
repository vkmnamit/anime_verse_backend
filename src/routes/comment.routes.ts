import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { optionalAuthMiddleware } from '../middlewares/optionalAuth.middleware'
import { v } from '../middlewares/validate.middleware'
import * as CommentController from '../controllers/comment.controller'

const router = Router()

// POST /api/v1/comments — create a new comment (auth required)
router.post('/', authMiddleware, v.comment, CommentController.createComment)

// GET /api/v1/comments/anime/:animeId — get comments for an anime
router.get('/anime/:animeId', optionalAuthMiddleware, CommentController.getCommentsForAnime)

// DELETE /api/v1/comments/:id — delete own comment (auth required)
router.delete('/:id', authMiddleware, CommentController.deleteComment)

export default router
