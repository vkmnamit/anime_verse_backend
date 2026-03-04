import path from 'path'
import fs from 'fs'
import { config } from 'dotenv'

// Never load .env in production — Railway injects all vars via environment
if (process.env.NODE_ENV !== 'production') {
    const envCandidates = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'backend', '.env'),
    ]

    for (const p of envCandidates) {
        if (fs.existsSync(p)) {
            config({ path: p })
            break
        }
    }
}
