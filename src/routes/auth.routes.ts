import { Router } from 'express'
import * as AuthController from '../controllers/auth.controller'

const router = Router()
router.post('/signup', AuthController.signup)
router.post('/login', AuthController.login)
router.post('/logout', AuthController.logout)
router.get('/me', AuthController.getMe)

export default router
