/**
 * Valida que src/design/ não contém imports ou chamadas proibidas.
 * Falha com exit code 1 se encontrar violações.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const designRoot = join(root, 'frontend/crias-gestao/src/design')

const FORBIDDEN_IMPORT_RES = [
  /\bfrom\s+['"]firebase(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]firebase-admin(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]axios['"]/,
  /\bfrom\s+['"][^'"]*\/lib(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"][^'"]*\/hooks(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"][^'"]*\/contexts(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"][^'"]*\/pages(?:\/[^'"]*)?['"]/,
  /\bimport\s*\(\s*['"]firebase/,
]

/** Escapes de design/ para src/components ou src/layouts (fora de design). */
const FORBIDDEN_ESCAPE_RES = [
  /\bfrom\s+['"]\.\.\/\.\.\/components(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]\.\.\/\.\.\/layouts(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]\.\.\/\.\.\/\.\.\/components(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]\.\.\/\.\.\/\.\.\/layouts(?:\/[^'"]*)?['"]/,
]

const FORBIDDEN_CALL_RES = [
  /\bonSnapshot\s*\(/,
  /\bgetDocs?\s*\(/,
  /\bsetDoc\s*\(/,
  /\baddDoc\s*\(/,
  /\bupdateDoc\s*\(/,
  /\bdeleteDoc\s*\(/,
  /\bfetch\s*\(/,
  /\bimport\.meta\.env\b/,
  /\bprocess\.env\b/,
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) out.push(full)
  }
  return out
}

function collectViolations(filePath, source) {
  const rel = relative(root, filePath).replace(/\\/g, '/')
  const violations = []
  const lines = source.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue
    }

    for (const re of [
      ...FORBIDDEN_IMPORT_RES,
      ...FORBIDDEN_ESCAPE_RES,
      ...FORBIDDEN_CALL_RES,
    ]) {
      if (re.test(line)) {
        // Permitir imports de ../../types/ (tipos de domínio só para props)
        if (/from\s+['"][^'"]*\/types(?:\/[^'"]*)?['"]/.test(line)) {
          continue
        }
        // Permitir menções em README / strings de documentação em comentários já filtrados
        violations.push({
          file: rel,
          line: i + 1,
          match: line.trim().slice(0, 120),
          rule: re.toString(),
        })
      }
    }
  }

  return violations
}

test('design/ existe', () => {
  assert.equal(statSync(designRoot).isDirectory(), true)
})

test('nenhum arquivo em design/ viola as barreiras', () => {
  const files = walk(designRoot)
  assert.ok(files.length > 0, 'design/ não contém arquivos')

  const all = []
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    all.push(...collectViolations(file, source))
  }

  if (all.length > 0) {
    const msg = all
      .map((v) => `${v.file}:${v.line}  ${v.match}`)
      .join('\n')
    assert.fail(`Violações em design/:\n${msg}`)
  }
})
