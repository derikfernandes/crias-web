/**
 * Regras puras do player (/aluno) — ordem do chat, botão principal e
 * decisão de pular a fase de feedback já mostrada. Usadas pelo PlayerPage
 * e testadas em playerHelpers.test.ts.
 */
import type { ConversationLogRow } from './api'
import { logsToMessages, trailCellKey, type ChatMessage } from './trailMessages'

/* ------------------------------------------------------------------ */
/* Merge histórico × mensagens locais                                  */
/* ------------------------------------------------------------------ */

function sameSidechat(a: ChatMessage, b: ChatMessage): boolean {
  return (
    a.role === b.role &&
    a.text.trim() === b.text.trim() &&
    (!a.contextCell || !b.contextCell || a.contextCell === b.contextCell)
  )
}

/**
 * Histórico vira prefixo; extras locais (célula nova, Maria, feedback ainda
 * não gravado) ficam depois, na ordem em que aconteceram. Remove extras que
 * o histórico já trouxe (mesmo id, mesma célula, ou a mesma fala da Maria
 * gravada pelo servidor) — sem bolha duplicada quando o history chega tarde.
 */
export function mergeHistoryIntoMessages(
  logs: ConversationLogRow[],
  prev: ChatMessage[],
): ChatMessage[] {
  const fromHistory = logsToMessages(logs)
  if (prev.length === 0) return fromHistory
  const historySidechat = fromHistory.filter(
    (h) => !h.cellKey && !h.kind,
  )
  const extras = prev.filter((m) => {
    if (fromHistory.some((h) => h.id === m.id)) return false
    if (
      m.cellKey &&
      m.kind !== 'sidechat' &&
      fromHistory.some(
        (h) =>
          h.cellKey === m.cellKey &&
          h.role === m.role &&
          h.kind !== 'sidechat',
      )
    ) {
      return false
    }
    if (m.kind === 'sidechat' && historySidechat.some((h) => sameSidechat(h, m))) {
      return false
    }
    if (
      (m.kind === 'feedback' || m.kind === 'exercise-answer') &&
      fromHistory.some(
        (h) =>
          h.kind === m.kind &&
          h.text.trim() === m.text.trim() &&
          (!m.contextCell || !h.contextCell || h.contextCell === m.contextCell),
      )
    ) {
      return false
    }
    return true
  })
  return extras.length ? [...fromHistory, ...extras] : fromHistory
}

/* ------------------------------------------------------------------ */
/* Lesson-card e entrada da Maria                                      */
/* ------------------------------------------------------------------ */

function isCurrentStepMessage(m: ChatMessage, currentCell: string): boolean {
  return (
    m.role === 'assistant' &&
    m.cellKey === currentCell &&
    m.kind !== 'feedback' &&
    m.kind !== 'sidechat'
  )
}

/** Conversa com a Maria (local ou do histórico) feita na célula atual. */
function isSidechatAtCell(m: ChatMessage, currentCell: string): boolean {
  if (m.contextCell !== currentCell) return false
  return m.kind === 'sidechat' || (!m.cellKey && !m.kind)
}

/**
 * Posição do lesson-card (passo atual) na lista renderizada `chat`.
 * Ocupa o lugar da bolha da célula atual; e SEMPRE fica antes das perguntas
 * à Maria feitas nesta célula (a pergunta e a resposta vêm depois do bloco,
 * em ordem cronológica — inclusive após reload ou se a bolha do passo sumiu
 * do recorte). Sem âncora nenhuma: no fim.
 */
export function computeLessonCardSlot(
  visible: ChatMessage[],
  chat: ChatMessage[],
  currentCell: string | null,
): number {
  if (!currentCell) return chat.length
  let slot = chat.length
  const stepIdx = visible.findIndex((m) => isCurrentStepMessage(m, currentCell))
  if (stepIdx >= 0) {
    const before = new Set(visible.slice(0, stepIdx).map((m) => m.id))
    const idx = chat.findIndex((m) => !before.has(m.id))
    if (idx >= 0) slot = idx
  }
  const firstSidechat = chat.findIndex((m) => isSidechatAtCell(m, currentCell))
  if (firstSidechat >= 0 && firstSidechat < slot) slot = firstSidechat
  return slot
}

/**
 * Entrada da Maria: logo antes da 1ª bolha sidechat depois do card; se a
 * Maria acabou de ser chamada (sem bolhas ainda), no fim — nunca no topo.
 */
export function computeMariaEntranceSlot(
  chat: ChatMessage[],
  lessonCardSlot: number,
  mariaActive: boolean,
  currentCell: string | null = null,
): number {
  // Maria do histórico (após reload) não tem `kind`: conta pela célula.
  const afterCard = chat.findIndex(
    (m, idx) =>
      idx >= lessonCardSlot &&
      (m.kind === 'sidechat' ||
        (currentCell !== null && isSidechatAtCell(m, currentCell))),
  )
  if (afterCard >= 0) return afterCard
  if (mariaActive) return chat.length
  const anySidechat = chat.findIndex((m) => m.kind === 'sidechat')
  return anySidechat >= 0 ? anySidechat : chat.length
}

/* ------------------------------------------------------------------ */
/* Fase de feedback já mostrada                                        */
/* ------------------------------------------------------------------ */

export type FeedbackCellContent = {
  status: string
  stage_type?: string | null
  stage_number?: number
  question_number?: number
  /** Do servidor: conteúdo = feedback da tentativa do exercício anterior. */
  exercise_feedback?: boolean
}

/**
 * true = a célula atual é a fase IA logo após um exercício e o servidor
 * informa que o texto dela já foi o feedback da tentativa (`exercise_feedback`),
 * e esse feedback está no chat. O player não reexibe (sem 2º feedback).
 * Estrutural: não olha título nem comando do stage.
 */
export function isFeedbackCellAlreadyShown(
  content: FeedbackCellContent | null | undefined,
  messages: ChatMessage[],
): boolean {
  if (!content || content.status !== 'ok') return false
  if (content.stage_type !== 'ai' || content.exercise_feedback !== true) {
    return false
  }
  const stage = content.stage_number ?? 0
  const question = content.question_number ?? 0
  if (stage < 2 || question < 1) return false
  const exerciseCell = trailCellKey(stage - 1, question)
  return messages.some(
    (m) =>
      m.kind === 'feedback' &&
      (m.contextCell
        ? m.contextCell === exerciseCell
        : m.questionNumber === question),
  )
}

/* ------------------------------------------------------------------ */
/* Botão principal (único)                                             */
/* ------------------------------------------------------------------ */

export const MAIN_BUTTON_SUBMIT_LABEL = 'Enviar resposta'
export const MAIN_BUTTON_SUBMITTING_LABEL = 'Enviando resposta…'
export const MAIN_BUTTON_CONTINUE_LABEL = 'Continuar trilha →'

export type MainButtonInput = {
  contentOk: boolean
  stageType: 'ai' | 'fixed' | 'exercise' | null
  exerciseDone: boolean
  exerciseOptionsMissing: boolean
  hasSelection: boolean
  submitting: boolean
  busy: boolean
  busyReason: 'maria' | 'trail' | 'exercise' | null
  trailBusyLabel: string
  continuarLeaving: boolean
  advanceInFlight: boolean
  mariaInFlight: boolean
  hasMariaDraft: boolean
  offline: boolean
  /** “Tentar de novo” (erro de rede/sistema) vivo — recovery único. */
  canRetry: boolean
}

export type MainButtonState = {
  visible: boolean
  action: 'submit' | 'advance' | 'none'
  label: string
  disabled: boolean
  busy: boolean
}

const HIDDEN: MainButtonState = {
  visible: false,
  action: 'none',
  label: '',
  disabled: true,
  busy: false,
}

/**
 * Um único botão principal:
 * - exercício sem resposta → “Enviar resposta” (desabilitado sem opção);
 * - depois do feedback, aula, texto fixo e conversa com a Maria →
 *   “Continuar trilha →” (no modo Maria, um clique fecha a Maria e avança);
 * - enquanto a Maria responde ou com rascunho no composer: desabilitado.
 * Nunca avança sozinho; “Tentar de novo” só em erro de rede/sistema.
 */
export function mainButtonState(i: MainButtonInput): MainButtonState {
  if (!i.contentOk || !i.stageType) return HIDDEN
  const trailBusy = (i.busy && i.busyReason === 'trail') || i.continuarLeaving

  if (i.stageType === 'exercise' && !i.exerciseDone) {
    if (i.exerciseOptionsMissing) return HIDDEN
    if (trailBusy) {
      return { visible: true, action: 'none', label: i.trailBusyLabel, disabled: true, busy: true }
    }
    if (i.submitting) {
      return {
        visible: true,
        action: 'submit',
        label: MAIN_BUTTON_SUBMITTING_LABEL,
        disabled: true,
        busy: true,
      }
    }
    if (i.canRetry && !i.hasSelection) return HIDDEN
    return {
      visible: true,
      action: 'submit',
      label: MAIN_BUTTON_SUBMIT_LABEL,
      disabled: !i.hasSelection || i.offline || i.busy,
      busy: false,
    }
  }

  if (trailBusy) {
    return { visible: true, action: 'none', label: i.trailBusyLabel, disabled: true, busy: true }
  }
  if (i.canRetry) return HIDDEN
  const mariaReplying = i.mariaInFlight || (i.busy && i.busyReason === 'maria')
  return {
    visible: true,
    action: 'advance',
    label: MAIN_BUTTON_CONTINUE_LABEL,
    disabled:
      mariaReplying ||
      i.busy ||
      i.advanceInFlight ||
      i.offline ||
      i.hasMariaDraft,
    busy: mariaReplying,
  }
}
