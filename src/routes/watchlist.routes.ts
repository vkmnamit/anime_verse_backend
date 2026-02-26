import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { v } from '../middlewares/validate.middleware'
import * as WatchlistController from '../controllers/watchlist.controller'

const router = Router()

// All watchlist routes require authentication

// POST /api/v1/watchlist — add or update watchlist entry
router.post('/', authMiddleware, v.watchlist, WatchlistController.addOrUpdateWatchlist)

// GET /api/v1/watchlist — get user's watchlist (optional ?status= filter)
router.get('/', authMiddleware, WatchlistController.getWatchlist)

// DELETE /api/v1/watchlist/:animeId — remove from watchlist
router.delete('/:animeId', authMiddleware, WatchlistController.removeFromWatchlist)

export default router
