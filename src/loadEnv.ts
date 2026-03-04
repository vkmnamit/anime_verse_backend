import path from 'path'
import fs from 'fs'
import { config } from 'dotenv'

// Capture Railway-injected vars before dotenv can overwrite them
const _PORT = process.env.PORT
const _NODE_ENV = process.env.NODE_ENV

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

// Restore Railway-injected vars — they always win over .env
if (_PORT)      process.env.PORT     = _PORT
if (_NODE_ENV)  process.env.NODE_ENV = _NODE_ENV
