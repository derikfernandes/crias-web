/**
 * @deprecated Preferir `assemble-dist.mjs` (aluno na raiz + gestão em /gestao).
 * Mantido como alias para não quebrar chamadas manuais antigas.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const r = spawnSync(process.execPath, [join(here, 'assemble-dist.mjs')], {
  stdio: 'inherit',
})
process.exit(r.status ?? 1)
