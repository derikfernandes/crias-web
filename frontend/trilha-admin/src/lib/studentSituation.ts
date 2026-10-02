/**
 * Situação do aluno no painel (Fase B).
 * Calculada no container — a view só exibe o rótulo pronto.
 *
 * Regras (README-IMPLEMENTACAO §5.4):
 * - Concluiu: status = completed
 * - Parado 7+ dias: last_interaction_at há ≥ 7 dias (prioridade sobre faixas)
 * - Não iniciou: not_started
 * - Início < 34% · Meio 34–66% · Final ≥ 67% (sobre conteúdo liberado)
 *
 * Inativo ∈ "Não iniciou" fica pendente de decisão (09) — aqui inativo
 * permanece com activeLabel separado; situação usa só progresso/status.
 */

export type StudentSituationKey =
  | 'completed'
  | 'final'
  | 'mid'
  | 'start'
  | 'stalled'
  | 'notStarted'

export type StudentSituation = {
  key: StudentSituationKey
  label: string
  tone:
    | 'concluiu'
    | 'final'
    | 'meio'
    | 'inicio'
    | 'parado'
    | 'nao-iniciou'
}

const LABELS: Record<StudentSituationKey, StudentSituation['label']> = {
  completed: 'Concluiu',
  final: 'Final',
  mid: 'Meio',
  start: 'Início',
  stalled: 'Parado 7+ dias',
  notStarted: 'Não iniciou',
}

const TONES: Record<StudentSituationKey, StudentSituation['tone']> = {
  completed: 'concluiu',
  final: 'final',
  mid: 'meio',
  start: 'inicio',
  stalled: 'parado',
  notStarted: 'nao-iniciou',
}

const STALL_MS = 7 * 24 * 60 * 60 * 1000

export function isStalledSince(
  lastInteractionAtMs: number | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (lastInteractionAtMs == null || lastInteractionAtMs <= 0) return false
  return nowMs - lastInteractionAtMs >= STALL_MS
}

export function situationFromProgress(args: {
  status?: string | null
  completionPct: number | null
  lastInteractionAtMs?: number | null
  nowMs?: number
}): StudentSituation {
  const now = args.nowMs ?? Date.now()
  const status = (args.status ?? '').trim().toLowerCase()

  if (status === 'completed') {
    return {
      key: 'completed',
      label: LABELS.completed,
      tone: TONES.completed,
    }
  }

  if (isStalledSince(args.lastInteractionAtMs, now)) {
    return {
      key: 'stalled',
      label: LABELS.stalled,
      tone: TONES.stalled,
    }
  }

  if (
    status === 'not_started' ||
    args.completionPct == null ||
    args.completionPct <= 0
  ) {
    return {
      key: 'notStarted',
      label: LABELS.notStarted,
      tone: TONES.notStarted,
    }
  }

  if (args.completionPct >= 67) {
    return { key: 'final', label: LABELS.final, tone: TONES.final }
  }
  if (args.completionPct >= 34) {
    return { key: 'mid', label: LABELS.mid, tone: TONES.mid }
  }
  return { key: 'start', label: LABELS.start, tone: TONES.start }
}
