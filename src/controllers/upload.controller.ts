import { Request, Response, NextFunction } from 'express'
import { uploadToS3 } from '../services/s3.service'
import { ApiError } from '../utils/errors.util'

const ALLOWED_FOLDERS = ['avatars', 'posts', 'banners'] as const
type Folder = (typeof ALLOWED_FOLDERS)[number]

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            throw new ApiError(400, 'bad_request', 'No file provided')
        }

        const { mimetype, size, buffer, originalname } = req.file

        if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
            throw new ApiError(415, 'unsupported_media', `Unsupported file type: ${mimetype}. Allowed: jpeg, png, webp, gif`)
        }

        if (size > MAX_SIZE_BYTES) {
            throw new ApiError(413, 'file_too_large', 'File too large. Maximum size is 5 MB')
        }

        const folder: Folder = ALLOWED_FOLDERS.includes(req.query.folder as Folder)
            ? (req.query.folder as Folder)
            : 'posts'

        const url = await uploadToS3(buffer, originalname, folder, mimetype)

        res.status(200).json({ url })
    } catch (err) {
        next(err)
    }
}
