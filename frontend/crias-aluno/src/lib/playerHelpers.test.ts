import { describe, expect, it } from 'vitest'

import type { ConversationLogRow } from './api'
import {
  MAIN_BUTTON_CONTINUE_LABEL,
  MAIN_BUTTON_SUBMIT_LABEL,
  MAIN_BUTTON_SUBMITTING_LABEL,
  computeLessonCardSlot,
  computeMariaEntranceSlot,
  isFeedbackCellAlreadyShown,
  mainButtonState,
  mergeHistoryIntoMessages,
  type MainButtonInput,
} from './playerHelpers'
import type { ChatMessage } from './trailMessages'

function log(p: Partial<ConversationLogRow> & { id: string; message_text: string }): ConversationLogRow {
  return {
    student_id: 's1745',
    trail_id: 't58',
    stage_number: 1,
    question_number: 1,
    sender: 'system',
    message_type: 'instruction',
    metadata: { source: 'trail-ai' },
    created_at_ms: 0,
    ...p,
  } as ConversationLogRow
}

const step = (cell: string, text = `passo ${cell}`): ChatMessage => ({
  id: `trail-${cell}`,
  role: 'assistant',
  text,
  cellKey: cell,
  questionNumber: Number(cell.split('-')[1]),
})
const maria = (id: string, role: 'user' | 'assistant', cell: string, text = id): ChatMessage => ({
  id,
  role,
  text,
  kind: 'sidechat',
  contextCell: cell,
  questionNumber: Number(cell.split('-')[1]),
})

describe('mergeHistoryIntoMessages', () => {
  it('histórico primeiro, célula nova e Maria locais depois (ordem cronológica)', () => {
    const logs = [log({ id: 'a', message_text: 'S1', stage_number: 1 })]
    const prev = [step('1-1', 'S1'), step('4-1'), maria('u1', 'user', '4-1')]
    const out = mergeHistoryIntoMessages(logs, prev)
    expect(out.map((m) => m.id)).toEqual(['trail-1-1', 'trail-4-1', 'u1'])
  })

  it('não duplica a fala da Maria quando o histórico já a trouxe', () => {
    const logs = [
      log({ id: 'd', message_text: 'S4', stage_number: 4, metadata: { source: 'next-content' } }),
      log({ id: 'q', message_text: 'o que é CITE?', stage_number: 4, sender: 'student', message_type: 'text', metadata: { source: 'maria-tutor' } }),
      log({ id: 'r', message_text: 'CITE é…', stage_number: 4, message_type: 'text', metadata: { source: 'maria-tutor' } }),
    ]
    const prev = [step('4-1', 'S4'), maria('u1', 'user', '4-1', 'o que é CITE?'), maria('m1', 'assistant', '4-1', 'CITE é…')]
    const out = mergeHistoryIntoMessages(logs, prev)
    expect(out.map((m) => m.text)).toEqual(['S4', 'o que é CITE?', 'CITE é…'])
  })

  it('não duplica resposta + feedback do exercício já gravados', () => {
    const logs = [
      log({ id: 'e', message_text: 'Enunciado', stage_number: 2, message_type: 'exercise', metadata: { source: 'next-content' } }),
      log({ id: 'ans', message_text: 'A) Tecnologia', stage_number: 2, sender: 'student', message_type: 'exercise', metadata: { source: 'exercise_attempt' } }),
      log({ id: 'fb', message_text: 'Feedback único', stage_number: 2, message_type: 'feedback', metadata: { source: 'exercise_feedback' } }),
    ]
    const prev: ChatMessage[] = [
      step('2-1', 'Enunciado'),
      { id: 'u-1', role: 'user', text: 'A) Tecnologia', kind: 'exercise-answer', contextCell: '2-1' },
      { id: 'f-1', role: 'assistant', text: 'Feedback único', kind: 'feedback', contextCell: '2-1' },
    ]
    const out = mergeHistoryIntoMessages(logs, prev)
    expect(out.filter((m) => m.text === 'Feedback único')).toHaveLength(1)
    expect(out).toHaveLength(3)
  })
})

describe('computeLessonCardSlot — Maria sempre depois do bloco atual', () => {
  it('card no lugar da bolha do passo; Maria abaixo', () => {
    const visible = [step('1-1'), step('4-1'), maria('u1', 'user', '4-1'), maria('m1', 'assistant', '4-1')]
    const chat = visible.filter((m) => m.cellKey !== '4-1') // bolha do passo vira card
    expect(computeLessonCardSlot(visible, chat, '4-1')).toBe(1)
  })

  it('bolha do passo fora do recorte: card antes da conversa da célula (não no fim)', () => {
    const visible = [step('1-1'), maria('u1', 'user', '4-1'), maria('m1', 'assistant', '4-1')]
    const chat = visible
    expect(computeLessonCardSlot(visible, chat, '4-1')).toBe(1)
  })

  it('passo reancorado depois da Maria (replay/reload): card volta para antes dela', () => {
    const visible = [maria('u1', 'user', '4-1'), maria('m1', 'assistant', '4-1'), step('4-1')]
    const chat = visible.slice(0, 2)
    expect(computeLessonCardSlot(visible, chat, '4-1')).toBe(0)
  })

  it('Maria do histórico (sem kind) também conta pela célula', () => {
    const hist: ChatMessage = { id: 'q', role: 'user', text: 'dúvida', contextCell: '4-1' }
    expect(computeLessonCardSlot([step('1-1'), hist], [step('1-1'), hist], '4-1')).toBe(1)
  })

  it('Maria de outra célula não puxa o card', () => {
    const visible = [step('1-1'), maria('u1', 'user', '1-1'), step('4-1')]
    const chat = visible.slice(0, 2)
    expect(computeLessonCardSlot(visible, chat, '4-1')).toBe(2)
  })

  it('sem âncora: fim', () => {
    expect(computeLessonCardSlot([step('1-1')], [step('1-1')], '4-1')).toBe(1)
    expect(computeLessonCardSlot([], [], null)).toBe(0)
  })

  it('entrada da Maria fica logo antes da 1ª bolha sidechat após o card', () => {
    const chat = [step('1-1'), maria('u1', 'user', '4-1'), maria('m1', 'assistant', '4-1')]
    expect(computeMariaEntranceSlot(chat, 1, true)).toBe(1)
    expect(computeMariaEntranceSlot([step('1-1')], 1, true)).toBe(1)
  })

  it('após reload (Maria do histórico, sem kind): entrada antes da pergunta, não no fim', () => {
    const q: ChatMessage = { id: 'q', role: 'user', text: 'dúvida', contextCell: '4-1' }
    const r: ChatMessage = { id: 'r', role: 'assistant', text: 'resposta', contextCell: '4-1' }
    const chat = [step('1-1'), q, r]
    expect(computeMariaEntranceSlot(chat, 1, true, '4-1')).toBe(1)
    // Fala da Maria de outra célula não ancora a entrada da célula atual.
    expect(computeMariaEntranceSlot(chat, 1, true, '5-1')).toBe(3)
  })
})

describe('isFeedbackCellAlreadyShown — decisão estrutural', () => {
  const fb: ChatMessage = { id: 'f', role: 'assistant', text: 'fb', kind: 'feedback', contextCell: '2-1', questionNumber: 1 }
  const base = { status: 'ok', stage_type: 'ai', stage_number: 3, question_number: 1 }

  it('pula quando o servidor marca exercise_feedback e o feedback está no chat', () => {
    expect(isFeedbackCellAlreadyShown({ ...base, exercise_feedback: true }, [fb])).toBe(true)
  })
  it('não pula sem a marca do servidor (mesmo com título “Resposta”)', () => {
    expect(isFeedbackCellAlreadyShown({ ...base, exercise_feedback: false }, [fb])).toBe(false)
    expect(isFeedbackCellAlreadyShown({ ...base, stage_title: '🤔 Resposta' } as never, [fb])).toBe(false)
  })
  it('não pula se o feedback não está no chat (mostra a fase uma vez)', () => {
    expect(isFeedbackCellAlreadyShown({ ...base, exercise_feedback: true }, [])).toBe(false)
  })
  it('feedback de outro exercício não conta', () => {
    const other = { ...fb, contextCell: '5-1' }
    expect(isFeedbackCellAlreadyShown({ ...base, exercise_feedback: true }, [other])).toBe(false)
  })
  it('só fase IA', () => {
    expect(isFeedbackCellAlreadyShown({ ...base, stage_type: 'fixed', exercise_feedback: true }, [fb])).toBe(false)
  })
})

describe('mainButtonState — um botão principal', () => {
  const idle: MainButtonInput = {
    contentOk: true,
    stageType: 'ai',
    exerciseDone: false,
    exerciseOptionsMissing: false,
    hasSelection: false,
    submitting: false,
    busy: false,
    busyReason: null,
    trailBusyLabel: 'Salvando progresso…',
    continuarLeaving: false,
    advanceInFlight: false,
    mariaInFlight: false,
    hasMariaDraft: false,
    offline: false,
    canRetry: false,
  }

  it('exercício sem opção: Enviar resposta desabilitado', () => {
    const s = mainButtonState({ ...idle, stageType: 'exercise' })
    expect(s).toMatchObject({ visible: true, action: 'submit', label: MAIN_BUTTON_SUBMIT_LABEL, disabled: true })
  })
  it('exercício com opção: Enviar resposta habilitado', () => {
    const s = mainButtonState({ ...idle, stageType: 'exercise', hasSelection: true })
    expect(s).toMatchObject({ action: 'submit', label: MAIN_BUTTON_SUBMIT_LABEL, disabled: false })
  })
  it('enviando: Enviando resposta… ocupado', () => {
    const s = mainButtonState({ ...idle, stageType: 'exercise', hasSelection: true, submitting: true, busy: true, busyReason: 'exercise' })
    expect(s).toMatchObject({ label: MAIN_BUTTON_SUBMITTING_LABEL, disabled: true, busy: true })
  })
  it('após o feedback: Continuar (sem auto-avanço — só ação do aluno)', () => {
    const s = mainButtonState({ ...idle, stageType: 'exercise', exerciseDone: true })
    expect(s).toMatchObject({ action: 'advance', label: MAIN_BUTTON_CONTINUE_LABEL, disabled: false })
  })
  it('aula / texto fixo: Continuar', () => {
    expect(mainButtonState({ ...idle, stageType: 'fixed' }).label).toBe(MAIN_BUTTON_CONTINUE_LABEL)
    expect(mainButtonState(idle).action).toBe('advance')
  })
  it('Maria respondendo: Continuar desabilitado; depois habilita', () => {
    expect(mainButtonState({ ...idle, busy: true, busyReason: 'maria', mariaInFlight: true })).toMatchObject({
      action: 'advance', label: MAIN_BUTTON_CONTINUE_LABEL, disabled: true,
    })
    expect(mainButtonState(idle)).toMatchObject({ action: 'advance', disabled: false })
  })
  it('sidechat Maria: Continuar sai sem avançar', () => {
    expect(mainButtonState({ ...idle, mariaSidechat: true })).toMatchObject({
      visible: true,
      action: 'exit_maria',
      label: MAIN_BUTTON_CONTINUE_LABEL,
    })
  })
  it('rascunho para a Maria pausa o Continuar', () => {
    expect(mainButtonState({ ...idle, hasMariaDraft: true }).disabled).toBe(true)
  })
  it('erro de rede/sistema (Tentar de novo) esconde o botão — recovery único', () => {
    expect(mainButtonState({ ...idle, canRetry: true }).visible).toBe(false)
  })
  it('falha ao enviar resposta: Enviar resposta continua (não vira Tentar)', () => {
    const s = mainButtonState({ ...idle, stageType: 'exercise', hasSelection: true })
    expect(s.label).toBe(MAIN_BUTTON_SUBMIT_LABEL)
  })
  it('avançando: rótulo de progresso, desabilitado', () => {
    const s = mainButtonState({ ...idle, busy: true, busyReason: 'trail' })
    expect(s).toMatchObject({ label: 'Salvando progresso…', disabled: true, busy: true })
  })
  it('sem conteúdo: escondido', () => {
    expect(mainButtonState({ ...idle, contentOk: false }).visible).toBe(false)
  })
})
