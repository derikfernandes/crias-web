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
  fetchTrailHistoryPage,
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

/** Página inicial do history API (position-aware no BE). */
const HISTORY_PAGE_LIMIT = 40

/** Evita flash de typing em respostas rápidas (cache-hit). */
const TYPING_MIN_DELAY_MS = 280

/** Distância do fim para considerar “sticky bottom”. */
const STICKY_BOTTOM_PX = 120

function isScrollNearBottom(el: HTMLElement, px = STICKY_BOTTOM_PX): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < px
}

type BusyReason = 'maria' | 'trail' | 'exercise' | null

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

function markAnimate(msg: ChatMessage, extra?: Partial<ChatMessage>): ChatMessage {
  return { ...msg, animate: true, ...extra }
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
  const animated = markAnimate(msg)
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
            ...animated,
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
  return { messages: [...prev, animated], isNew: true }
}

function bubbleClassName(msg: ChatMessage): string {
  const parts = [`chat-bubble`, `chat-bubble--${msg.role}`]
  if (msg.animate) {
    parts.push('chat-bubble--enter')
    if (msg.role === 'user') parts.push('chat-bubble--enter-user')
    else if (msg.role === 'assistant') parts.push('chat-bubble--enter-assistant')
    if (msg.kind === 'resume') parts.push('chat-bubble--resume-flash')
  }
  return parts.join(' ')
}

function typingCopy(reason: BusyReason): {
  label: string
  aria: string
  reduced: string
} {
  if (reason === 'maria') {
    return {
      label: 'Maria',
      aria: 'Maria está digitando',
      reduced: 'Maria está digitando…',
    }
  }
  if (reason === 'exercise') {
    return {
      label: 'Crias',
      aria: 'Preparando feedback da questão',
      reduced: 'Preparando feedback…',
    }
  }
  return {
    label: 'Preparando etapa…',
    aria: 'Preparando próxima etapa da trilha',
    reduced: 'Preparando etapa…',
  }
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
  const [busyReason, setBusyReason] = useState<BusyReason>(null)
  const [showTyping, setShowTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [exerciseDone, setExerciseDone] = useState(false)
  const [pendingOptionKey, setPendingOptionKey] = useState<string | null>(null)
  /** Após resposta da Maria (sidechat): esconde Continuar e mostra Voltar. */
  const [mariaSidechat, setMariaSidechat] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  /** WS-D: colapsa bolhas antigas; expandir revela páginas anteriores. */
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false)
  const [newMsgChip, setNewMsgChip] = useState(false)
  const [continuarLeaving, setContinuarLeaving] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const deliveredKeyRef = useRef<string | null>(null)
  const contentRef = useRef(content)
  const nearBottomRef = useRef(true)
  /** Usuário leu histórico acima: não auto-scroll até chip/click ou voltar ao fim. */
  const pinnedAwayRef = useRef(false)
  const pinnedScrollTopRef = useRef(0)
  const pinLockRafRef = useRef<number | null>(null)
  /** Segura pin além do busy — layout/focus pós-Continuar ainda puxam o scroll. */
  const pinHoldUntilRef = useRef(0)
  const busyReasonRef = useRef<BusyReason>(null)
  const skipSmoothScrollRef = useRef(true)
  const reduceMotionRef = useRef(false)
  const historyBeforeRef = useRef<number | null>(null)
  const oldestLogMsRef = useRef<number | null>(null)
  contentRef.current = content
  busyReasonRef.current = busyReason

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotionRef.current = mq.matches
    const onChange = () => {
      reduceMotionRef.current = mq.matches
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  /** Typing só após delay mínimo — evita flash em cache hit. */
  useEffect(() => {
    if (!busy) {
      setShowTyping(false)
      return
    }
    const t = window.setTimeout(() => setShowTyping(true), TYPING_MIN_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [busy])

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
    setPendingOptionKey(null)
    setMariaSidechat(false)
    setHistoryReady(false)
    setHistoryExpanded(false)
    setHistoryHasMore(false)
    setNewMsgChip(false)
    historyBeforeRef.current = null
    oldestLogMsRef.current = null
    skipSmoothScrollRef.current = true
    try {
      // next-content primeiro — CTA não espera history.
      const contentPromise = fetchNextContent(session.student_id, trailId)
      const historyPromise = fetchTrailHistoryPage(
        session.student_id,
        trailId,
        { limit: HISTORY_PAGE_LIMIT },
      )

      const data = await contentPromise
      setContent(data)

      if (data.status !== 'ok') {
        const key = `status-${data.status}`
        if (deliveredKeyRef.current !== key) {
          deliveredKeyRef.current = key
          setMessages((prev) => [
            ...prev,
            markAnimate({
              id: `sys-${key}-${Date.now()}`,
              role: 'system',
              text: statusToSystemText(data),
            }),
          ])
        }
        setHistoryReady(true)
        void historyPromise.catch(() => undefined)
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

      // Libera composer/CTA assim que o passo atual existe.
      setHistoryReady(true)

      let logs: ConversationLogRow[] = []
      try {
        const page = await historyPromise
        logs = page.logs
        setHistoryHasMore(page.has_more)
        historyBeforeRef.current = page.next_before
        const oldest = logs[0]
        oldestLogMsRef.current =
          typeof oldest?.created_at_ms === 'number'
            ? oldest.created_at_ms
            : page.next_before
      } catch {
        logs = []
        setHistoryHasMore(false)
      }
      // History: sem animate — evita cascata no mount/relogin.
      setMessages(logsToMessages(logs))

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
        if (text) {
          const msgId = trailMessageId(data.stage_number, data.question_number)
          // Sempre alinha a bolha da célula ao next-content atual
          // (cache regenerado pode diferir do log antigo no history).
          setMessages((prev) => {
            const idx = prev.findIndex(
              (m) => m.id === msgId || m.cellKey === key,
            )
            if (idx >= 0) {
              if (prev[idx].text === text) return prev
              const next = [...prev]
              next[idx] = {
                ...prev[idx],
                text,
                stageType: 'ai',
                cellKey: key,
              }
              return next
            }
            return appendTrailMessage(prev, {
              id: msgId,
              role: 'assistant',
              text,
              stageType: 'ai',
              cellKey: key,
            }).messages
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar.')
      setContent(null)
      setHistoryReady(true)
    }
  }, [persistLog, session.student_id, trailId])

  const loadOlderHistory = useCallback(async () => {
    if (historyLoadingMore || !historyHasMore) return
    const before = historyBeforeRef.current
    if (before == null) {
      setHistoryHasMore(false)
      return
    }
    setHistoryLoadingMore(true)
    const el = threadRef.current
    const prevHeight = el?.scrollHeight ?? 0
    const prevTop = el?.scrollTop ?? 0
    try {
      const page = await fetchTrailHistoryPage(session.student_id, trailId, {
        limit: HISTORY_PAGE_LIMIT,
        before,
      })
      setHistoryHasMore(page.has_more)
      historyBeforeRef.current = page.next_before
      if (page.logs.length === 0) return
      const older = logsToMessages(page.logs)
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id))
        const merged = older.filter((m) => !seen.has(m.id))
        return [...merged, ...prev]
      })
      // Mantém o viewport no mesmo conteúdo após prepend.
      requestAnimationFrame(() => {
        const scroller = threadRef.current
        if (!scroller) return
        const delta = scroller.scrollHeight - prevHeight
        scroller.scrollTop = prevTop + delta
        pinnedAwayRef.current = true
        nearBottomRef.current = false
        pinnedScrollTopRef.current = scroller.scrollTop
      })
    } catch {
      /* ignore — botão permanece */
    } finally {
      setHistoryLoadingMore(false)
    }
  }, [
    historyHasMore,
    historyLoadingMore,
    session.student_id,
    trailId,
  ])

  useEffect(() => {
    deliveredKeyRef.current = null
    setMessages([])
    setDraft('')
    setMariaSidechat(false)
    setHistoryExpanded(false)
    setPendingOptionKey(null)
    setBusy(false)
    setBusyReason(null)
    setContinuarLeaving(false)
    void loadHistoryAndContent()
  }, [trailId, loadHistoryAndContent])

  function capturePinFromScroll() {
    const el = threadRef.current
    if (!el) return false
    // Mede o DOM real — scrollTop programático pode não disparar onScroll.
    if (!isScrollNearBottom(el)) {
      pinnedAwayRef.current = true
      nearBottomRef.current = false
      pinnedScrollTopRef.current = el.scrollTop
      return true
    }
    pinnedAwayRef.current = false
    nearBottomRef.current = true
    return false
  }

  function isPinLocked(): boolean {
    return (
      pinnedAwayRef.current &&
      (busyReasonRef.current === 'trail' || Date.now() < pinHoldUntilRef.current)
    )
  }

  function startPinLock(holdMs = 2500) {
    pinHoldUntilRef.current = Date.now() + holdMs
    if (pinLockRafRef.current != null) return
    const tick = () => {
      const el = threadRef.current
      if (el && isPinLocked()) {
        if (el.scrollTop !== pinnedScrollTopRef.current) {
          el.scrollTop = pinnedScrollTopRef.current
        }
        nearBottomRef.current = false
        pinLockRafRef.current = requestAnimationFrame(tick)
        return
      }
      pinLockRafRef.current = null
    }
    pinLockRafRef.current = requestAnimationFrame(tick)
  }

  function stopPinLock() {
    if (pinLockRafRef.current != null) {
      cancelAnimationFrame(pinLockRafRef.current)
      pinLockRafRef.current = null
    }
  }

  function updateNearBottom() {
    const el = threadRef.current
    if (!el) return
    // Durante/após Continuar com pin: trava scrollTop.
    if (isPinLocked()) {
      if (el.scrollTop !== pinnedScrollTopRef.current) {
        el.scrollTop = pinnedScrollTopRef.current
      }
      nearBottomRef.current = false
      return
    }
    const near = isScrollNearBottom(el)
    nearBottomRef.current = near
    if (near) {
      pinnedAwayRef.current = false
      setNewMsgChip(false)
    } else {
      pinnedAwayRef.current = true
      pinnedScrollTopRef.current = el.scrollTop
    }
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    const el = threadRef.current
    if (!el) return
    stopPinLock()
    pinHoldUntilRef.current = 0
    pinnedAwayRef.current = false
    nearBottomRef.current = true
    setNewMsgChip(false)
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduceMotionRef.current ? 'auto' : behavior,
    })
  }

  /** C2-10: ancora no passo corrente (ou CTA) — não consulta pin. */
  function scrollCurrentStepIntoView(behavior: ScrollBehavior = 'smooth') {
    const el = threadRef.current
    if (!el) return
    const current = contentRef.current
    if (current?.status !== 'ok') {
      scrollToBottom(behavior)
      return
    }
    const key = trailCellKey(current.stage_number, current.question_number)
    const bubble = el.querySelector(
      `[data-cell-key="${key}"]`,
    ) as HTMLElement | null
    const cta = el.querySelector('.chat-cta-slot') as HTMLElement | null
    const target = cta || bubble
    if (target) {
      target.scrollIntoView({
        block: 'nearest',
        behavior: reduceMotionRef.current ? 'auto' : behavior,
      })
      nearBottomRef.current = isScrollNearBottom(el)
      pinnedAwayRef.current = !nearBottomRef.current
      if (nearBottomRef.current) setNewMsgChip(false)
      return
    }
    scrollToBottom(behavior)
  }

  useEffect(() => {
    return () => stopPinLock()
  }, [])

  useEffect(() => {
    if (!historyReady) return
    if (skipSmoothScrollRef.current) {
      skipSmoothScrollRef.current = false
      // C2-10: no mount/resume, prefere a bolha/CTA do passo corrente ao sidechat.
      requestAnimationFrame(() => scrollCurrentStepIntoView('auto'))
      return
    }
    // Revalida pin pelo DOM (refs podem estar stale após scroll programático).
    const el = threadRef.current
    if (isPinLocked() || pinnedAwayRef.current) {
      if (el && isPinLocked()) el.scrollTop = pinnedScrollTopRef.current
      setNewMsgChip(true)
      return
    }
    if (el && !isScrollNearBottom(el)) {
      pinnedAwayRef.current = true
      nearBottomRef.current = false
      pinnedScrollTopRef.current = el.scrollTop
      setNewMsgChip(true)
      return
    }
    if (!nearBottomRef.current) {
      setNewMsgChip(true)
      return
    }
    scrollToBottom('smooth')
    // messages/busy/content drive presence; intentional deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, content, exerciseDone, mariaSidechat, showTyping, historyReady])

  useEffect(() => {
    if (content?.status === 'ok' && content.stage_type !== 'exercise') {
      // preventScroll: focus no composer não pode puxar .chat-thread__scroll (C2-40).
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [content])

  /**
   * Após Continuar: só busca next-content (não recarrega 700+ logs).
   * Dedupe por célula; em erro reconcilia content.
   */
  async function loadNextAfterAdvance() {
    setExerciseDone(false)
    setPendingOptionKey(null)
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
            markAnimate({
              id: `sys-${key}-${Date.now()}`,
              role: 'system',
              text: statusToSystemText(data),
            }),
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
    // Evita scrollIntoView do botão focado puxar a thread ao fundo (C2-40).
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    const pinned = capturePinFromScroll()
    if (pinned) {
      setNewMsgChip(true)
      startPinLock()
    }
    setContinuarLeaving(true)
    setBusy(true)
    setBusyReason('trail')
    busyReasonRef.current = 'trail'
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
          markAnimate({
            id: `sys-${Date.now()}`,
            role: 'system',
            text: 'Parabéns! Você concluiu esta trilha.',
          }),
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
      setBusyReason(null)
      busyReasonRef.current = null
      setContinuarLeaving(false)
      // Mantém lock ~1.2s — paint/focus pós-busy ainda tentam puxar o scroll.
      if (pinnedAwayRef.current && threadRef.current) {
        threadRef.current.scrollTop = pinnedScrollTopRef.current
        nearBottomRef.current = false
        setNewMsgChip(true)
        startPinLock(2500)
      } else {
        stopPinLock()
      }
    }
  }

  async function doMaria(userLine: string) {
    if (content?.status !== 'ok') return
    // Exercício: Maria bloqueada até Continuar após o feedback.
    if (content.stage_type === 'exercise') return
    setBusy(true)
    setBusyReason('maria')
    setError(null)
    setMessages((prev) => [
      ...prev,
      markAnimate({ id: `u-${Date.now()}`, role: 'user', text: userLine }),
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
        markAnimate({
          id: `m-${Date.now()}`,
          role: 'assistant',
          text: lightStripMarkdown(result.reply),
        }),
      ])
      setMariaSidechat(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao falar com Maria.')
    } finally {
      setBusy(false)
      setBusyReason(null)
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
    // C2-10: após Voltar, mostra o passo (não fica no sidechat acima).
    skipSmoothScrollRef.current = false
    requestAnimationFrame(() => {
      if (!capturePinFromScroll()) scrollCurrentStepIntoView()
    })

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
        return [
          ...prev.slice(0, -1),
          markAnimate({ ...last, id: resumeId, text, kind: 'resume' }),
        ]
      }
      return [
        ...prev,
        markAnimate({
          id: resumeId,
          role: 'assistant',
          text,
          stageType: current.stage_type,
          cellKey: undefined,
          kind: 'resume',
        }),
      ]
    })
  }

  async function onOptionClick(option: ExerciseOption) {
    if (busy || content?.status !== 'ok' || content.stage_type !== 'exercise') {
      return
    }
    if (exerciseDone) return
    setBusy(true)
    setBusyReason('exercise')
    setPendingOptionKey(option.key)
    setError(null)
    setMariaSidechat(false)
    setMessages((prev) => [
      ...prev,
      markAnimate({ id: `u-${Date.now()}`, role: 'user', text: option.text }),
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
        markAnimate({
          id: `f-${Date.now()}`,
          role: 'assistant',
          text: lightStripMarkdown(feedbackText),
          stageType: 'exercise',
          kind: 'feedback',
        }),
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
        metadata: {
          source: 'exercise_feedback',
          is_correct: attempt.is_correct,
          score: attempt.score,
        },
      })
      setExerciseDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no exercício.')
      setPendingOptionKey(null)
    } finally {
      setBusy(false)
      setBusyReason(null)
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
    !continuarLeaving &&
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
  const showHistoryCollapse =
    historyHasMore || hiddenHistoryCount > 0
  const visibleMessages =
    historyExpanded || hiddenHistoryCount === 0
      ? messages
      : messages.slice(messages.length - HISTORY_VISIBLE_TAIL)

  async function onExpandHistory() {
    setHistoryExpanded(true)
    if (historyHasMore) {
      await loadOlderHistory()
    }
  }

  const placeholder =
    content == null
      ? historyReady
        ? 'Trilha indisponível no momento'
        : 'Carregando a trilha…'
      : content.status !== 'ok'
        ? 'Trilha indisponível no momento'
        : content.stage_type === 'exercise'
          ? exerciseDone
            ? 'Pergunte à Maria ou use Continuar…'
            : 'Responda a questão'
          : mariaSidechat
            ? 'Pergunte mais à Maria ou volte para a trilha…'
            : 'Pergunte à Maria ou digite continuar…'

  const hintKey =
    content?.status !== 'ok'
      ? 'off'
      : content.stage_type === 'exercise'
        ? exerciseDone
          ? 'ex-done'
          : 'ex-open'
        : mariaSidechat
          ? 'maria'
          : 'trail'

  const typing = typingCopy(busyReason)
  const showCtaSlot =
    content?.status === 'ok' &&
    (showContinuar ||
      showVoltarTrilha ||
      continuarLeaving ||
      (busy && busyReason === 'trail'))

  return (
    <div className="chat-thread">
      {error ? (
        <p className="error chat-thread__banner" role="alert">
          {error}
        </p>
      ) : null}

      <div className="chat-thread__body">
        <div
          className="chat-thread__scroll"
          ref={threadRef}
          onScroll={updateNearBottom}
        >
        {!historyExpanded && showHistoryCollapse ? (
          <div className="chat-history-collapse">
            <button
              type="button"
              className="chat-history-collapse__btn"
              disabled={historyLoadingMore}
              onClick={() => void onExpandHistory()}
            >
              {historyLoadingMore
                ? 'Carregando etapas…'
                : `Mostrar etapas anteriores${
                    hiddenHistoryCount > 0
                      ? ` (${hiddenHistoryCount}${historyHasMore ? '+' : ''})`
                      : historyHasMore
                        ? ''
                        : ''
                  }`}
            </button>
          </div>
        ) : null}
        {historyExpanded && (showHistoryCollapse || historyHasMore) ? (
          <div className="chat-history-collapse">
            {historyHasMore ? (
              <button
                type="button"
                className="chat-history-collapse__btn"
                disabled={historyLoadingMore}
                onClick={() => void loadOlderHistory()}
              >
                {historyLoadingMore
                  ? 'Carregando…'
                  : 'Carregar etapas mais antigas'}
              </button>
            ) : null}
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
            className={bubbleClassName(msg)}
            data-stage-type={msg.stageType}
            data-cell-key={msg.cellKey || undefined}
            data-animate={msg.animate ? 'true' : undefined}
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

        {busy && showTyping ? (
          <article
            className={`chat-bubble chat-bubble--assistant chat-bubble--typing chat-bubble--typing-${busyReason || 'trail'}`}
            aria-live="polite"
            aria-label={typing.aria}
            data-busy-reason={busyReason || undefined}
          >
            <p className="chat-bubble__label">{typing.label}</p>
            <div className="chat-bubble__body">
              <span className="typing-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="typing-dots__reduced">{typing.reduced}</span>
            </div>
          </article>
        ) : null}

        {!historyReady || !content ? (
          <p className="muted chat-thread__loading">Carregando…</p>
        ) : null}

        {content?.status === 'ok' &&
        content.stage_type === 'exercise' &&
        !exerciseDone &&
        options.length > 0 &&
        !(busy && busyReason === 'exercise' && pendingOptionKey) ? (
          <div className="chat-exercise" role="group" aria-label="Opções">
            <p className="chat-exercise__legend">Responda a questão</p>
            <div className="chat-exercise__options">
              {options.map((opt) => {
                const selected = pendingOptionKey === opt.key
                const dimmed = !!pendingOptionKey && !selected
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={[
                      'chat-exercise__option',
                      selected ? 'is-selected' : '',
                      dimmed ? 'is-dimmed' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={busy || !!pendingOptionKey}
                    onClick={() => void onOptionClick(opt)}
                  >
                    {opt.text}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {showCtaSlot ? (
          <div
            className={`chat-cta-slot${continuarLeaving || (busy && busyReason === 'trail') ? ' chat-cta-slot--busy' : ''}`}
          >
            {showVoltarTrilha ? (
              <div className="chat-continue chat-continue--sidechat chat-continue--enter">
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

            {showContinuar || continuarLeaving ? (
              <div
                className={`chat-continue${continuarLeaving ? ' chat-continue--leaving' : ' chat-continue--enter'}`}
              >
                <button
                  type="button"
                  className="chat-continue__btn"
                  disabled={busy || continuarLeaving}
                  onClick={() => void doAdvance()}
                >
                  Continuar
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

      </div>

      {newMsgChip ? (
        <button
          type="button"
          className="chat-new-msg-chip"
          onClick={() => scrollToBottom('smooth')}
        >
          Nova mensagem
        </button>
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
          <p key={hintKey} className="muted chat-composer__hint chat-composer__hint--fade">
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
