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
  isBlocoRespostaContent,
  isContinuarText,
  lightStripMarkdown,
  logsToMessages,
  looksLikeLessonConclusion,
  normalizeTitleKey,
  renderMessageLines,
  stripDecorTitle,
  stripMidLessonConclusion,
  trailCellKey,
  trailMessageId,
} from '../lib/trailMessages'

/** Fallback de bolhas se não houver question corrente (status). */
const HISTORY_VISIBLE_TAIL = 28

/** Página inicial do history API (position-aware + prefer q corrente). */
const HISTORY_PAGE_LIMIT = 40

/** Evita flash de typing em respostas rápidas (cache-hit). */
const TYPING_MIN_DELAY_MS = 280

/** Distância do fim para considerar “sticky bottom”. */
const STICKY_BOTTOM_PX = 120

function isScrollNearBottom(el: HTMLElement, px = STICKY_BOTTOM_PX): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < px
}

/** Tail colapsado: só a question corrente (esconde q81 etc. no first paint). */
function messagesForCollapsedTail(
  messages: ChatMessage[],
  currentQuestion: number | null,
): ChatMessage[] {
  if (currentQuestion == null || currentQuestion < 1) {
    return messages.length <= HISTORY_VISIBLE_TAIL
      ? messages
      : messages.slice(messages.length - HISTORY_VISIBLE_TAIL)
  }
  /**
   * B1: a partir da 1ª bolha da question corrente, manter também sidechat
   * local (Maria/resume/feedback) sem questionNumber — o sufixo “só animate”
   * anterior sumia após Voltar à trilha inserir um resume com q.
   */
  const firstIdx = messages.findIndex(
    (m) => m.questionNumber === currentQuestion,
  )
  if (firstIdx < 0) {
    return messages.slice(-Math.min(8, messages.length))
  }
  const slice = messages
    .slice(firstIdx)
    .filter(
      (m) =>
        m.questionNumber == null || m.questionNumber === currentQuestion,
    )
  return slice.length > 0
    ? slice
    : messages.slice(-Math.min(8, messages.length))
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
  if (msg.kind === 'exercise-answer') {
    parts.push('chat-bubble--exercise-answer')
  }
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
  /**
   * Mount/reload: ancora no passo corrente até o layout assentar.
   * Enquanto true, scrollTop=0 NÃO vira pin (evita chip fantasma + regência).
   */
  const initialAnchorPendingRef = useRef(true)
  /** Ignora onScroll gerado por scroll programático. */
  const programmaticScrollRef = useRef(false)
  /** Timeout que libera programmaticScrollRef (smooth pode durar >2 frames). */
  const programmaticScrollTimerRef = useRef<number | null>(null)
  /**
   * C4-MARIA-FALSE-PIN: pin/chip só após gesto real de scroll-up do usuário
   * (wheel/touch/keys). Gap por crescimento de conteúdo NÃO arma pin.
   */
  const userScrollUpGestureRef = useRef(false)
  const reduceMotionRef = useRef(false)
  const historyBeforeRef = useRef<number | null>(null)
  const oldestLogMsRef = useRef<number | null>(null)
  /**
   * B3: após surfacer BLOCO RESPOSTA no feedback do exercício, o próximo
   * Continuar não deve reexibir a mesma célula como 2ª bolha de feedback.
   */
  const skipNextBlocoDeliveryRef = useRef(false)
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

  /** Gestos de scroll-up do usuário → autorizam pin (C4-MARIA-FALSE-PIN). */
  useEffect(() => {
    const el = threadRef.current
    if (!el || !historyReady) return

    const markScrollUp = () => {
      if (programmaticScrollRef.current || initialAnchorPendingRef.current) {
        return
      }
      userScrollUpGestureRef.current = true
    }

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) markScrollUp()
    }
    let touchY = 0
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0
      // Dedo para baixo → conteúdo sobe (scroll-up).
      if (y - touchY > 6) markScrollUp()
      touchY = y
    }
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'PageUp' || e.key === 'Home' || e.key === 'ArrowUp') {
        markScrollUp()
      }
    }

    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('keydown', onKeyDown)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('keydown', onKeyDown)
    }
  }, [historyReady])

  /**
   * Stick-to-bottom enquanto não há pin: crescimento de bolha/imagem/typing
   * não deve abrir gap nem armar chip (C4-MARIA-FALSE-PIN).
   */
  useEffect(() => {
    const el = threadRef.current
    if (!el || !historyReady) return

    const stickIfUnpinned = () => {
      if (
        pinnedAwayRef.current ||
        isPinLocked() ||
        initialAnchorPendingRef.current
      ) {
        return
      }
      const top = el.scrollHeight
      if (Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) < 2) {
        return
      }
      runProgrammaticScroll(() => {
        el.scrollTop = top
      })
      nearBottomRef.current = true
      setNewMsgChip(false)
    }

    const ro = new ResizeObserver(() => {
      stickIfUnpinned()
    })
    ro.observe(el)
    // Filhos crescem (imagens / enter animation) sem mudar clientHeight do scroller.
    for (const child of Array.from(el.children)) {
      ro.observe(child)
    }

    const onImgLoad = () => stickIfUnpinned()
    el.addEventListener('load', onImgLoad, true)

    return () => {
      ro.disconnect()
      el.removeEventListener('load', onImgLoad, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyReady, messages.length, showTyping, mariaSidechat])

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
    initialAnchorPendingRef.current = true
    pinnedAwayRef.current = false
    nearBottomRef.current = true
    userScrollUpGestureRef.current = false
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
            questionNumber: data.question_number,
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
                questionNumber: data.question_number,
              }
              return next
            }
            return appendTrailMessage(prev, {
              id: msgId,
              role: 'assistant',
              text,
              stageType: 'ai',
              cellKey: key,
              questionNumber: data.question_number,
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
      // Se há pin ativo (Continuar / leitura), não sobrescrever o pin.
      requestAnimationFrame(() => {
        const scroller = threadRef.current
        if (!scroller) return
        const delta = scroller.scrollHeight - prevHeight
        if (isPinLocked()) {
          scroller.scrollTop = pinnedScrollTopRef.current
          nearBottomRef.current = false
          return
        }
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
    // Durante âncora inicial, scrollTop=0 não é pin do usuário.
    if (initialAnchorPendingRef.current || programmaticScrollRef.current) {
      return false
    }
    // Já pinado por gesto anterior e ainda longe do fundo.
    if (pinnedAwayRef.current && !isScrollNearBottom(el)) {
      nearBottomRef.current = false
      pinnedScrollTopRef.current = el.scrollTop
      return true
    }
    // C4: gap por crescimento de conteúdo sem gesto de scroll-up ≠ pin.
    if (!userScrollUpGestureRef.current) {
      if (isScrollNearBottom(el)) {
        pinnedAwayRef.current = false
        nearBottomRef.current = true
      }
      return false
    }
    // Mede o DOM real — scrollTop programático pode não disparar onScroll.
    if (!isScrollNearBottom(el)) {
      pinnedAwayRef.current = true
      nearBottomRef.current = false
      pinnedScrollTopRef.current = el.scrollTop
      return true
    }
    pinnedAwayRef.current = false
    nearBottomRef.current = true
    userScrollUpGestureRef.current = false
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
    // Scroll programático / âncora inicial: não promove pin.
    if (programmaticScrollRef.current || initialAnchorPendingRef.current) {
      if (isScrollNearBottom(el)) {
        nearBottomRef.current = true
        pinnedAwayRef.current = false
        userScrollUpGestureRef.current = false
        setNewMsgChip(false)
      }
      return
    }
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
      userScrollUpGestureRef.current = false
      setNewMsgChip(false)
      return
    }
    // Longe do fundo: pin só se houve gesto de scroll-up (C4-MARIA-FALSE-PIN).
    if (userScrollUpGestureRef.current || pinnedAwayRef.current) {
      pinnedAwayRef.current = true
      pinnedScrollTopRef.current = el.scrollTop
    }
  }

  function runProgrammaticScroll(fn: () => void) {
    programmaticScrollRef.current = true
    if (programmaticScrollTimerRef.current != null) {
      window.clearTimeout(programmaticScrollTimerRef.current)
      programmaticScrollTimerRef.current = null
    }
    fn()
    // Smooth pode gerar onScroll por ~300ms — segura a flag além de 2 frames.
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false
      programmaticScrollTimerRef.current = null
    }, 320)
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    const el = threadRef.current
    if (!el) return
    stopPinLock()
    pinHoldUntilRef.current = 0
    pinnedAwayRef.current = false
    nearBottomRef.current = true
    userScrollUpGestureRef.current = false
    setNewMsgChip(false)
    const top = el.scrollHeight
    const preferAuto = behavior === 'auto' || reduceMotionRef.current
    runProgrammaticScroll(() => {
      if (preferAuto) {
        el.scrollTop = top
        return
      }
      el.scrollTo({ top, behavior: 'smooth' })
      // Reforça no fim do smooth — append/imagem pode crescer no meio.
      window.setTimeout(() => {
        if (!pinnedAwayRef.current && threadRef.current) {
          threadRef.current.scrollTop = threadRef.current.scrollHeight
        }
      }, 280)
    })
  }

  /**
   * C3-10 / C2-10: ancora no passo corrente.
   * Preferência: fim do thread (math + CTA) — block:nearest falhava no mount
   * com scrollTop colado em 0 e conteúdo ainda crescendo.
   */
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
    // No mount/âncora inicial: força near-bottom (aula atual + Continuar).
    if (initialAnchorPendingRef.current || skipSmoothScrollRef.current) {
      scrollToBottom(behavior === 'smooth' ? 'auto' : behavior)
      return
    }
    if (bubble) {
      runProgrammaticScroll(() => {
        bubble.scrollIntoView({
          block: 'end',
          behavior: reduceMotionRef.current ? 'auto' : behavior,
        })
        // Garante que o fim do passo (e CTA abaixo) fiquem acessíveis.
        if (!isScrollNearBottom(el, STICKY_BOTTOM_PX * 2)) {
          el.scrollTop = el.scrollHeight
        }
      })
      nearBottomRef.current = isScrollNearBottom(el)
      if (nearBottomRef.current) {
        pinnedAwayRef.current = false
        setNewMsgChip(false)
      }
      return
    }
    scrollToBottom(behavior)
  }

  useEffect(() => {
    return () => {
      stopPinLock()
      if (programmaticScrollTimerRef.current != null) {
        window.clearTimeout(programmaticScrollTimerRef.current)
        programmaticScrollTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!historyReady) return
    const el = threadRef.current

    // C3-10: enquanto a âncora inicial não assentou, re-ancora (não pin).
    if (initialAnchorPendingRef.current || skipSmoothScrollRef.current) {
      skipSmoothScrollRef.current = false
      const settle = () => {
        scrollCurrentStepIntoView('auto')
        requestAnimationFrame(() => {
          const scroller = threadRef.current
          if (!scroller) return
          if (
            messages.length > 0 &&
            contentRef.current?.status === 'ok' &&
            isScrollNearBottom(scroller)
          ) {
            initialAnchorPendingRef.current = false
            pinnedAwayRef.current = false
            nearBottomRef.current = true
            setNewMsgChip(false)
          }
        })
      }
      requestAnimationFrame(settle)
      // Segundo passe: history/images podem crescer o scrollHeight.
      const t = window.setTimeout(settle, 120)
      return () => window.clearTimeout(t)
    }

    // Revalida pin pelo DOM (refs podem estar stale após scroll programático).
    if (isPinLocked() || pinnedAwayRef.current) {
      if (el && isPinLocked()) el.scrollTop = pinnedScrollTopRef.current
      setNewMsgChip(true)
      return
    }
    // Sem pin do usuário: sempre stick-to-bottom (auto) — gap de append ≠ chip.
    nearBottomRef.current = true
    scrollToBottom('auto')
    // messages/busy/content drive presence; intentional deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, content, exerciseDone, mariaSidechat, showTyping, historyReady])

  useEffect(() => {
    if (content?.status !== 'ok') return
    // B3: após feedback do exercício o composer libera — foca Maria.
    if (content.stage_type === 'exercise' && !exerciseDone) return
    // preventScroll: focus no composer não pode puxar .chat-thread__scroll (C2-40).
    inputRef.current?.focus({ preventScroll: true })
  }, [content, exerciseDone])

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
        skipNextBlocoDeliveryRef.current = false
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

      /**
       * B3: BLOCO RESPOSTA já veio no feedback do exercício — marca entregue,
       * não cria 2ª bolha, e avança de novo para o próximo passo da trilha.
       */
      if (
        skipNextBlocoDeliveryRef.current &&
        isBlocoRespostaContent({
          stage_type: data.stage_type,
          stage_title: data.stage_title,
          prompt: data.prompt,
        })
      ) {
        skipNextBlocoDeliveryRef.current = false
        const blocoKey = trailCellKey(data.stage_number, data.question_number)
        deliveredKeyRef.current = blocoKey
        const advanceAgain = await advanceTrail(session.student_id, trailId)
        if (advanceAgain.status === 'ok' && advanceAgain.completed) {
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
          return
        }
        if (advanceAgain.status === 'ok') {
          deliveredKeyRef.current = null
          await loadNextAfterAdvance()
          window.dispatchEvent(new CustomEvent('crias:trail-progress'))
          return
        }
        setContent(advanceAgain as NextContentStatus)
        return
      }
      skipNextBlocoDeliveryRef.current = false

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
            questionNumber: data.question_number,
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
              questionNumber: data.question_number,
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
          questionNumber: data.question_number,
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
      skipNextBlocoDeliveryRef.current = false
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
    // Exercício: Maria bloqueada até o feedback (depois libera — B3).
    if (content.stage_type === 'exercise' && !exerciseDone) return
    setBusy(true)
    setBusyReason('maria')
    setError(null)
    const q = content.question_number
    setMessages((prev) => [
      ...prev,
      markAnimate({
        id: `u-${Date.now()}`,
        role: 'user',
        text: userLine,
        questionNumber: q,
        kind: 'sidechat',
      }),
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
          questionNumber: q,
          kind: 'sidechat',
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
    // C3-VOLTAR: se o usuário não pinou de propósito, ancora no passo/CTA.
    const wasPinned = pinnedAwayRef.current && !initialAnchorPendingRef.current
    if (!wasPinned) {
      pinnedAwayRef.current = false
      nearBottomRef.current = true
      userScrollUpGestureRef.current = false
      setNewMsgChip(false)
      // Reusa o caminho de âncora (como mount) para o resume assentar no fim.
      initialAnchorPendingRef.current = true
      skipSmoothScrollRef.current = true
    }

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
          markAnimate({
            ...last,
            id: resumeId,
            text,
            kind: 'resume',
            questionNumber: current.question_number,
          }),
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
          questionNumber: current.question_number,
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
    const q = content.question_number
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
      const pedagogical = attempt.pedagogical_feedback?.trim() || null
      let rich = content.explanation?.trim() || pedagogical || null
      // R02: não misturar “Parabéns pelo acerto” com attempt errado.
      if (rich && attempt.score !== null) {
        rich = alignBlocoWithAttempt(rich, attempt.is_correct) || null
      }
      const feedbackParts = [resultLabel, rich].filter(Boolean)
      const feedbackText = feedbackParts.join('\n\n')
      // B3: se o BLOCO seguinte já entrou neste feedback, pular reentrega.
      skipNextBlocoDeliveryRef.current = Boolean(
        pedagogical || content.explanation?.trim(),
      )
      // B5: opção escolhida vira banner no histórico (não some).
      setMessages((prev) => [
        ...prev,
        markAnimate({
          id: `u-${Date.now()}`,
          role: 'user',
          text: option.text,
          stageType: 'exercise',
          kind: 'exercise-answer',
          questionNumber: q,
        }),
        markAnimate({
          id: `f-${Date.now()}`,
          role: 'assistant',
          text: lightStripMarkdown(feedbackText),
          stageType: 'exercise',
          kind: 'feedback',
          questionNumber: q,
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
      skipNextBlocoDeliveryRef.current = false
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
    // Exercício: sem free-text / Maria até o feedback (B3 libera depois).
    if (content.stage_type === 'exercise' && !exerciseDone) return
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
  /** B2/B3: bloqueia só antes de responder; no feedback o composer abre. */
  const composerBlocked =
    (onExerciseStep && !exerciseDone) || busy || content?.status !== 'ok'
  const canSend =
    content?.status === 'ok' && !busy && !composerBlocked

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

  /**
   * B5: opções ficam visíveis com a escolha destacada durante o submit;
   * só saem do slot interativo após exerciseDone (banner já está no thread).
   */
  const optionsVisible =
    content?.status === 'ok' &&
    content.stage_type === 'exercise' &&
    !exerciseDone &&
    options.length > 0
  const exerciseComposerOpen = optionsVisible

  const currentQuestion =
    content?.status === 'ok' ? content.question_number : null
  const collapsedTail = messagesForCollapsedTail(messages, currentQuestion)
  const hiddenHistoryCount = Math.max(
    0,
    messages.length - collapsedTail.length,
  )
  const showHistoryCollapse =
    historyHasMore || hiddenHistoryCount > 0
  const rawVisibleMessages =
    historyExpanded || hiddenHistoryCount === 0 ? messages : collapsedTail
  /**
   * C4-STALE-CONCLUDE-DOM: mid-aula (status ok) não mostra “Parabéns por
   * concluir a aula…” — strip do texto / drop bolha só-conclude.
   * Expand ainda revela passado; conclude completo só faz sentido no fim.
   */
  const midLesson = content?.status === 'ok'
  const visibleMessages = midLesson
    ? rawVisibleMessages
        .map((m) => {
          if (!looksLikeLessonConclusion(m.text)) return m
          const stripped = stripMidLessonConclusion(m.text)
          if (!stripped) return null
          if (stripped === m.text) return m
          return { ...m, text: stripped }
        })
        .filter((m): m is ChatMessage => m != null)
    : rawVisibleMessages

  async function onExpandHistory() {
    const el = threadRef.current
    const prevHeight = el?.scrollHeight ?? 0
    const prevTop = el?.scrollTop ?? 0
    setHistoryExpanded(true)
    // Reveal de outras questions: mantém o viewport no mesmo conteúdo.
    requestAnimationFrame(() => {
      const scroller = threadRef.current
      if (!scroller) return
      const delta = scroller.scrollHeight - prevHeight
      if (delta > 0) {
        scroller.scrollTop = prevTop + delta
        pinnedAwayRef.current = true
        nearBottomRef.current = false
        pinnedScrollTopRef.current = scroller.scrollTop
      }
    })
    if (historyHasMore) {
      await loadOlderHistory()
    }
  }

  const exerciseLockedComposer =
    content?.status === 'ok' &&
    content.stage_type === 'exercise' &&
    !exerciseDone

  const placeholder =
    content == null
      ? historyReady
        ? 'Trilha indisponível no momento'
        : 'Carregando a trilha…'
      : content.status !== 'ok'
        ? 'Trilha indisponível no momento'
        : exerciseLockedComposer
          ? 'Responda a questão primeiro'
          : content.stage_type === 'exercise' && exerciseDone
            ? 'Pergunte à Maria ou use Continuar…'
            : mariaSidechat
              ? 'Pergunte mais à Maria ou volte para a trilha…'
              : 'Pergunte à Maria ou digite continuar…'

  const hintKey =
    content?.status !== 'ok'
      ? 'off'
      : content.stage_type === 'exercise'
        ? exerciseDone
          ? 'ex-done'
          : exerciseComposerOpen
            ? 'ex-locked'
            : 'ex-pending'
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

        {optionsVisible ? (
          <div
            className={`chat-exercise${pendingOptionKey ? ' chat-exercise--pending' : ''}`}
            role="group"
            aria-label="Opções"
          >
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

      </div>

      {/* CTA fora do scroller: não cobre bolhas (C3-CTA-OVERLAP); pin C2-40 intacto. */}
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
                Voltar à trilha
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

      {newMsgChip ? (
        <button
          type="button"
          className={`chat-new-msg-chip${showCtaSlot ? ' chat-new-msg-chip--above-cta' : ''}`}
          onClick={() => scrollToBottom('smooth')}
        >
          Nova mensagem
        </button>
      ) : null}
      </div>

      <footer
        className={`chat-composer${exerciseLockedComposer ? ' chat-composer--locked' : ''}`}
      >
        <form className="chat-composer__form" onSubmit={(e) => void onSend(e)}>
          {exerciseLockedComposer ? (
            <span
              className="chat-composer__lock"
              aria-hidden="true"
              title="Responda a questão primeiro"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 11V8a5 5 0 0 1 10 0v3"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <rect
                  x="5"
                  y="11"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
              </svg>
              <span className="chat-composer__lock-label">
                Responda a questão primeiro
              </span>
            </span>
          ) : null}
          <textarea
            ref={inputRef}
            className="chat-composer__input"
            rows={1}
            value={draft}
            disabled={composerBlocked}
            placeholder={exerciseLockedComposer ? '' : placeholder}
            aria-label={
              exerciseLockedComposer
                ? 'Responda a questão primeiro'
                : 'Mensagem'
            }
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
        {content?.status === 'ok' && !exerciseLockedComposer ? (
          <p key={hintKey} className="muted chat-composer__hint chat-composer__hint--fade">
            {content.stage_type === 'exercise'
              ? 'Pergunte à Maria ou use Continuar para avançar'
              : mariaSidechat
                ? 'Voltar à trilha reexibe o passo atual'
                : 'Enter envia · Shift+Enter quebra linha · texto livre fala com Maria · Continuar avança a trilha'}
          </p>
        ) : null}
      </footer>
    </div>
  )
}
