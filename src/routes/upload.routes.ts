import { Router } from 'express'
import multer from 'multer'
import { uploadFile } from '../controllers/upload.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

// Keep files in memory — no disk writes; max 5 MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
})

// POST /api/v1/upload?folder=avatars|posts|banners
router.post('/', authMiddleware, upload.single('file'), uploadFile)

export default router
