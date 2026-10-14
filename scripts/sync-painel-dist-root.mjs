/**
 * Espelha o build do painel em `./dist` na raiz do monorepo.
 *
 * O projeto Vercel legado `crias-painel` (Vite) procura Output Directory
 * `dist` na raiz; o monorepo gera em `frontend/crias-painel/dist`.
 * `crias-web` continua usando `frontend/crias-painel/dist` via vercel.json.
 */
import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'frontend/crias-painel/dist')
const dest = join(root, 'dist')

if (!existsSync(src)) {
  console.error('[sync-painel-dist-root] Build do painel ausente:', src)
  process.exit(1)
}
if (!existsSync(join(src, 'index.html'))) {
  console.error('[sync-painel-dist-root] index.html ausente em', src)
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
cpSync(src, dest, { recursive: true })
console.info('[sync-painel-dist-root] Espelhado para', dest)
