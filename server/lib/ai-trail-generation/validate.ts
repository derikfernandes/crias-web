import type {
  GeneratedTrail,
  ValidationIssue,
  ValidationResult,
} from './types.js'

const PLACEHOLDER_RE =
  /\[\s*(inserir|criar|explicar|preencher|conteúdo|conteudo)[^\]]*\]|\.\.\.|\[\s*\.\.\.\s*\]|\[\s*\]/i

function isBlank(s: unknown): boolean {
  return typeof s !== 'string' || !s.trim()
}

function looksLikePlaceholder(s: string): boolean {
  const t = s.trim()
  if (!t) return true
  if (PLACEHOLDER_RE.test(t)) return true
  if (/^\[.+\]$/.test(t) && t.length < 80) return true
  return false
}

function normalizeCorrect(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t) return null
  const letter = t.match(/^\(?([A-Ca-c])\)?/)
  if (letter) {
    return String(letter[1]!.toUpperCase().charCodeAt(0) - 64)
  }
  if (/^[123]$/.test(t)) return t
  return t
}

/**
 * Valida regras duras do prompt de arquitetura Crias.
 */
export function validateGeneratedTrail(trail: GeneratedTrail): ValidationResult {
  const issues: ValidationIssue[] = []

  if (isBlank(trail.name)) {
    issues.push({ code: 'trail_name', message: 'Nome da trilha vazio.' })
  }
  if (isBlank(trail.objective)) {
    issues.push({
      code: 'trail_objective',
      message: 'Objetivo geral da trilha vazio.',
    })
  }
  if (!Array.isArray(trail.phases) || trail.phases.length < 2) {
    issues.push({
      code: 'phases_min',
      message: 'É necessário pelo menos 2 fases na estrutura.',
    })
    return { ok: false, issues }
  }
  if (!Array.isArray(trail.stages) || trail.stages.length < 1) {
    issues.push({
      code: 'stages_min',
      message: 'É necessário pelo menos 1 etapa.',
    })
    return { ok: false, issues }
  }

  const sortedPhases = [...trail.phases].sort((a, b) => a.position - b.position)
  const positions = sortedPhases.map((p) => p.position)
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] !== i + 1) {
      issues.push({
        code: 'phase_positions',
        message: `Posições de fase devem ser 1..N sequenciais (visto ${positions.join(',')}).`,
      })
      break
    }
  }

  const last = sortedPhases[sortedPhases.length - 1]!
  if (last.type !== 'fixed') {
    issues.push({
      code: 'last_phase_fixed',
      message: 'A última fase da estrutura deve ser Texto fixo (encerramento).',
      path: `phases[${last.position}]`,
    })
  }

  for (let i = 0; i < sortedPhases.length; i++) {
    const phase = sortedPhases[i]!
    if (isBlank(phase.name)) {
      issues.push({
        code: 'phase_name',
        message: `Fase ${phase.position} sem nome.`,
        path: `phases[${phase.position}]`,
      })
    }
    if (phase.type !== 'ai' && phase.type !== 'fixed' && phase.type !== 'exercise') {
      issues.push({
        code: 'phase_type',
        message: `Fase ${phase.position}: tipo inválido "${String(phase.type)}".`,
        path: `phases[${phase.position}]`,
      })
    }
    if (phase.type === 'ai') {
      if (isBlank(phase.globalAiCommand)) {
        issues.push({
          code: 'ai_command',
          message: `Fase IA ${phase.position} sem comando global.`,
          path: `phases[${phase.position}].globalAiCommand`,
        })
      } else if (looksLikePlaceholder(phase.globalAiCommand!)) {
        issues.push({
          code: 'ai_command_placeholder',
          message: `Fase IA ${phase.position}: comando global parece placeholder.`,
          path: `phases[${phase.position}].globalAiCommand`,
        })
      }
    }
    if (phase.type === 'exercise') {
      const next = sortedPhases[i + 1]
      if (!next || next.type !== 'ai') {
        issues.push({
          code: 'exercise_feedback',
          message: `Exercício na posição ${phase.position} deve ser seguido imediatamente por uma fase IA (feedback).`,
          path: `phases[${phase.position}]`,
        })
      }
    }
  }

  const phaseCount = sortedPhases.length

  trail.stages.forEach((stage, si) => {
    if (isBlank(stage.name)) {
      issues.push({
        code: 'stage_name',
        message: `Etapa ${si + 1} sem nome.`,
        path: `stages[${si}]`,
      })
    }
    if (!Array.isArray(stage.contents) || stage.contents.length < 1) {
      issues.push({
        code: 'stage_contents',
        message: `Etapa ${si + 1} sem conteúdos.`,
        path: `stages[${si}].contents`,
      })
      return
    }
    stage.contents.forEach((content, ci) => {
      if (!Array.isArray(content.blocks) || content.blocks.length !== phaseCount) {
        issues.push({
          code: 'block_count',
          message: `Etapa ${si + 1} conteúdo ${ci + 1}: esperados ${phaseCount} blocos (estrutura fixa), obtidos ${content.blocks?.length ?? 0}.`,
          path: `stages[${si}].contents[${ci}].blocks`,
        })
      }
      const byPos = new Map(content.blocks?.map((b) => [b.phasePosition, b]) ?? [])
      for (const phase of sortedPhases) {
        const block = byPos.get(phase.position)
        if (!block) {
          issues.push({
            code: 'missing_block',
            message: `Etapa ${si + 1} conteúdo ${ci + 1}: falta bloco da fase ${phase.position}.`,
            path: `stages[${si}].contents[${ci}]`,
          })
          continue
        }
        if (isBlank(block.content) || looksLikePlaceholder(block.content)) {
          issues.push({
            code: 'empty_block',
            message: `Etapa ${si + 1} conteúdo ${ci + 1} fase ${phase.position}: bloco vazio ou com placeholder.`,
            path: `stages[${si}].contents[${ci}].blocks`,
          })
        }
        if (phase.type === 'exercise') {
          const corr = normalizeCorrect(block.correctOption)
          if (!corr || !/^[123]$/.test(corr)) {
            issues.push({
              code: 'exercise_correct',
              message: `Etapa ${si + 1} conteúdo ${ci + 1} fase ${phase.position}: exercício sem correctOption 1/2/3.`,
              path: `stages[${si}].contents[${ci}].blocks`,
            })
          }
        }
      }
    })
  })

  // Última etapa deve anunciar fim da trilha no último bloco (heurística leve)
  const lastStage = trail.stages[trail.stages.length - 1]
  if (lastStage) {
    const lastContent = lastStage.contents[lastStage.contents.length - 1]
    const closing = lastContent?.blocks?.find((b) => b.phasePosition === last.position)
    if (closing && !/(trilha|percurso|concluiu|final|fim)/i.test(closing.content)) {
      issues.push({
        code: 'trail_closing',
        message:
          'O encerramento da última etapa deve indicar também o fim da trilha.',
        path: `stages[${trail.stages.length - 1}]`,
      })
    }
  }

  return { ok: issues.length === 0, issues }
}

export function normalizeCorrectOption(
  raw: string | null | undefined,
): string | null {
  return normalizeCorrect(raw)
}
