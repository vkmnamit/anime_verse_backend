import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import path from 'path'

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_KEY!,
    },
})

const BUCKET = process.env.AWS_BUCKET || 'animeverse21'

/**
 * Upload a buffer to S3 and return the public URL.
 * @param buffer  - file content
 * @param originalName - original filename (used to derive extension)
 * @param folder  - subfolder inside the bucket (e.g. "avatars", "posts", "banners")
 * @param mimetype - MIME type of the file
 */
export async function uploadToS3(
    buffer: Buffer,
    originalName: string,
    folder: 'avatars' | 'posts' | 'banners',
    mimetype: string
): Promise<string> {
    const ext = path.extname(originalName).toLowerCase() || '.jpg'
    const key = `${folder}/${randomUUID()}${ext}`

    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
        })
    )

    return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`
}

/**
 * Delete an object from S3 by its full URL or just the key.
 */
export async function deleteFromS3(urlOrKey: string): Promise<void> {
    // Extract key from full URL if needed
    const key = urlOrKey.startsWith('https://')
        ? urlOrKey.split('.amazonaws.com/')[1]
        : urlOrKey

    if (!key) return

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
