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

/** Remove *markdown* / # headings soltos usados como título. */
function stripDecorTitle(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^#{1,6}\s+/, '')
  // *Explicação* ou **Explicação**
  const starred = s.match(/^\*{1,3}([^*]+)\*{1,3}$/)
  if (starred) return starred[1].trim()
  return s
}

function normalizeTitleKey(raw: string): string {
  return stripDecorTitle(raw)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Remove linhas de opções lettered do enunciado (botões já mostram as opções). */
function stripOptionLines(text: string): string {
  const re = /^\s*\(?([A-Za-z])\)?\s*[\)\.\:]\s+.+\s*$/
  return text
    .split(/\r?\n/)
    .filter((line) => !re.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Monta texto da bolha sem duplicar título (stage_title + "*Explicação*" no content).
 */
function contentToAssistantText(
  content: NextContentOk,
  opts?: { stripOptions?: boolean },
): string {
  const title = content.stage_title
    ? stripDecorTitle(content.stage_title)
    : ''
  let body = (content.content ?? '').trim()

  if (!body && content.stage_type === 'ai' && content.prompt) {
    body = 'Gerando conteúdo da tutoria…'
  }

  if (opts?.stripOptions) {
    body = stripOptionLines(body)
  }

  if (title && body) {
    const lines = body.split(/\n/)
    const firstKey = normalizeTitleKey(lines[0] ?? '')
    if (firstKey && firstKey === normalizeTitleKey(title)) {
      body = lines.slice(1).join('\n').replace(/^\n+/, '').trim()
    }
  }

  const parts: string[] = []
  if (title) parts.push(title)
  if (body) parts.push(body)
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

function cellHasExerciseFeedback(
  logs: ConversationLogRow[],
  stageNumber: number,
  questionNumber: number,
): boolean {
  return logs.some(
    (l) =>
      l.sender === 'system' &&
      l.stage_number === stageNumber &&
      l.question_number === questionNumber &&
      (l.message_type === 'feedback' ||
        (l.metadata &&
          typeof l.metadata === 'object' &&
          (l.metadata as { source?: string }).source === 'exercise_feedback')),
  )
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
  /** Após resposta da Maria (sidechat): esconde Continuar e mostra Voltar. */
  const [mariaSidechat, setMariaSidechat] = useState(false)
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
    setMariaSidechat(false)
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
        const options =
          data.stage_type === 'exercise'
            ? normalizeExerciseOptions(data.options)
            : []
        const text = contentToAssistantText(data, {
          stripOptions: options.length > 0,
        })

        if (data.stage_type === 'exercise') {
          setExerciseDone(
            cellHasExerciseFeedback(
              logs,
              data.stage_number,
              data.question_number,
            ),
          )
        }

        const already = logs.some(
          (l) =>
            l.sender === 'system' &&
            l.stage_number === data.stage_number &&
            l.question_number === data.question_number &&
            String(l.message_text ?? '').trim() === text.trim(),
        )
        // AI já persiste no ensure-ai; fixed/exercise gravam na primeira entrega.
        if (
          !already &&
          data.stage_type !== 'ai' &&
          deliveredKeyRef.current !== key
        ) {
          deliveredKeyRef.current = key
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
          const hasAi = logs.some(
            (l) =>
              l.sender === 'system' &&
              l.stage_number === data.stage_number &&
              l.question_number === data.question_number &&
              (l.message_type === 'instruction' ||
                (l.metadata &&
                  typeof l.metadata === 'object' &&
                  (l.metadata as { source?: string }).source === 'trail-ai')),
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
    setMariaSidechat(false)
    void loadHistoryAndContent()
  }, [trailId, loadHistoryAndContent])

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, content, exerciseDone, mariaSidechat])

  useEffect(() => {
    if (content?.status === 'ok' && content.stage_type !== 'exercise') {
      inputRef.current?.focus()
    }
  }, [content])

  /**
   * Após Continuar: só busca next-content (não recarrega 700+ logs do histórico).
   * O advance já aquece IA do destino quando necessário.
   */
  async function loadNextAfterAdvance() {
    setExerciseDone(false)
    setMariaSidechat(false)
    const data = await fetchNextContent(session.student_id, trailId)
    setContent(data)
    if (data.status !== 'ok') {
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
      return
    }

    const key = `${data.stage_number}-${data.question_number}`
    const options =
      data.stage_type === 'exercise'
        ? normalizeExerciseOptions(data.options)
        : []
    const text = contentToAssistantText(data, {
      stripOptions: options.length > 0,
    })
    deliveredKeyRef.current = key

    if (data.stage_type === 'exercise') {
      setExerciseDone(false)
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${key}-${Date.now()}`,
          role: 'assistant',
          text,
          stageType: 'exercise',
        },
      ])
      void persistLog({
        sender: 'system',
        message_text: text,
        stage_number: data.stage_number,
        question_number: data.question_number,
        message_type: 'exercise',
        metadata: { source: 'next-content', stage_type: 'exercise' },
      })
      return
    }

    if (data.stage_type === 'ai') {
      if (text) {
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
      return
    }

    // fixed
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
      message_type: 'instruction',
      metadata: { source: 'next-content', stage_type: data.stage_type },
    })
  }

  async function doAdvance(userLine: string) {
    if (content?.status !== 'ok') return
    setBusy(true)
    setError(null)
    setMariaSidechat(false)
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
        await loadNextAfterAdvance()
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
    // Exercício: Maria bloqueada até Continuar após o feedback.
    if (content.stage_type === 'exercise') return
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
      setMariaSidechat(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao falar com Maria.')
    } finally {
      setBusy(false)
    }
  }

  function onVoltarParaTrilha() {
    setMariaSidechat(false)
    setError(null)
  }

  async function onOptionClick(option: ExerciseOption) {
    if (busy || content?.status !== 'ok' || content.stage_type !== 'exercise') {
      return
    }
    if (exerciseDone) return
    setBusy(true)
    setError(null)
    setMariaSidechat(false)
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
    // Exercício: sem free-text / Maria até sair da etapa via Continuar.
    if (content.stage_type === 'exercise') return
    const trimmed = draft.trim()
    if (!trimmed) return

    if (isContinuarText(trimmed)) {
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

  const onExerciseStep =
    content?.status === 'ok' && content.stage_type === 'exercise'
  const composerBlocked = onExerciseStep || busy || content?.status !== 'ok'
  const canSend =
    content?.status === 'ok' &&
    !busy &&
    content.stage_type !== 'exercise' &&
    !composerBlocked

  const showContinuar =
    content?.status === 'ok' &&
    !busy &&
    !mariaSidechat &&
    (content.stage_type === 'fixed' ||
      content.stage_type === 'ai' ||
      (content.stage_type === 'exercise' && exerciseDone))

  const showVoltarTrilha =
    content?.status === 'ok' && !busy && mariaSidechat

  const options =
    content?.status === 'ok' && content.stage_type === 'exercise'
      ? normalizeExerciseOptions(content.options)
      : []

  const placeholder =
    content?.status !== 'ok'
      ? 'Trilha indisponível no momento'
      : content.stage_type === 'exercise'
        ? 'Escolha uma das opções'
        : mariaSidechat
          ? 'Pergunte mais à Maria ou volte para a trilha…'
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
                <p key={i}>{stripDecorTitle(line) || '\u00a0'}</p>
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

        {showVoltarTrilha ? (
          <div className="chat-continue chat-continue--sidechat">
            <button
              type="button"
              className="chat-continue__btn chat-continue__btn--secondary"
              disabled={busy}
              onClick={onVoltarParaTrilha}
            >
              Voltar para trilha
            </button>
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
            disabled={composerBlocked}
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
            {content.stage_type === 'exercise'
              ? exerciseDone
                ? 'Use Continuar para avançar a trilha'
                : 'Escolha uma das opções acima para responder'
              : mariaSidechat
                ? 'Voltar para trilha restaura o Continuar da etapa'
                : 'Enter envia · Shift+Enter quebra linha · texto livre fala com Maria · Continuar avança a trilha'}
          </p>
        ) : null}
      </footer>
    </div>
  )
}
