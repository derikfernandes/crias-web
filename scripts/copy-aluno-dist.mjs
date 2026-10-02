import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'frontend/cria-frontend/dist')
const dest = join(root, 'frontend/trilha-admin/dist/aluno')

if (!existsSync(src)) {
  console.error('[copy-aluno-dist] Build do aluno ausente:', src)
  process.exit(1)
}

mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { recursive: true })
console.info('[copy-aluno-dist] Copiado para', dest)
