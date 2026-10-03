import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import {
  advanceTrail,
  askMaria,
  createConversationLog,
  fetchNextContent,
  fetchTrailHistory,
  normalizeExerciseOptions,
  submitExerciseAttempt,
  type ConversationLogRow,
  type ExerciseOption,
  type NextContentOk,
  type NextContentStatus,
} from '../lib/api'
import { getSession } from '../lib/session'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user' | 'system'
  text: string
  stageType?: NextContentOk['stage_type']
}

function contentToAssistantText(content: NextContentOk): string {
  const parts: string[] = []
  if (content.stage_title) parts.push(content.stage_title)
  if (content.content) parts.push(content.content)
  if (!content.content && content.stage_type === 'ai' && content.prompt) {
    parts.push('Gerando conteúdo da tutoria…')
  }
  return parts.join('\n\n') || 'Conteúdo da etapa.'
}

function statusToSystemText(content: NextContentStatus): string {
  if (content.status === 'blocked') {
    return (
      content.message ||
      'Esta etapa ainda não foi liberada pela instituição.'
    )
  }
  if (content.status === 'completed') {
    return content.message || 'Trilha concluída.'
  }
  return content.message || `Indisponível (${content.status}).`
}

function logsToMessages(logs: ConversationLogRow[]): ChatMessage[] {
  return logs
    .filter((l) => String(l.message_text ?? '').trim())
    .map((l) => ({
      id: l.id,
      role: l.sender === 'student' ? ('user' as const) : ('assistant' as const),
      text: l.message_text,
    }))
}

function isContinuarText(text: string): boolean {
  return text.trim().toLowerCase() === 'continuar'
}

export default function PlayerPage() {
  const { trailId = '' } = useParams()
  const session = getSession()!
  const [content, setContent] = useState<NextContentOk | NextContentStatus | null>(
    null,
  )
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [exerciseDone, setExerciseDone] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const deliveredKeyRef = useRef<string | null>(null)

  const persistLog = useCallback(
    async (input: {
      sender: 'system' | 'student'
      message_text: string
      stage_number: number
      question_number: number
      message_type?: 'text' | 'instruction' | 'exercise' | 'feedback' | null
      metadata?: Record<string, unknown> | null
    }) => {
      try {
        await createConversationLog({
          student_id: session.student_id,
          trail_id: trailId,
          institution_id: session.institution_id,
          ...input,
        })
      } catch {
        // não bloqueia a UI se a gravação falhar
      }
    },
    [session.institution_id, session.student_id, trailId],
  )

  const loadHistoryAndContent = useCallback(async () => {
    setError(null)
    setExerciseDone(false)
    setHistoryReady(false)
    try {
      const [logs, data] = await Promise.all([
        fetchTrailHistory(session.student_id, trailId),
        fetchNextContent(session.student_id, trailId),
      ])
      setMessages(logsToMessages(logs))
      setContent(data)
      setHistoryReady(true)

      if (data.status === 'ok') {
        const key = `${data.stage_number}-${data.question_number}`
        const already = logs.some(
          (l) =>
            l.sender === 'system' &&
            l.stage_number === data.stage_number &&
            l.question_number === data.question_number &&
            String(l.message_text ?? '').trim() ===
              contentToAssistantText(data).trim(),
        )
        // AI já persiste no ensure-ai; fixed/exercise gravam na primeira entrega.
        if (
          !already &&
          data.stage_type !== 'ai' &&
          deliveredKeyRef.current !== key
        ) {
          deliveredKeyRef.current = key
          const text = contentToAssistantText(data)
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${key}-${Date.now()}`,
              role: 'assistant',
              text,
              stageType: data.stage_type,
            },
          ])
          void persistLog({
            sender: 'system',
            message_text: text,
            stage_number: data.stage_number,
            question_number: data.question_number,
            message_type:
              data.stage_type === 'exercise' ? 'exercise' : 'instruction',
            metadata: { source: 'next-content', stage_type: data.stage_type },
          })
        } else if (data.stage_type === 'ai') {
          deliveredKeyRef.current = key
          const text = contentToAssistantText(data)
          const hasAi = logs.some(
            (l) =>
              l.sender === 'system' &&
              l.stage_number === data.stage_number &&
              l.question_number === data.question_number,
          )
          if (!hasAi && text) {
            setMessages((prev) => [
              ...prev,
              {
                id: `a-${key}-${Date.now()}`,
                role: 'assistant',
                text,
                stageType: 'ai',
              },
            ])
          }
        }
      } else {
        const key = `status-${data.status}`
        if (deliveredKeyRef.current !== key) {
          deliveredKeyRef.current = key
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${key}-${Date.now()}`,
              role: 'system',
              text: statusToSystemText(data),
            },
          ])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar.')
      setContent(null)
      setHistoryReady(true)
    }
  }, [persistLog, session.student_id, trailId])

  useEffect(() => {
    deliveredKeyRef.current = null
    setMessages([])
    setDraft('')
    void loadHistoryAndContent()
  }, [trailId, loadHistoryAndContent])

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, content, exerciseDone])

  useEffect(() => {
    if (content?.status === 'ok') inputRef.current?.focus()
  }, [content])

  async function doAdvance(userLine: string) {
    if (content?.status !== 'ok') return
    setBusy(true)
    setError(null)
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: userLine },
    ])
    setDraft('')
    await persistLog({
      sender: 'student',
      message_text: userLine,
      stage_number: content.stage_number,
      question_number: content.question_number,
      message_type: 'text',
      metadata: { source: 'continuar' },
    })
    try {
      const result = await advanceTrail(session.student_id, trailId)
      if (result.status === 'ok' && result.completed) {
        setContent({
          status: 'completed',
          student_id: session.student_id,
          trail_id: trailId,
          message: 'Trilha concluída.',
        })
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: 'system',
            text: 'Parabéns! Você concluiu esta trilha.',
          },
        ])
      } else if (result.status === 'ok') {
        deliveredKeyRef.current = null
        await loadHistoryAndContent()
      } else {
        setContent(result as NextContentStatus)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao avançar.')
    } finally {
      setBusy(false)
    }
  }

  async function doMaria(userLine: string) {
    if (content?.status !== 'ok') return
    setBusy(true)
    setError(null)
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: userLine },
    ])
    setDraft('')
    try {
      const result = await askMaria({
        student_id: session.student_id,
        trail_id: trailId,
        message: userLine,
        stage_number: content.stage_number,
        question_number: content.question_number,
      })
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'assistant',
          text: result.reply,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao falar com Maria.')
    } finally {
      setBusy(false)
    }
  }

  async function onOptionClick(option: ExerciseOption) {
    if (busy || content?.status !== 'ok' || content.stage_type !== 'exercise') {
      return
    }
    setBusy(true)
    setError(null)
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: option.text },
    ])
    try {
      const attempt = await submitExerciseAttempt({
        student_id: session.student_id,
        institution_id: session.institution_id,
        trail_id: trailId,
        stage_number: content.stage_number,
        question_number: content.question_number,
        student_answer: option.key,
        feedback: content.explanation,
      })
      const resultLabel =
        attempt.score === null
          ? 'Resposta registrada.'
          : attempt.is_correct
            ? 'Resposta correta!'
            : 'Resposta incorreta.'
      const feedbackParts = [
        resultLabel,
        content.explanation?.trim() || null,
      ].filter(Boolean)
      const feedbackText = feedbackParts.join('\n\n')
      setMessages((prev) => [
        ...prev,
        {
          id: `f-${Date.now()}`,
          role: 'assistant',
          text: feedbackText,
          stageType: 'exercise',
        },
      ])
      await persistLog({
        sender: 'student',
        message_text: option.text,
        stage_number: content.stage_number,
        question_number: content.question_number,
        message_type: 'exercise',
        metadata: {
          source: 'exercise_attempt',
          option_key: option.key,
          is_correct: attempt.is_correct,
          attempt_number: attempt.attempt_number,
        },
      })
      await persistLog({
        sender: 'system',
        message_text: feedbackText,
        stage_number: content.stage_number,
        question_number: content.question_number,
        message_type: 'feedback',
        metadata: { source: 'exercise_feedback' },
      })
      setExerciseDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no exercício.')
    } finally {
      setBusy(false)
    }
  }

  async function onSend(event?: FormEvent) {
    event?.preventDefault()
    if (busy || content?.status !== 'ok') return
    const trimmed = draft.trim()
    if (!trimmed) return

    if (isContinuarText(trimmed)) {
      if (content.stage_type === 'exercise' && !exerciseDone) {
        setError('Escolha uma opção do exercício antes de continuar.')
        return
      }
      await doAdvance('Continuar')
      return
    }

    await doMaria(trimmed)
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSend()
    }
  }

  const canSend = content?.status === 'ok' && !busy
  const showContinuar =
    content?.status === 'ok' &&
    !busy &&
    (content.stage_type === 'fixed' ||
      content.stage_type === 'ai' ||
      (content.stage_type === 'exercise' && exerciseDone))

  const options =
    content?.status === 'ok' && content.stage_type === 'exercise'
      ? normalizeExerciseOptions(content.options)
      : []

  const placeholder =
    content?.status !== 'ok'
      ? 'Trilha indisponível no momento'
      : content.stage_type === 'exercise' && !exerciseDone
        ? 'Tire uma dúvida com Maria ou escolha uma opção…'
        : 'Pergunte à Maria ou digite continuar…'

  return (
    <div className="chat-thread">
      {error ? (
        <p className="error chat-thread__banner" role="alert">
          {error}
        </p>
      ) : null}

      <div className="chat-thread__scroll" ref={threadRef}>
        {messages.map((msg) => (
          <article
            key={msg.id}
            className={`chat-bubble chat-bubble--${msg.role}`}
            data-stage-type={msg.stageType}
          >
            <p className="chat-bubble__label">
              {msg.role === 'assistant'
                ? 'Maria'
                : msg.role === 'user'
                  ? 'Você'
                  : 'Sistema'}
            </p>
            <div className="chat-bubble__body">
              {msg.text.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00a0'}</p>
              ))}
            </div>
          </article>
        ))}

        {!historyReady || !content ? (
          <p className="muted chat-thread__loading">Carregando…</p>
        ) : null}

        {content?.status === 'ok' &&
        content.stage_type === 'exercise' &&
        !exerciseDone &&
        options.length > 0 ? (
          <div className="chat-exercise" role="group" aria-label="Opções">
            <p className="chat-exercise__legend">Escolha uma opção</p>
            <div className="chat-exercise__options">
              {options.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className="chat-exercise__option"
                  disabled={busy}
                  onClick={() => void onOptionClick(opt)}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showContinuar ? (
          <div className="chat-continue">
            <button
              type="button"
              className="chat-continue__btn"
              disabled={busy}
              onClick={() => void doAdvance('Continuar')}
            >
              Continuar
            </button>
          </div>
        ) : null}
      </div>

      <footer className="chat-composer">
        <form className="chat-composer__form" onSubmit={(e) => void onSend(e)}>
          <textarea
            ref={inputRef}
            className="chat-composer__input"
            rows={1}
            value={draft}
            disabled={!canSend}
            placeholder={placeholder}
            aria-label="Mensagem"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onComposerKeyDown}
          />
          <button
            type="submit"
            disabled={!canSend || !draft.trim()}
            aria-label="Enviar"
          >
            {busy ? '…' : 'Enviar'}
          </button>
        </form>
        {content?.status === 'ok' ? (
          <p className="muted chat-composer__hint">
            Enter envia · Shift+Enter quebra linha · texto livre fala com Maria ·
            Continuar avança a trilha
          </p>
        ) : null}
      </footer>
    </div>
  )
}
