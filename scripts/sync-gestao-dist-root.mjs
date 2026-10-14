/**
 * Espelha o build da gestão em `./dist` na raiz do monorepo.
 *
 * O projeto Vercel legado `crias-gestao` (Vite) procura Output Directory
 * `dist` na raiz; o monorepo gera em `frontend/crias-gestao/dist`.
 * `crias-web` e a gestão legada passam a usar `./dist` (vercel.json na raiz).
 */
import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'frontend/crias-gestao/dist')
const dest = join(root, 'dist')

if (!existsSync(src)) {
  console.error('[sync-gestao-dist-root] Build da gestão ausente:', src)
  process.exit(1)
}
if (!existsSync(join(src, 'index.html'))) {
  console.error('[sync-gestao-dist-root] index.html ausente em', src)
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
cpSync(src, dest, { recursive: true })
console.info('[sync-gestao-dist-root] Espelhado para', dest)
