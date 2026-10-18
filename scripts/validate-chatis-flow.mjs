#!/usr/bin/env node
/**
 * Valida export Chatis (default: [ONLINE]_Crias_2.4.json na raiz).
 * Discovery-only — não altera runtime WhatsApp.
 *
 * Usage:
 *   npm run validate:chatis-flow
 *   node scripts/validate-chatis-flow.mjs path/to/export.json
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = resolve(root, process.argv[2] ?? '[ONLINE]_Crias_2.4.json')

const KNOWN = new Set([
  'builder',
  'scripts',
  'variables',
  'blocks',
  'connections',
])

function validate(rawText) {
  let raw
  try {
    raw = JSON.parse(rawText)
  } catch (err) {
    return {
      ok: false,
      version: null,
      issues: [
        {
          code: 'invalid_json',
          path: '',
          message: String(err?.message ?? err),
          severity: 'error',
        },
      ],
    }
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      version: null,
      issues: [
        {
          code: 'schema',
          path: '',
          message: 'Export deve ser um objeto JSON',
          severity: 'error',
        },
      ],
    }
  }

  const issues = []
  for (const key of ['builder', 'blocks']) {
    if (raw[key] == null) {
      issues.push({
        code: 'missing_required',
        path: key,
        message: `Campo obrigatório ausente: ${key}`,
        severity: 'error',
      })
    }
  }

  if (raw.builder && raw.builder.id == null) {
    issues.push({
      code: 'missing_required',
      path: 'builder.id',
      message: 'builder.id é obrigatório',
      severity: 'error',
    })
  }
  if (raw.builder && !raw.builder.name) {
    issues.push({
      code: 'missing_required',
      path: 'builder.name',
      message: 'builder.name é obrigatório',
      severity: 'error',
    })
  }

  const name = raw.builder?.name ?? ''
  const m = String(name).match(/(\d+\.\d+(?:\.\d+)?)/)
  const version = m ? m[1] : null
  if (raw.builder?.name && !version) {
    issues.push({
      code: 'unsupported_version',
      path: 'builder.name',
      message: `Não foi possível extrair versão de "${name}"`,
      severity: 'error',
    })
  }

  for (const key of Object.keys(raw)) {
    if (!KNOWN.has(key)) {
      issues.push({
        code: 'unknown_field',
        path: key,
        message: `Campo top-level desconhecido: ${key}`,
        severity: 'warning',
      })
    }
  }

  return {
    ok: !issues.some((i) => i.severity === 'error'),
    version,
    issues,
  }
}

const text = readFileSync(target, 'utf8')
const result = validate(text)
const status = result.ok ? 'OK' : 'FAIL'
console.log(
  `[chatis-flow] ${status}  file=${target}  version=${result.version}`,
)
for (const issue of result.issues) {
  console.log(
    `  - [${issue.severity}] ${issue.code} ${issue.path} ${issue.message}`,
  )
}
if (!result.ok) process.exit(1)

const raw = JSON.parse(text)
console.log(
  `[chatis-flow] blocks=${raw.blocks?.length ?? 0} connections=${raw.connections?.length ?? 0} variables=${raw.variables?.length ?? 0} scripts=${raw.scripts?.length ?? 0}`,
)
