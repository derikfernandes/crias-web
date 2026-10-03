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
import {
  alignBlocoWithAttempt,
  type ChatMessage,
  isContinuarText,
  lightStripMarkdown,
  logsToMessages,
  normalizeTitleKey,
  renderMessageLines,
  stripDecorTitle,
  trailCellKey,
  trailMessageId,
} from '../lib/trailMessages'

/** Quantas bolhas recentes ficam visíveis antes do colapso de histórico. */
const HISTORY_VISIBLE_TAIL = 28

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
  return lightStripMarkdown(parts.join('\n\n') || 'Conteúdo da etapa.')
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

/**
 * Entrega visual do passo: se a célula já existe, reancora no fim
 * (replay) em vez de no-op — corrige Continuar pós-Voltar (R01).
 * Retorna também se foi delivery nova (para evitar 2º log BE).
 */
function appendTrailMessage(
  prev: ChatMessage[],
  msg: ChatMessage,
): { messages: ChatMessage[]; isNew: boolean } {
  if (msg.cellKey) {
    const had = prev.some(
      (m) => m.cellKey === msg.cellKey || m.id === msg.id,
    )
    if (had) {
      const without = prev.filter(
        (m) => m.cellKey !== msg.cellKey && m.id !== msg.id,
      )
      return {
        messages: [
          ...without,
          {
            ...msg,
            id: `trail-replay-${msg.cellKey}-${Date.now()}`,
          },
        ],
        isNew: false,
      }
    }
  }
  if (prev.some((m) => m.id === msg.id)) {
    return { messages: prev, isNew: false }
  }
  return { messages: [...prev, msg], isNew: true }
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
  /** WS-D: colapsa bolhas antigas; expandir revela o histórico completo. */
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const deliveredKeyRef = useRef<string | null>(null)
  const contentRef = useRef(content)
  contentRef.current = content

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
        const key = trailCellKey(data.stage_number, data.question_number)
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
            (l.message_type === 'instruction' ||
              l.message_type === 'exercise' ||
              (l.metadata &&
                typeof l.metadata === 'object' &&
                ['trail-ai', 'next-content'].includes(
                  String((l.metadata as { source?: string }).source ?? ''),
                ))),
        )
        // AI já persiste no ensure-ai; fixed/exercise gravam na primeira entrega.
        if (
          !already &&
          data.stage_type !== 'ai' &&
          deliveredKeyRef.current !== key
        ) {
          deliveredKeyRef.current = key
          const msgId = trailMessageId(data.stage_number, data.question_number)
          let isNew = false
          setMessages((prev) => {
            const result = appendTrailMessage(prev, {
              id: msgId,
              role: 'assistant',
              text,
              stageType: data.stage_type,
              cellKey: key,
            })
            isNew = result.isNew
            return result.messages
          })
          if (isNew) {
            void persistLog({
              sender: 'system',
              message_text: text,
              stage_number: data.stage_number,
              question_number: data.question_number,
              message_type:
                data.stage_type === 'exercise' ? 'exercise' : 'instruction',
              metadata: { source: 'next-content', stage_type: data.stage_type },
            })
          }
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
            const msgId = trailMessageId(data.stage_number, data.question_number)
            setMessages((prev) =>
              appendTrailMessage(prev, {
                id: msgId,
                role: 'assistant',
                text,
                stageType: 'ai',
                cellKey: key,
              }).messages,
            )
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
    setHistoryExpanded(false)
    void loadHistoryAndContent()
  }, [trailId, loadHistoryAndContent])

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, content, exerciseDone, mariaSidechat, busy])

  useEffect(() => {
    if (content?.status === 'ok' && content.stage_type !== 'exercise') {
      inputRef.current?.focus()
    }
  }, [content])

  /**
   * Após Continuar: só busca next-content (não recarrega 700+ logs).
   * Dedupe por célula; em erro reconcilia content.
   */
  async function loadNextAfterAdvance() {
    setExerciseDone(false)
    setMariaSidechat(false)
    try {
      const data = await fetchNextContent(session.student_id, trailId)
      // Atualiza content ANTES de liberar composer (evita exercício fantasma).
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

      const key = trailCellKey(data.stage_number, data.question_number)
      const options =
        data.stage_type === 'exercise'
          ? normalizeExerciseOptions(data.options)
          : []
      const text = contentToAssistantText(data, {
        stripOptions: options.length > 0,
      })
      deliveredKeyRef.current = key
      const msgId = trailMessageId(data.stage_number, data.question_number)

      if (data.stage_type === 'exercise') {
        setExerciseDone(false)
        let isNew = false
        setMessages((prev) => {
          const result = appendTrailMessage(prev, {
            id: msgId,
            role: 'assistant',
            text,
            stageType: 'exercise',
            cellKey: key,
          })
          isNew = result.isNew
          return result.messages
        })
        if (isNew) {
          void persistLog({
            sender: 'system',
            message_text: text,
            stage_number: data.stage_number,
            question_number: data.question_number,
            message_type: 'exercise',
            metadata: { source: 'next-content', stage_type: 'exercise' },
          })
        }
        return
      }

      if (data.stage_type === 'ai') {
        if (text) {
          setMessages((prev) =>
            appendTrailMessage(prev, {
              id: msgId,
              role: 'assistant',
              text,
              stageType: 'ai',
              cellKey: key,
            }).messages,
          )
        }
        return
      }

      // fixed
      let isNewFixed = false
      setMessages((prev) => {
        const result = appendTrailMessage(prev, {
          id: msgId,
          role: 'assistant',
          text,
          stageType: data.stage_type,
          cellKey: key,
        })
        isNewFixed = result.isNew
        return result.messages
      })
      if (isNewFixed) {
        void persistLog({
          sender: 'system',
          message_text: text,
          stage_number: data.stage_number,
          question_number: data.question_number,
          message_type: 'instruction',
          metadata: { source: 'next-content', stage_type: data.stage_type },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar etapa.')
      try {
        const reconciled = await fetchNextContent(session.student_id, trailId)
        setContent(reconciled)
      } catch {
        /* ignore */
      }
      throw err
    }
  }

  /** Avança sem bolha "VOCÊ: Continuar". */
  async function doAdvance() {
    if (content?.status !== 'ok') return
    setBusy(true)
    setError(null)
    setMariaSidechat(false)
    setDraft('')
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
        window.dispatchEvent(new CustomEvent('crias:trail-progress'))
      } else {
        setContent(result as NextContentStatus)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao avançar.')
      try {
        const reconciled = await fetchNextContent(session.student_id, trailId)
        setContent(reconciled)
      } catch {
        /* ignore */
      }
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
          text: lightStripMarkdown(result.reply),
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
    const current = contentRef.current
    if (current?.status !== 'ok') return

    const key = trailCellKey(current.stage_number, current.question_number)
    const resumeId = `trail-resume-${key}-${Date.now()}`
    const options =
      current.stage_type === 'exercise'
        ? normalizeExerciseOptions(current.options)
        : []
    const body = contentToAssistantText(current, {
      stripOptions: options.length > 0,
    })
    const text = `Continuando a trilha:\n\n${body}`

    setMessages((prev) => {
      const last = prev[prev.length - 1]
      // Evita flood: substitui resume consecutivo idêntico da mesma célula.
      const lastIsSameResume =
        !!last &&
        last.role === 'assistant' &&
        typeof last.id === 'string' &&
        last.id.startsWith(`trail-resume-${key}-`) &&
        last.text === text
      if (lastIsSameResume) {
        return [...prev.slice(0, -1), { ...last, id: resumeId, text }]
      }
      return [
        ...prev,
        {
          id: resumeId,
          role: 'assistant',
          text,
          stageType: current.stage_type,
          cellKey: undefined,
        },
      ]
    })
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
      let rich =
        content.explanation?.trim() ||
        attempt.pedagogical_feedback?.trim() ||
        null
      // R02: não misturar “Parabéns pelo acerto” com attempt errado.
      if (rich && attempt.score !== null) {
        rich = alignBlocoWithAttempt(rich, attempt.is_correct) || null
      }
      const feedbackParts = [resultLabel, rich].filter(Boolean)
      const feedbackText = feedbackParts.join('\n\n')
      setMessages((prev) => [
        ...prev,
        {
          id: `f-${Date.now()}`,
          role: 'assistant',
          text: lightStripMarkdown(feedbackText),
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
      // Mesmo path silencioso do botão — sem bolha "Continuar".
      await doAdvance()
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

  const hiddenHistoryCount = Math.max(0, messages.length - HISTORY_VISIBLE_TAIL)
  const visibleMessages =
    historyExpanded || hiddenHistoryCount === 0
      ? messages
      : messages.slice(messages.length - HISTORY_VISIBLE_TAIL)

  const placeholder =
    content?.status !== 'ok'
      ? 'Trilha indisponível no momento'
      : content.stage_type === 'exercise'
        ? 'Responda a questão'
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
        {!historyExpanded && hiddenHistoryCount > 0 ? (
          <div className="chat-history-collapse">
            <button
              type="button"
              className="chat-history-collapse__btn"
              onClick={() => setHistoryExpanded(true)}
            >
              Mostrar etapas anteriores ({hiddenHistoryCount})
            </button>
          </div>
        ) : null}
        {historyExpanded && hiddenHistoryCount > 0 ? (
          <div className="chat-history-collapse">
            <button
              type="button"
              className="chat-history-collapse__btn"
              onClick={() => setHistoryExpanded(false)}
            >
              Recolher etapas anteriores
            </button>
          </div>
        ) : null}
        {visibleMessages.map((msg) => (
          <article
            key={msg.id}
            className={`chat-bubble chat-bubble--${msg.role}`}
            data-stage-type={msg.stageType}
            data-cell-key={msg.cellKey || undefined}
          >
            <p className="chat-bubble__label">
              {msg.role === 'assistant'
                ? 'Maria'
                : msg.role === 'user'
                  ? 'Você'
                  : 'Sistema'}
            </p>
            <div className="chat-bubble__body">
              {renderMessageLines(msg.text).map((part) => {
                if (part.kind === 'image') {
                  return (
                    <p key={part.key} className="chat-bubble__media">
                      <img src={part.value} alt="" loading="lazy" />
                    </p>
                  )
                }
                if (part.kind === 'link') {
                  return (
                    <p key={part.key}>
                      <a
                        href={part.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chat-bubble__link"
                      >
                        {part.label || part.value}
                      </a>
                    </p>
                  )
                }
                return <p key={part.key}>{part.value || '\u00a0'}</p>
              })}
            </div>
          </article>
        ))}

        {busy ? (
          <article
            className="chat-bubble chat-bubble--assistant chat-bubble--typing"
            aria-live="polite"
            aria-label="Maria está digitando"
          >
            <p className="chat-bubble__label">Maria</p>
            <div className="chat-bubble__body">
              <span className="typing-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          </article>
        ) : null}

        {!historyReady || !content ? (
          <p className="muted chat-thread__loading">Carregando…</p>
        ) : null}

        {content?.status === 'ok' &&
        content.stage_type === 'exercise' &&
        !exerciseDone &&
        options.length > 0 ? (
          <div className="chat-exercise" role="group" aria-label="Opções">
            <p className="chat-exercise__legend">Responda a questão</p>
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
              onClick={() => void doAdvance()}
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
            Enviar
          </button>
        </form>
        {content?.status === 'ok' ? (
          <p className="muted chat-composer__hint">
            {content.stage_type === 'exercise'
              ? exerciseDone
                ? 'Use Continuar para avançar a trilha'
                : 'Responda a questão pelas opções acima'
              : mariaSidechat
                ? 'Voltar para trilha reexibe o passo atual'
                : 'Enter envia · Shift+Enter quebra linha · texto livre fala com Maria · Continuar avança a trilha'}
          </p>
        ) : null}
      </footer>
    </div>
  )
}
