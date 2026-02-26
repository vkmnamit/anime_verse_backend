import path from 'path'
import fs from 'fs'
import { config } from 'dotenv'

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
