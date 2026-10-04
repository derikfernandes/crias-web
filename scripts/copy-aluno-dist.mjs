import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'frontend/cria-frontend/dist')
const dest = join(root, 'frontend/trilha-admin/dist/aluno')
const expectedTitle = 'Crias — Trilhas'

if (!existsSync(src)) {
  console.error('[copy-aluno-dist] Build do aluno ausente:', src)
  process.exit(1)
}

const srcIndex = join(src, 'index.html')
if (!existsSync(srcIndex)) {
  console.error('[copy-aluno-dist] index.html do aluno ausente:', srcIndex)
  process.exit(1)
}

const html = readFileSync(srcIndex, 'utf8')
if (!html.includes(`<title>${expectedTitle}</title>`)) {
  console.error(
    '[copy-aluno-dist] Título inesperado no index do aluno. Esperado:',
    expectedTitle,
  )
  process.exit(1)
}
if (!html.includes('/aluno/assets/')) {
  console.error(
    '[copy-aluno-dist] Assets sem base /aluno/ — confira vite.config base.',
  )
  process.exit(1)
}

mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { recursive: true })

const destIndex = join(dest, 'index.html')
if (!existsSync(destIndex)) {
  console.error('[copy-aluno-dist] Falha ao copiar para', destIndex)
  process.exit(1)
}

console.info('[copy-aluno-dist] Copiado para', dest)
