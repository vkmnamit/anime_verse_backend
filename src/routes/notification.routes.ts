import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import * as NotificationController from '../controllers/notification.controller'

const router = Router()

// All notification routes require authentication

// GET /api/v1/notifications — get user's notifications
router.get('/', authMiddleware, NotificationController.getNotifications)

// GET /api/v1/notifications/unread/count — get unread count
router.get('/unread/count', authMiddleware, NotificationController.getUnreadCount)

// POST /api/v1/notifications/read-all — mark all as read
router.post('/read-all', authMiddleware, NotificationController.markAllAsRead)

// POST /api/v1/notifications/:id/read — mark single notification as read
router.post('/:id/read', authMiddleware, NotificationController.markAsRead)

export default router
