import { useEffect, useMemo, useRef } from 'react'
import {
  StudentConversationChat,
  type StudentChatBubble,
} from '../components/trilha/StudentConversationChat'
import { ExerciseAnswerForm } from '../components/trilha/ExerciseAnswerForm'
import { TrilhaEmptyState } from '../components/trilha/TrilhaEmptyState'
import { TrilhaErrorBanner } from '../components/trilha/TrilhaErrorBanner'
import { WaSyncBadge } from '../components/trilha/WaSyncBadge'
import { unitPositionLabel } from '../../lib/trilha/trailPath'

export type TrilhaPlayerPageViewProps = {
  stageNumber: number
  questionNumber: number
  totalQuestions?: number | null
  totalStages?: number | null
  stageType: 'fixed' | 'exercise' | 'ai'
  title?: string
  /** Corpo do passo atual (para bolha efémera se ainda não estiver nos logs). */
  body: string
  options: { key: string; label: string }[] | null
  nextAction:
    | 'deliver_content'
    | 'await_answer'
    | 'await_release'
    | 'blocked'
    | 'completed'
  submitting: boolean
  answerValue: string
  loadState: 'loading' | 'ready' | 'error'
  errorMessage?: string
  conflictMessage?: string | null
  feedbackState?: 'correct' | 'incorrect' | 'recorded' | null
  victoryMessage?: string | null
  /** conversation_logs (cronológico). */
  chatMessages: StudentChatBubble[]
  onAnswerChange: (value: string) => void
  onContinue: () => void
  onSubmitAnswer: () => void
  onContinueAfterFeedback?: () => void
  onBack: () => void
  onRetry?: () => void
  onOpenHistory?: () => void
}

const TYPE_LABEL: Record<'fixed' | 'exercise' | 'ai', string> = {
  fixed: 'leitura',
  exercise: 'exercício',
  ai: 'IA',
}

function normText(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Une conversation_logs + bolha efémera do passo atual (resume sem ensure-ai).
 */
export function buildChatTimeline(input: {
  messages: StudentChatBubble[]
  body: string
  stageNumber: number
  questionNumber: number
  nextAction: TrilhaPlayerPageViewProps['nextAction']
}): StudentChatBubble[] {
  const base = [...input.messages]
  if (
    input.nextAction !== 'deliver_content' &&
    input.nextAction !== 'await_answer'
  ) {
    return base
  }
  const body = input.body.trim()
  if (!body) return base

  const already = base.some(
    (m) =>
      m.sender === 'system' &&
      m.stage_number === input.stageNumber &&
      m.question_number === input.questionNumber &&
      normText(m.message_text) === normText(body),
  )
  if (already) return base

  return [
    ...base,
    {
      id: `live-${input.stageNumber}-${input.questionNumber}`,
      sender: 'system',
      message_text: body,
      stage_number: input.stageNumber,
      question_number: input.questionNumber,
      created_at: null,
      created_at_brasilia: null,
      ephemeral: true,
    },
  ]
}

export function TrilhaPlayerPageView({
  stageNumber,
  questionNumber,
  totalQuestions = null,
  totalStages = null,
  stageType,
  title,
  body,
  options,
  nextAction,
  submitting,
  answerValue,
  loadState,
  errorMessage,
  conflictMessage,
  feedbackState = null,
  victoryMessage = null,
  chatMessages,
  onAnswerChange,
  onContinue,
  onSubmitAnswer,
  onContinueAfterFeedback,
  onBack,
  onRetry,
  onOpenHistory,
}: TrilhaPlayerPageViewProps) {
  const composerRef = useRef<HTMLDivElement | null>(null)

  const timeline = useMemo(
    () =>
      buildChatTimeline({
        messages: chatMessages,
        body,
        stageNumber,
        questionNumber,
        nextAction,
      }),
    [chatMessages, body, stageNumber, questionNumber, nextAction],
  )

  useEffect(() => {
    if (nextAction === 'await_answer' && !feedbackState) {
      const el = composerRef.current
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [nextAction, feedbackState, stageNumber, questionNumber])

  if (loadState === 'loading') {
    return (
      <div
        className="trilha-chat trilha-chat--skeleton"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="visually-hidden">A carregar a conversa da trilha…</p>
        <div className="trilha-skeleton trilha-skeleton--title" aria-hidden="true" />
        <div className="trilha-skeleton trilha-skeleton--block" aria-hidden="true" />
        <div className="trilha-skeleton trilha-skeleton--block" aria-hidden="true" />
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="trilha-chat">
        <h1 className="visually-hidden">Player da trilha</h1>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <span aria-hidden="true">← </span>
          Voltar ao mapa
        </button>
        <TrilhaErrorBanner
          message={errorMessage ?? 'Falha ao carregar a conversa.'}
          onRetry={onRetry}
        />
      </div>
    )
  }

  const hasTitle = Boolean(title?.trim())
  const heading = hasTitle
    ? title!.trim()
    : `Etapa ${stageNumber}, questão ${questionNumber}`
  const unitPos = unitPositionLabel(questionNumber, totalQuestions)
  const stagePos =
    typeof totalStages === 'number' && totalStages >= 1
      ? `Etapa ${stageNumber} de ${totalStages}`
      : `Etapa ${stageNumber}`

  const showComposer =
    nextAction === 'deliver_content' || nextAction === 'await_answer'

  return (
    <div className="trilha-chat trilha-chat--v1">
      <WaSyncBadge />
      <header className="trilha-chat__chrome">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <span aria-hidden="true">← </span>
          Voltar ao mapa
        </button>
        <div className="trilha-chat__chrome-mid">
          <p className="trilha-chat__brand">Crias</p>
          <p className="trilha-chat__pos">
            {stagePos}
            {unitPos ? ` · ${unitPos}` : ` · Questão ${questionNumber}`}
            {nextAction === 'deliver_content' || nextAction === 'await_answer' ? (
              <span className="trilha-player__type">{TYPE_LABEL[stageType]}</span>
            ) : nextAction === 'await_release' ? (
              <span className="trilha-player__type">pausado</span>
            ) : null}
          </p>
        </div>
        {onOpenHistory ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={onOpenHistory}
          >
            Revisão
          </button>
        ) : null}
      </header>

      <h1 className={hasTitle ? 'trilha-chat__heading' : 'visually-hidden'}>
        {heading}
      </h1>

      {conflictMessage ? (
        <p className="banner banner--info" role="status">
          {conflictMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <TrilhaErrorBanner message={errorMessage} onRetry={onRetry} />
      ) : null}

      {victoryMessage ? (
        <p
          className="trilha-chat__victory banner banner--success"
          role="status"
          aria-live="polite"
        >
          {victoryMessage}
        </p>
      ) : null}

      {nextAction === 'await_release' || nextAction === 'blocked' ? (
        <TrilhaEmptyState
          title="Pausa — aguardando liberação"
          message="O próximo conteúdo ainda não foi liberado. O seu progresso está seguro. Volte mais tarde ou fale com a escola."
          actionLabel="Voltar ao mapa"
          onAction={onBack}
        />
      ) : null}

      {nextAction === 'completed' ? (
        <TrilhaEmptyState
          title="Trilha concluída"
          message="Parabéns — concluiu esta trilha."
          actionLabel="Voltar ao mapa"
          onAction={onBack}
        />
      ) : null}

      {showComposer || timeline.length > 0 ? (
        <div className="trilha-chat__stage">
          <StudentConversationChat messages={timeline} />
        </div>
      ) : null}

      {showComposer ? (
        <footer className="trilha-chat__footer" ref={composerRef}>
          {nextAction === 'deliver_content' ? (
            <div className="trilha-chat__actions">
              <button
                type="button"
                className="btn btn--primary trilha-cta trilha-chat__continue"
                disabled={submitting}
                aria-busy={submitting || undefined}
                onClick={onContinue}
              >
                {submitting ? 'A preparar…' : 'Continuar'}
              </button>
              <p className="trilha-chat__safe muted">
                Pode sair; o progresso fica guardado.
              </p>
            </div>
          ) : feedbackState ? (
            <div className="trilha-chat__feedback" role="status" aria-live="polite">
              <p
                className={
                  feedbackState === 'correct'
                    ? 'trilha-player__feedback-msg trilha-player__feedback-msg--ok'
                    : 'trilha-player__feedback-msg'
                }
              >
                {feedbackState === 'correct'
                  ? 'Boa! Resposta correta.'
                  : feedbackState === 'incorrect'
                    ? 'Ainda não — mas o progresso segue. Pode rever depois na Revisão.'
                    : 'Resposta registada. Pode seguir para o próximo passo.'}
              </p>
              <button
                type="button"
                className="btn btn--primary trilha-cta"
                onClick={onContinueAfterFeedback ?? onContinue}
              >
                Continuar
              </button>
            </div>
          ) : (
            <div className="trilha-chat__composer">
              <p className="trilha-chat__composer-label">Responder</p>
              <ExerciseAnswerForm
                options={options}
                value={answerValue}
                submitting={submitting}
                onChange={onAnswerChange}
                onSubmit={onSubmitAnswer}
                submitLabel="Responder"
              />
            </div>
          )}
        </footer>
      ) : null}
    </div>
  )
}
