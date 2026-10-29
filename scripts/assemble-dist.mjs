/**
 * Monta `./dist` para a Vercel:
 * - raiz = app do aluno (login unificado em crias.ai)
 * - /gestao = Crias Gestão
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const alunoSrc = join(root, 'frontend/crias-aluno/dist')
const gestaoSrc = join(root, 'frontend/crias-gestao/dist')
const dest = join(root, 'dist')
const expectedTitle = 'Crias'

function requireIndex(dir, label) {
  if (!existsSync(dir)) {
    console.error(`[assemble-dist] Build ausente (${label}):`, dir)
    process.exit(1)
  }
  const index = join(dir, 'index.html')
  if (!existsSync(index)) {
    console.error(`[assemble-dist] index.html ausente (${label}):`, index)
    process.exit(1)
  }
  return index
}

const alunoIndex = requireIndex(alunoSrc, 'aluno')
const alunoHtml = readFileSync(alunoIndex, 'utf8')
if (!alunoHtml.includes(`<title>${expectedTitle}</title>`)) {
  console.error(
    '[assemble-dist] Título inesperado no index do aluno. Esperado:',
    expectedTitle,
  )
  process.exit(1)
}
if (alunoHtml.includes('/aluno/assets/')) {
  console.error(
    '[assemble-dist] Assets do aluno ainda usam base /aluno/ — confira vite.config base: "/".',
  )
  process.exit(1)
}

const gestaoIndex = requireIndex(gestaoSrc, 'gestão')
const gestaoHtml = readFileSync(gestaoIndex, 'utf8')
if (!gestaoHtml.includes('/gestao/assets/') && !gestaoHtml.includes('"/gestao/')) {
  // Vite emite /gestao/assets/... quando base é /gestao/
  console.error(
    '[assemble-dist] Assets da gestão sem base /gestao/ — confira vite.config base.',
  )
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
cpSync(alunoSrc, dest, { recursive: true })

const gestaoDest = join(dest, 'gestao')
mkdirSync(gestaoDest, { recursive: true })
cpSync(gestaoSrc, gestaoDest, { recursive: true })

console.info('[assemble-dist] Aluno na raiz + Gestão em', gestaoDest)
