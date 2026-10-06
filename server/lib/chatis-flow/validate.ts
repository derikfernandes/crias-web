import { detectVersionFromBuilderName } from './parseChatisExport'
import type {
  ChatisFlowVersion,
  ChatisRawExport,
  ValidationIssue,
  ValidationResult,
} from './types'

const REQUIRED_TOP = ['builder', 'blocks'] as const
const SUPPORTED_MAJOR = new Set(['2.4', '2.5'])

/**
 * Detecta versão do export (builder.name) sem parse completo.
 */
export function detectChatisVersion(
  raw: ChatisRawExport | string | null | undefined,
): ChatisFlowVersion | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as ChatisRawExport
      return detectChatisVersion(parsed)
    } catch {
      return null
    }
  }
  return detectVersionFromBuilderName(raw.builder?.name)
}

/**
 * Valida schema mínimo do export Chatis (2.4 baseline).
 * Campos desconhecidos no top-level → warning (não erro), para Cases D.
 */
export function validateChatisExport(
  input: unknown,
): ValidationResult {
  const issues: ValidationIssue[] = []

  if (typeof input === 'string') {
    try {
      input = JSON.parse(input) as unknown
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        version: null,
        issues: [
          {
            code: 'invalid_json',
            path: '',
            message: `JSON inválido: ${message}`,
            severity: 'error',
          },
        ],
      }
    }
  }

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
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

  const raw = input as ChatisRawExport
  const version = detectChatisVersion(raw)

  for (const key of REQUIRED_TOP) {
    if (raw[key] == null) {
      issues.push({
        code: 'missing_required',
        path: key,
        message: `Campo obrigatório ausente: ${key}`,
        severity: 'error',
      })
    }
  }

  if (raw.builder != null && typeof raw.builder !== 'object') {
    issues.push({
      code: 'schema',
      path: 'builder',
      message: 'builder deve ser objeto',
      severity: 'error',
    })
  } else if (raw.builder) {
    if (raw.builder.id == null) {
      issues.push({
        code: 'missing_required',
        path: 'builder.id',
        message: 'builder.id é obrigatório',
        severity: 'error',
      })
    }
    if (!raw.builder.name) {
      issues.push({
        code: 'missing_required',
        path: 'builder.name',
        message: 'builder.name é obrigatório (carrega versão)',
        severity: 'error',
      })
    }
  }

  if (raw.blocks != null && !Array.isArray(raw.blocks)) {
    issues.push({
      code: 'schema',
      path: 'blocks',
      message: 'blocks deve ser array',
      severity: 'error',
    })
  } else if (Array.isArray(raw.blocks)) {
    raw.blocks.forEach((b, i) => {
      if (b?.id == null) {
        issues.push({
          code: 'missing_required',
          path: `blocks[${i}].id`,
          message: 'Cada bloco precisa de id',
          severity: 'error',
        })
      }
    })
  }

  const known = new Set([
    'builder',
    'scripts',
    'variables',
    'blocks',
    'connections',
  ])
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      issues.push({
        code: 'unknown_field',
        path: key,
        message: `Campo top-level desconhecido (preservado no parse): ${key}`,
        severity: 'warning',
      })
    }
  }

  if (version && !SUPPORTED_MAJOR.has(version) && !/^\d+\.\d+/.test(version)) {
    issues.push({
      code: 'unsupported_version',
      path: 'builder.name',
      message: `Versão não reconhecida: ${version}`,
      severity: 'warning',
    })
  }

  if (!version && raw.builder?.name) {
    issues.push({
      code: 'unsupported_version',
      path: 'builder.name',
      message: `Não foi possível extrair versão de "${raw.builder.name}"`,
      severity: 'error',
    })
  }

  const hasError = issues.some((i) => i.severity === 'error')
  return {
    ok: !hasError,
    version,
    issues,
  }
}

/**
 * Compara IDs de blocos entre dois exports (Case G — id change).
 */
export function detectBlockIdChanges(
  before: ChatisRawExport,
  after: ChatisRawExport,
): ValidationIssue[] {
  const beforeByVar = new Map<string, number>()
  for (const b of before.blocks ?? []) {
    if (b.variable && b.id != null) beforeByVar.set(String(b.variable), Number(b.id))
  }
  const issues: ValidationIssue[] = []
  for (const b of after.blocks ?? []) {
    if (!b.variable || b.id == null) continue
    const prev = beforeByVar.get(String(b.variable))
    if (prev != null && prev !== Number(b.id)) {
      issues.push({
        code: 'id_change',
        path: `blocks[variable=${b.variable}].id`,
        message: `ID do bloco ${b.variable} mudou: ${prev} → ${b.id}`,
        severity: 'warning',
      })
    }
  }
  return issues
}
