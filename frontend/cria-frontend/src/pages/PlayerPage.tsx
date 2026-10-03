import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  advanceTrail,
  askMaria,
  createConversationLog,
  fetchNextContent,
  fetchTrailHistoryPage,
  isAuthError,
  normalizeExerciseOptions,
  submitExerciseAttempt,
  type ConversationLogRow,
  type ExerciseOption,
  type NextContentOk,
  type NextContentStatus,
} from '../lib/api'
import MariaMascot from '../components/MariaMascot'
import {
  isRetryableSystemError,
  toUserFacingError,
} from '../lib/networkError'
import { clearSession, getSession, requireSession } from '../lib/session'
import {
  alignBlocoWithAttempt,
  type ChatMessage,
  formatBubbleTime,
  type InlineSeg,
  type MessagePart,
  isBlocoRespostaContent,
  isContinuarText,
  isTrailDeliveryLog,
  logsToMessages,
  looksLikeLessonConclusion,
  normalizeTitleKey,
  renderMessageLines,
  stripDecorTitle,
  stripHardcodedVerdict,
  stripMidLessonConclusion,
  textHasEmbed,
  trailCellKey,
  trailMessageId,
} from '../lib/trailMessages'
import { bindVisualViewport } from '../lib/visualViewport'

/** Fallback de bolhas se não houver question corrente (status). */
const HISTORY_VISIBLE_TAIL = 28

/** Página inicial do history API (position-aware + prefer q corrente). */
const HISTORY_PAGE_LIMIT = 40

/** Evita flash de typing em respostas rápidas (cache-hit). */
const TYPING_MIN_DELAY_MS = 280

/** C2-R4 N03: após espera longa da Maria, troca o estágio do typing. */
const MARIA_LONG_WAIT_MS = 3000

/**
 * C2-R4 N02: history não compete com first paint / Continuar —
 * sob demanda em idle (timeout garante prefetch cedo o bastante).
 */
const HISTORY_IDLE_TIMEOUT_MS = 900

/** Distância do fim para considerar “sticky bottom”. */
const STICKY_BOTTOM_PX = 120

function scheduleIdle(fn: () => void, timeout = HISTORY_IDLE_TIMEOUT_MS): () => void {
  const w = window as Window & {
    requestIdleCallback?: (
      cb: IdleRequestCallback,
      opts?: IdleRequestOptions,
    ) => number
    cancelIdleCallback?: (id: number) => void
  }
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(() => fn(), { timeout })
    return () => {
      w.cancelIdleCallback?.(id)
    }
  }
  const t = window.setTimeout(fn, Math.min(450, timeout))
  return () => {
    window.clearTimeout(t)
  }
}

/**
 * C2-R4 N02: aplica history sem clobber de advance/Maria locais.
 * History vira prefixo; extras locais (animate/sidechat/células novas) ficam.
 */
function mergeHistoryIntoMessages(
  logs: ConversationLogRow[],
  prev: ChatMessage[],
): ChatMessage[] {
  const fromHistory = logsToMessages(logs)
  if (prev.length === 0) return fromHistory
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
    return true
  })
  return extras.length ? [...fromHistory, ...extras] : fromHistory
}

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

/**
 * C2-R1 N02: no tail colapsado (fora do sidechat Maria), só passo da trilha —
 * entrega/feedback/opção/resume. Histórico livre da Maria fica no expand.
 */
function isTrailStepMessage(m: ChatMessage): boolean {
  if (m.kind === 'feedback' || m.kind === 'exercise-answer' || m.kind === 'resume') {
    return true
  }
  if (m.kind === 'sidechat') return false
  return Boolean(m.cellKey)
}

type BusyReason = 'maria' | 'trail' | 'exercise' | null

/** Remove linhas de opções lettered do enunciado (botões já mostram as opções). */
function stripOptionLines(text: string): string {
  // Alinhado ao server: A) / A. / A: / (A) texto
  const re = /^\s*\(?([A-Za-z])\)?\s*[\)\.\:]\s+.+\s*$/
  return text
    .split(/\r?\n/)
    .filter((line) => !re.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Enunciado exibido no card do exercício (acima das opções). */
function exercisePromptFromContent(content: NextContentOk): string {
  return stripOptionLines((content.content ?? '').trim())
}

/** R10-Z07: draft + modo Maria sobrevivem a reload mid-sidechat. */
function mariaPersistKey(trailId: string): string {
  return `crias:maria-draft:${trailId}`
}

function readMariaPersist(trailId: string): {
  draft: string
  mariaSidechat: boolean
} {
  if (!trailId || typeof sessionStorage === 'undefined') {
    return { draft: '', mariaSidechat: false }
  }
  try {
    const raw = sessionStorage.getItem(mariaPersistKey(trailId))
    if (!raw) return { draft: '', mariaSidechat: false }
    const parsed = JSON.parse(raw) as {
      draft?: unknown
      mariaSidechat?: unknown
    }
    return {
      draft: typeof parsed.draft === 'string' ? parsed.draft : '',
      mariaSidechat: Boolean(parsed.mariaSidechat),
    }
  } catch {
    return { draft: '', mariaSidechat: false }
  }
}

function writeMariaPersist(
  trailId: string,
  state: { draft: string; mariaSidechat: boolean },
) {
  if (!trailId || typeof sessionStorage === 'undefined') return
  try {
    if (!state.draft && !state.mariaSidechat) {
      sessionStorage.removeItem(mariaPersistKey(trailId))
      return
    }
    sessionStorage.setItem(mariaPersistKey(trailId), JSON.stringify(state))
  } catch {
    // quota / private mode — ignore
  }
}

function renderInlineSegments(segments: InlineSeg[] | undefined, fallback: string): ReactNode {
  if (!segments || segments.length === 0) return fallback || '\u00a0'
  return segments.map((seg) => {
    if (seg.kind === 'strong') {
      return <strong key={seg.key}>{seg.value}</strong>
    }
    if (seg.kind === 'em') {
      return <em key={seg.key}>{seg.value}</em>
    }
    return <span key={seg.key}>{seg.value}</span>
  })
}

/** R08-M11: aviso de destino externo no chrome do link (sem hardcodar host). */
function externalLinkLabel(label: string | undefined, href: string): string {
  const base = (label || href).trim()
  if (/abre em nova aba/i.test(base)) return base
  return `${base} (abre em nova aba)`
}

type MediaPartHandlers = {
  /** R08-M05: marca saída externa para cue de retorno. */
  onOpenExternalMedia?: (href: string) => void
}

/**
 * R19-H05 (barato): monta iframe só perto do viewport — evita peso DOM
 * de dezenas de embeds offscreen sem lib de virtualização.
 */
function LazyEmbedFrame({
  src,
  title,
}: {
  src: string
  title: string
}): ReactNode {
  const hostRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = hostRef.current
    if (!el || active) return
    if (typeof IntersectionObserver === 'undefined') {
      setActive(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true)
          io.disconnect()
        }
      },
      { root: null, rootMargin: '240px 0px', threshold: 0.01 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [active])

  return (
    <div ref={hostRef} className="chat-bubble__embed-frame">
      {active ? (
        <iframe
          src={src}
          title={title}
          tabIndex={-1}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="chat-bubble__embed-skeleton" aria-hidden="true" />
      )}
    </div>
  )
}

function renderMessagePart(
  part: MessagePart,
  handlers?: MediaPartHandlers,
): ReactNode {
  if (part.kind === 'image') {
    return (
      <p key={part.key} className="chat-bubble__media">
        <img src={part.value} alt="" loading="lazy" decoding="async" />
      </p>
    )
  }
  if (part.kind === 'embed' && part.embedUrl) {
    const openLabel = externalLinkLabel(part.label, part.value)
    return (
      <div
        key={part.key}
        className="chat-bubble__embed"
        data-embed-kind={part.embedKind || undefined}
      >
        <LazyEmbedFrame
          src={part.embedUrl}
          title={part.label || 'Mídia da aula'}
        />
        <a
          href={part.value}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-bubble__link chat-bubble__link--chip"
          aria-label={openLabel}
          onClick={() => handlers?.onOpenExternalMedia?.(part.value)}
        >
          {openLabel}
        </a>
      </div>
    )
  }
  if (part.kind === 'link') {
    const openLabel = externalLinkLabel(part.label, part.value)
    return (
      <p key={part.key}>
        <a
          href={part.value}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-bubble__link chat-bubble__link--chip"
          aria-label={openLabel}
          onClick={() => handlers?.onOpenExternalMedia?.(part.value)}
        >
          {openLabel}
        </a>
      </p>
    )
  }
  return (
    <p key={part.key}>{renderInlineSegments(part.segments, part.value)}</p>
  )
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
  // Preserva markdown inline (_em_ / **bold**) para o renderer.
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

function typingCopy(
  reason: BusyReason,
  opts?: { trailLabel?: string; mariaLongWait?: boolean },
): {
  label: string
  aria: string
  reduced: string
} {
  if (reason === 'maria') {
    // C2-R4 N03: estágio longo — não só dots eternas.
    if (opts?.mariaLongWait) {
      return {
        label: 'Maria',
        aria: 'Maria ainda está pensando',
        reduced: 'Maria ainda está pensando…',
      }
    }
    return {
      label: 'Maria',
      aria: 'Maria está digitando',
      reduced: 'Maria está digitando…',
    }
  }
  if (reason === 'exercise') {
    // R11-C12: chrome neutro (sem “CRIAS” + jargão “feedback da questão”).
    return {
      label: 'Aula',
      aria: 'Preparando a resposta',
      reduced: 'Preparando a resposta…',
    }
  }
  // C2-R4 N01: typing alinhado ao CTA (Salvando… → Carregando etapa…).
  const trailLabel = opts?.trailLabel?.trim() || 'Carregando etapa…'
  return {
    label: trailLabel,
    aria: trailLabel.replace(/…$/, ''),
    reduced: trailLabel.endsWith('…') ? trailLabel : `${trailLabel}…`,
  }
}

export default function PlayerPage() {
  const { trailId = '' } = useParams()
  const navigate = useNavigate()
  const { trailNames } = useOutletContext<{
    trailNames?: Record<string, string>
  }>()
  const session = getSession()!
  /** C2-R3 N03: H1 SR com nome humano — nunca ID cru (`t47`). */
  const trailHeading =
    (trailId && trailNames?.[trailId]?.trim()) || 'Trilha'
  const [content, setContent] = useState<NextContentOk | NextContentStatus | null>(
    null,
  )
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  /** Retry só para erro rede/sistema (D#9). */
  const [canRetry, setCanRetry] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyReason, setBusyReason] = useState<BusyReason>(null)
  const [showTyping, setShowTyping] = useState(false)
  const [draft, setDraft] = useState(
    () => readMariaPersist(trailId).draft,
  )
  const [exerciseDone, setExerciseDone] = useState(false)
  /** Opção escolhida (select) — submit só via Enviar (D#2). */
  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null)
  /** Opção em voo de submit (pending visual). */
  const [pendingOptionKey, setPendingOptionKey] = useState<string | null>(null)
  /**
   * R18-N06: FSM do exercício — idle | selected | submitting | error | done.
   * Em erro o card permanece com seleção + retry (nunca some sem ack).
   */
  const [exercisePhase, setExercisePhase] = useState<
    'idle' | 'selected' | 'submitting' | 'error' | 'done'
  >('idle')
  /** R04-L05: progresso multi-etapa no Continuar. */
  const [trailBusyLabel, setTrailBusyLabel] = useState('Preparando etapa…')
  /** C2-R4 N03: Maria em espera longa (>3s) — estágio “ainda pensando”. */
  const [mariaLongWait, setMariaLongWait] = useState(false)
  /** Sidechat Maria: esconde Continuar e mostra Voltar. */
  const [mariaSidechat, setMariaSidechat] = useState(
    () => readMariaPersist(trailId).mariaSidechat,
  )
  /** Entrada Clippy da Maria — persiste após a 1ª chamada na sessão do player. */
  const [mariaEntrance, setMariaEntrance] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  /** WS-D: colapsa bolhas antigas; expandir revela páginas anteriores. */
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false)
  /** Chip de jump: visível quando longe do fim (R19-H03). */
  const [jumpChip, setJumpChip] = useState(false)
  /** true só quando conteúdo novo chegou abaixo enquanto pinado (R19-H04). */
  const [unseenBelow, setUnseenBelow] = useState(false)
  const [continuarLeaving, setContinuarLeaving] = useState(false)
  /** R23-L01/L02/L07: anúncios SR de etapa / feedback / Continuar. */
  const [srAnnounce, setSrAnnounce] = useState('')
  /** OM04: espelha banner offline — Continuar não convida toque fadado. */
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )
  /** R08-M05: bolha com cue visual ao voltar de mídia externa. */
  const [mediaResumeMsgId, setMediaResumeMsgId] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  /** R08-M05: última saída YT/Drive externa (aba/popup). */
  const externalMediaOpenRef = useRef<{
    msgId: string
    href: string
    at: number
  } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  const voltarBtnRef = useRef<HTMLButtonElement>(null)
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
  /** Race guard síncrono — double-tap Continuar (R04-L01 / R06-E02). */
  const advanceInFlightRef = useRef(false)
  /** advance OK mas next-content falhou — retry só resync (R18-N02). */
  const advanceCommittedRef = useRef(false)
  /** C2-R4 N02: invalida prefetch history stale (trail change / remount). */
  const historyFetchGenRef = useRef(0)
  const historyIdleCancelRef = useRef<(() => void) | null>(null)
  /** Usuário saiu da Maria enquanto a resposta ainda vinha. */
  const mariaCancelledRef = useRef(false)
  /** Última ação retryável (rede/sistema). */
  const retryFnRef = useRef<(() => void) | null>(null)
  /** Âncora pós-expand / prepend (R19-H01 / H02) — aplica em useLayoutEffect. */
  const pendingScrollAnchorRef = useRef<
    | { kind: 'expand' | 'prepend'; prevHeight: number; prevTop: number }
    | { kind: 'current-step' }
    | null
  >(null)
  const continuarBtnRef = useRef<HTMLButtonElement>(null)

  const clearJumpChip = useCallback(() => {
    setJumpChip(false)
    setUnseenBelow(false)
  }, [])

  const showJumpChip = useCallback((opts?: { unseen?: boolean }) => {
    if (opts?.unseen) setUnseenBelow(true)
    setJumpChip(true)
  }, [])

  const focusMessageById = useCallback((id: string | null | undefined) => {
    if (!id) return false
    const el = document.querySelector(
      `[data-msg-id="${CSS.escape(id)}"]`,
    ) as HTMLElement | null
    if (!el) return false
    el.focus({ preventScroll: true })
    return true
  }, [])

  /**
   * C2-R7 N01 / R23-L04: pós-Enviar Maria o soft-KB fecha e o browser
   * joga activeElement → BODY em <16 ms. Reafirma Voltar (ou bolha/
   * composer) enquanto o vv assenta; nunca deixar BODY.
   */
  const focusAfterMariaAck = useCallback(() => {
    const tryFocus = (allowComposerFallback: boolean) => {
      if (mariaCancelledRef.current) return true
      const voltar = voltarBtnRef.current
      // CTA display:none sob KB → offsetParent null; espera settle.
      if (voltar && voltar.offsetParent !== null) {
        voltar.focus({ preventScroll: true })
        if (document.activeElement === voltar) return true
      }
      if (
        !allowComposerFallback &&
        document.documentElement.dataset.keyboard === 'open'
      ) {
        return false
      }
      const lastMaria = [...messagesRef.current]
        .reverse()
        .find((m) => m.role === 'assistant' && m.kind === 'sidechat')
      if (focusMessageById(lastMaria?.id)) return true
      const input = inputRef.current
      if (input && !input.readOnly && !input.disabled) {
        input.focus({ preventScroll: true })
        return document.activeElement === input
      }
      return false
    }

    const settleMs = [16, 50, 120, 300] as const
    window.requestAnimationFrame(() => {
      tryFocus(false)
      for (const ms of settleMs) {
        window.setTimeout(() => {
          if (mariaCancelledRef.current) return
          const active = document.activeElement
          // Aluno já está em Voltar / composer / bolha — não roubar.
          if (
            active &&
            active !== document.body &&
            active !== document.documentElement &&
            (active === voltarBtnRef.current ||
              active === inputRef.current ||
              (active as HTMLElement).closest?.('[data-msg-id]'))
          ) {
            return
          }
          // BODY ou alvo inútil → reafirma (composer só após vv assentar).
          tryFocus(ms >= 120)
        }, ms)
      }
    })
  }, [focusMessageById])

  contentRef.current = content
  busyReasonRef.current = busyReason
  messagesRef.current = messages

  const goLoginAuth = useCallback(
    (message?: string) => {
      clearSession('auth')
      navigate('/login', {
        replace: true,
        state: { reason: 'auth', message },
      })
    },
    [navigate],
  )

  const reportError = useCallback(
    (err: unknown, fallback: string, retry?: () => void) => {
      if (isAuthError(err)) {
        goLoginAuth(
          err instanceof Error
            ? err.message
            : 'Sua sessão expirou. Entre de novo para continuar.',
        )
        return
      }
      setError(toUserFacingError(err, fallback))
      const retryable = isRetryableSystemError(err) && typeof retry === 'function'
      retryFnRef.current = retryable ? retry! : null
      setCanRetry(retryable)
    },
    [goLoginAuth],
  )

  const clearError = useCallback(() => {
    setError(null)
    setCanRetry(false)
    retryFnRef.current = null
  }, [])

  function ensureSessionOrRedirect(): NonNullable<
    ReturnType<typeof requireSession>
  > | null {
    const s = requireSession()
    if (!s) {
      clearSession('missing')
      navigate('/login', {
        replace: true,
        state: {
          reason: 'missing',
          message: 'Entre de novo para continuar.',
        },
      })
      return null
    }
    return s
  }

  // Header chrome: progresso + sessão Maria (C2-R5 N02).
  useEffect(() => {
    if (content?.status !== 'ok') return
    const title = content.stage_title?.trim() || null
    window.dispatchEvent(
      new CustomEvent('crias:player-chrome', {
        detail: {
          trailId,
          stageNumber: content.stage_number,
          questionNumber: content.question_number,
          stageTitle: title,
          mariaActive: mariaSidechat,
        },
      }),
    )
  }, [content, trailId, mariaSidechat])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotionRef.current = mq.matches
    const onChange = () => {
      reduceMotionRef.current = mq.matches
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // R12-O07 / R18-N05: ao voltar online, libera busy preso; erro+retry permanece.
  // OM01: NÃO zerar advanceInFlight mid-flight — finally do fetch libera o lock.
  // OM04: sincroniza flag offline com o banner do shell.
  useEffect(() => {
    const goOffline = () => setOffline(true)
    const onOnline = () => {
      setOffline(false)
      // R18-N06: se submit estava em voo, vira error (card + seleção ficam).
      setPendingOptionKey((pending) => {
        if (pending) {
          window.setTimeout(() => {
            setExercisePhase('error')
            // OM03: não deixar ACK de Continuar stale no fail de exercício.
            setSrAnnounce('')
          }, 0)
        }
        return null
      })
      // OM01: mutate ainda em voo — busy/lock ficam até settle/abort.
      if (advanceInFlightRef.current) return
      setBusy(false)
      setBusyReason(null)
      busyReasonRef.current = null
      setContinuarLeaving(false)
      setTrailBusyLabel('Preparando etapa…')
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  /**
   * R08-M05: ao voltar da aba/popup de YT/Drive, reancora a bolha da mídia,
   * anuncia e destaca Continuar — sem inventar botão novo.
   */
  useEffect(() => {
    let clearTimer: number | null = null
    const onReturn = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return
      }
      const open = externalMediaOpenRef.current
      if (!open) return
      if (Date.now() - open.at > 30 * 60_000) {
        externalMediaOpenRef.current = null
        return
      }
      externalMediaOpenRef.current = null
      setMediaResumeMsgId(open.msgId)
      setSrAnnounce('De volta à aula. Continuar trilha quando quiser.')
      window.requestAnimationFrame(() => {
        const node = threadRef.current?.querySelector(
          `[data-msg-id="${CSS.escape(open.msgId)}"]`,
        )
        node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        if (continuarBtnRef.current && !continuarBtnRef.current.disabled) {
          continuarBtnRef.current.focus({ preventScroll: true })
        }
      })
      if (clearTimer != null) window.clearTimeout(clearTimer)
      clearTimer = window.setTimeout(() => setMediaResumeMsgId(null), 2400)
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
      if (clearTimer != null) window.clearTimeout(clearTimer)
    }
  }, [])

  /** R24-LS03: pós-rotate, reancora enunciado/opções na viewport. */
  useEffect(() => {
    const reanchor = () => {
      if (exercisePhase === 'done' || exercisePhase === 'idle') return
      window.requestAnimationFrame(() => {
        document
          .querySelector('.chat-exercise')
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      })
    }
    window.addEventListener('orientationchange', reanchor)
    return () => window.removeEventListener('orientationchange', reanchor)
  }, [exercisePhase])

  /**
   * R24-LS06: em landscape curto, ancora mídia/link da etapa atual
   * (fecho da aula + CTA YT) sem scroll cego.
   */
  useEffect(() => {
    if (content?.status !== 'ok') return
    if (typeof window === 'undefined') return
    const landShort = window.matchMedia(
      '(orientation: landscape) and (max-height: 500px)',
    )
    if (!landShort.matches) return
    if (pinnedAwayRef.current) return

    const run = () => {
      const scroller = threadRef.current
      if (!scroller) return
      const key = trailCellKey(content.stage_number, content.question_number)
      const cell = scroller.querySelector(
        `[data-cell-key="${key}"]`,
      ) as HTMLElement | null
      const media =
        (cell?.querySelector(
          '.chat-bubble__embed, .chat-bubble__media, .chat-bubble__link',
        ) as HTMLElement | null) ||
        (scroller.querySelector(
          '.chat-bubble__embed, .chat-bubble__media',
        ) as HTMLElement | null)
      if (media) {
        media.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        return
      }
      cell?.scrollIntoView({ block: 'end', inline: 'nearest' })
    }

    const t = window.setTimeout(() => {
      requestAnimationFrame(run)
    }, 80)
    const onOrient = () => {
      if (landShort.matches) requestAnimationFrame(run)
    }
    window.addEventListener('orientationchange', onOrient)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('orientationchange', onOrient)
    }
  }, [content])

  /** R04-L07: limpa flag animate após a entrada — evita re-trigger no scroll. */
  useEffect(() => {
    if (!messages.some((m) => m.animate)) return
    const t = window.setTimeout(() => {
      setMessages((prev) => {
        if (!prev.some((m) => m.animate)) return prev
        return prev.map((m) => (m.animate ? { ...m, animate: false } : m))
      })
    }, 420)
    return () => window.clearTimeout(t)
  }, [messages])

  useEffect(() => bindVisualViewport(), [])

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
      clearJumpChip()
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

  /** C2-R4 N03: após ~3s na Maria, eleva o feedback de espera. */
  useEffect(() => {
    if (!busy || busyReason !== 'maria') {
      setMariaLongWait(false)
      return
    }
    setMariaLongWait(false)
    const t = window.setTimeout(() => setMariaLongWait(true), MARIA_LONG_WAIT_MS)
    return () => window.clearTimeout(t)
  }, [busy, busyReason])

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
    clearError()
    setExerciseDone(false)
    setSelectedOptionKey(null)
    setPendingOptionKey(null)
    setExercisePhase('idle')
    setTrailBusyLabel('Preparando etapa…')
    // R10-Z07: não zerar sidechat/draft aqui — hydrate no efeito de trailId.
    setMariaEntrance(false)
    mariaCancelledRef.current = false
    advanceInFlightRef.current = false
    // C2-R4 N02: cancela prefetch history pendente desta trilha.
    historyFetchGenRef.current += 1
    if (historyIdleCancelRef.current) {
      historyIdleCancelRef.current()
      historyIdleCancelRef.current = null
    }
    setHistoryReady(false)
    setHistoryExpanded(false)
    setHistoryHasMore(false)
    clearJumpChip()
    historyBeforeRef.current = null
    oldestLogMsRef.current = null
    skipSmoothScrollRef.current = true
    initialAnchorPendingRef.current = true
    pinnedAwayRef.current = false
    nearBottomRef.current = true
    userScrollUpGestureRef.current = false
    setMessages([])
    try {
      // next-content primeiro — CTA / first paint não esperam history.
      const data = await fetchNextContent(session.student_id, trailId)
      setContent(data)

      if (data.status !== 'ok') {
        // C2-R6 N04: not_found/inactive → empty-state no corpo (sem bolha micro).
        const shellEmpty =
          data.status === 'not_found' ||
          data.status === 'inactive_trail' ||
          data.status === 'inactive_student'
        if (!shellEmpty) {
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
        }
        setHistoryReady(true)
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
      setExercisePhase('idle')

      // Semeia o passo corrente sem esperar history (lesson-card + bolha).
      // Persist só depois do history (evita log duplicado no remount).
      deliveredKeyRef.current = key
      const msgId = trailMessageId(data.stage_number, data.question_number)
      if (text || data.stage_type !== 'ai') {
        setMessages((prev) =>
          appendTrailMessage(prev, {
            id: msgId,
            role: 'assistant',
            text,
            stageType: data.stage_type,
            cellKey: key,
            questionNumber: data.question_number,
          }).messages,
        )
      }

      // C2-R4 N02: history em idle — sem waterfall silencioso no mount.
      const gen = historyFetchGenRef.current
      historyIdleCancelRef.current = scheduleIdle(() => {
        historyIdleCancelRef.current = null
        void (async () => {
          if (gen !== historyFetchGenRef.current) return
          try {
            const page = await fetchTrailHistoryPage(
              session.student_id,
              trailId,
              { limit: HISTORY_PAGE_LIMIT },
            )
            if (gen !== historyFetchGenRef.current) return
            const logs = page.logs
            setHistoryHasMore(page.has_more)
            historyBeforeRef.current = page.next_before
            const oldest = logs[0]
            oldestLogMsRef.current =
              typeof oldest?.created_at_ms === 'number'
                ? oldest.created_at_ms
                : page.next_before
            // Merge: não apaga advance/Maria locais se o aluno já seguiu.
            setMessages((prev) => mergeHistoryIntoMessages(logs, prev))

            const already = logs.some(
              (l) =>
                l.stage_number === data.stage_number &&
                l.question_number === data.question_number &&
                isTrailDeliveryLog(l),
            )

            if (data.stage_type === 'exercise') {
              const done = cellHasExerciseFeedback(
                logs,
                data.stage_number,
                data.question_number,
              )
              setExerciseDone(done)
              setExercisePhase(done ? 'done' : 'idle')
              if (text.trim()) {
                const alignId = trailMessageId(
                  data.stage_number,
                  data.question_number,
                )
                setMessages((prev) => {
                  const idx = prev.findIndex(
                    (m) => m.id === alignId || m.cellKey === key,
                  )
                  if (idx < 0) {
                    return appendTrailMessage(prev, {
                      id: alignId,
                      role: 'assistant',
                      text,
                      stageType: 'exercise',
                      cellKey: key,
                      questionNumber: data.question_number,
                    }).messages
                  }
                  if (prev[idx].text === text) return prev
                  const next = [...prev]
                  next[idx] = {
                    ...prev[idx],
                    text,
                    stageType: 'exercise',
                    cellKey: key,
                    questionNumber: data.question_number,
                  }
                  return next
                })
              }
            } else if (data.stage_type === 'ai' && text) {
              const alignId = trailMessageId(
                data.stage_number,
                data.question_number,
              )
              setMessages((prev) => {
                const idx = prev.findIndex(
                  (m) => m.id === alignId || m.cellKey === key,
                )
                if (idx < 0) {
                  return appendTrailMessage(prev, {
                    id: alignId,
                    role: 'assistant',
                    text,
                    stageType: 'ai',
                    cellKey: key,
                    questionNumber: data.question_number,
                  }).messages
                }
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
              })
            }

            // AI já persiste no ensure-ai; fixed/exercise só se history não tem.
            if (!already && data.stage_type !== 'ai' && text.trim()) {
              void persistLog({
                sender: 'system',
                message_text: text,
                stage_number: data.stage_number,
                question_number: data.question_number,
                message_type:
                  data.stage_type === 'exercise' ? 'exercise' : 'instruction',
                metadata: {
                  source: 'next-content',
                  stage_type: data.stage_type,
                },
              })
            }
          } catch {
            if (gen !== historyFetchGenRef.current) return
            setHistoryHasMore(false)
            // Sem history: ainda grava fixed/exercise uma vez (primeira entrega).
            if (data.stage_type !== 'ai' && text.trim()) {
              void persistLog({
                sender: 'system',
                message_text: text,
                stage_number: data.stage_number,
                question_number: data.question_number,
                message_type:
                  data.stage_type === 'exercise' ? 'exercise' : 'instruction',
                metadata: {
                  source: 'next-content',
                  stage_type: data.stage_type,
                },
              })
            }
          }
        })()
      })
    } catch (err) {
      reportError(err, 'Erro ao carregar a trilha.', () => {
        void loadHistoryAndContent()
      })
      setContent(null)
      setHistoryReady(true)
    }
  }, [clearError, persistLog, reportError, session.student_id, trailId])

  // ER06: exercício sem opções → erro de sistema + retry (não lock eterno).
  useEffect(() => {
    if (content?.status !== 'ok') return
    if (content.stage_type !== 'exercise' || exerciseDone) return
    const opts = normalizeExerciseOptions(content.options)
    if (opts.length > 0) return
    setError('Não foi possível carregar as opções desta questão.')
    setCanRetry(true)
    retryFnRef.current = () => {
      void loadHistoryAndContent()
    }
  }, [content, exerciseDone, loadHistoryAndContent])

  const scrollToCurrentStep = useCallback(
    (scroller: HTMLElement) => {
      const current = contentRef.current
      // C2-R6 N03: lesson-card é a âncora quando a bolha da célula some do DOM.
      const lesson = scroller.querySelector(
        '[data-current-step="true"], .lesson-card',
      ) as HTMLElement | null
      if (lesson) {
        lesson.scrollIntoView({ block: 'start', behavior: 'auto' })
        pinnedAwayRef.current = true
        nearBottomRef.current = false
        userScrollUpGestureRef.current = true
        pinnedScrollTopRef.current = scroller.scrollTop
        showJumpChip()
        return true
      }
      if (current?.status === 'ok') {
        const key = trailCellKey(current.stage_number, current.question_number)
        const bubble = scroller.querySelector(
          `[data-cell-key="${key}"]`,
        ) as HTMLElement | null
        if (bubble) {
          bubble.scrollIntoView({ block: 'center', behavior: 'auto' })
          pinnedAwayRef.current = true
          nearBottomRef.current = false
          userScrollUpGestureRef.current = true
          pinnedScrollTopRef.current = scroller.scrollTop
          showJumpChip()
          return true
        }
      }
      return false
    },
    [showJumpChip],
  )

  const loadOlderHistory = useCallback(
    async (opts?: { keepCurrentStep?: boolean }) => {
      if (historyLoadingMore || !historyHasMore) return
      const before = historyBeforeRef.current
      if (before == null) {
        setHistoryHasMore(false)
        return
      }
      const keepCurrentStep = Boolean(opts?.keepCurrentStep)
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
        // C2-R6 N03: no expand, não sobrescrever âncora da etapa atual com prepend.
        pendingScrollAnchorRef.current = keepCurrentStep
          ? { kind: 'current-step' }
          : {
              kind: 'prepend',
              prevHeight,
              prevTop,
            }
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const merged = older.filter((m) => !seen.has(m.id))
          return [...merged, ...prev]
        })
      } catch {
        if (!keepCurrentStep) pendingScrollAnchorRef.current = null
        /* ignore — botão permanece */
      } finally {
        setHistoryLoadingMore(false)
      }
    },
    [
      historyHasMore,
      historyLoadingMore,
      session.student_id,
      trailId,
    ],
  )

  /** R19-H01/H02: aplica âncora de scroll após expand/prepend no DOM. */
  useLayoutEffect(() => {
    const pending = pendingScrollAnchorRef.current
    if (!pending) return
    pendingScrollAnchorRef.current = null
    const scroller = threadRef.current
    if (!scroller) return

    if (pending.kind === 'current-step') {
      if (scrollToCurrentStep(scroller)) return
      scroller.scrollTop = scroller.scrollHeight
      return
    }

    const delta = scroller.scrollHeight - pending.prevHeight
    if (isPinLocked()) {
      scroller.scrollTop = pinnedScrollTopRef.current
      nearBottomRef.current = false
      showJumpChip()
      return
    }
    scroller.scrollTop = pending.prevTop + Math.max(0, delta)
    pinnedAwayRef.current = true
    nearBottomRef.current = false
    userScrollUpGestureRef.current = true
    pinnedScrollTopRef.current = scroller.scrollTop
    showJumpChip()
  }, [messages, historyExpanded, showJumpChip, scrollToCurrentStep])

  useEffect(() => {
    deliveredKeyRef.current = null
    setMessages([])
    const saved = readMariaPersist(trailId)
    setDraft(saved.draft)
    setMariaSidechat(saved.mariaSidechat)
    setHistoryExpanded(false)
    setPendingOptionKey(null)
    setBusy(false)
    setBusyReason(null)
    setContinuarLeaving(false)
    void loadHistoryAndContent()
  }, [trailId, loadHistoryAndContent])

  /** R10-Z07: persiste draft + modo Maria (reload mid-dúvida). */
  useEffect(() => {
    writeMariaPersist(trailId, { draft, mariaSidechat })
  }, [trailId, draft, mariaSidechat])

  /** R15-Y03: avisa ao fechar aba se há rascunho no composer. */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!draft.trim()) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [draft])

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
        clearJumpChip()
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
      clearJumpChip()
      return
    }
    // Longe do fundo: pin só se houve gesto de scroll-up (C4-MARIA-FALSE-PIN).
    if (userScrollUpGestureRef.current || pinnedAwayRef.current) {
      pinnedAwayRef.current = true
      pinnedScrollTopRef.current = el.scrollTop
      // R19-H03: atalho “Ir para o fim” sempre que !nearBottom.
      showJumpChip()
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
    clearJumpChip()
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
        clearJumpChip()
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
            clearJumpChip()
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
      showJumpChip({ unseen: true })
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
    setSelectedOptionKey(null)
    setPendingOptionKey(null)
    setMariaSidechat(false)
    mariaCancelledRef.current = false
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
      reportError(err, 'Erro ao carregar a etapa.', () => {
        void loadNextAfterAdvance()
      })
      try {
        const reconciled = await fetchNextContent(session.student_id, trailId)
        setContent(reconciled)
      } catch {
        /* ignore */
      }
      throw err
    }
  }

  /** Só resync após advance já commitado (R18-N02). */
  async function resyncAfterAdvance() {
    const liveSession = ensureSessionOrRedirect()
    if (!liveSession) return
    setBusy(true)
    setBusyReason('trail')
    busyReasonRef.current = 'trail'
    setTrailBusyLabel('Carregando etapa…')
    clearError()
    try {
      deliveredKeyRef.current = null
      await loadNextAfterAdvance()
      advanceCommittedRef.current = false
      window.dispatchEvent(new CustomEvent('crias:trail-progress'))
    } catch (err) {
      reportError(err, 'Etapa salva. Recarregando…', () => {
        void resyncAfterAdvance()
      })
    } finally {
      setBusy(false)
      setBusyReason(null)
      busyReasonRef.current = null
      setTrailBusyLabel('Preparando etapa…')
      setContinuarLeaving(false)
      advanceInFlightRef.current = false
    }
  }

  /** Avança sem bolha "VOCÊ: Continuar". */
  async function doAdvance() {
    if (content?.status !== 'ok') return
    // Race guard síncrono — React disabled ainda não pintou (R04-L01).
    if (advanceInFlightRef.current || busy) return
    // OM04: offline — não dispara advance fadado.
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const liveSession = ensureSessionOrRedirect()
    if (!liveSession) return
    // R18-N02: se advance já commitou, só resync — não avança de novo.
    if (advanceCommittedRef.current) {
      advanceInFlightRef.current = true
      await resyncAfterAdvance()
      return
    }
    advanceInFlightRef.current = true
    // R17-M01 / F04: não blur → BODY; mantém foco no CTA busy.
    const pinned = capturePinFromScroll()
    if (pinned) {
      showJumpChip({ unseen: true })
      startPinLock()
    }
    setContinuarLeaving(true)
    setBusy(true)
    setBusyReason('trail')
    busyReasonRef.current = 'trail'
    setTrailBusyLabel('Salvando progresso…')
    clearError()
    setMariaSidechat(false)
    mariaCancelledRef.current = false
    let advanceSucceeded = false
    // R18-N05: falha de Continuar não apaga rascunho do composer.
    try {
      const result = await advanceTrail(liveSession.student_id, trailId)
      if (result.status === 'ok' && result.completed) {
        advanceCommittedRef.current = false
        advanceSucceeded = true
        setContent({
          status: 'completed',
          student_id: liveSession.student_id,
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
        advanceCommittedRef.current = true
        deliveredKeyRef.current = null
        setTrailBusyLabel('Carregando etapa…')
        await loadNextAfterAdvance()
        advanceCommittedRef.current = false
        advanceSucceeded = true
        window.dispatchEvent(new CustomEvent('crias:trail-progress'))
      } else {
        setContent(result as NextContentStatus)
      }
    } catch (err) {
      reportError(err, 'Erro ao avançar a trilha.', () => {
        if (advanceCommittedRef.current) void resyncAfterAdvance()
        else void doAdvance()
      })
      if (!advanceCommittedRef.current) {
        try {
          const s = requireSession()
          if (s) {
            const reconciled = await fetchNextContent(s.student_id, trailId)
            setContent(reconciled)
          }
        } catch {
          /* ignore */
        }
      }
    } finally {
      advanceInFlightRef.current = false
      setBusy(false)
      setBusyReason(null)
      busyReasonRef.current = null
      setTrailBusyLabel('Preparando etapa…')
      setContinuarLeaving(false)
      // Mantém lock ~1.2s — paint/focus pós-busy ainda tentam puxar o scroll.
      if (pinnedAwayRef.current && threadRef.current) {
        threadRef.current.scrollTop = pinnedScrollTopRef.current
        nearBottomRef.current = false
        showJumpChip({ unseen: true })
        startPinLock(2500)
      } else {
        stopPinLock()
      }
      // R15-Y04 / R23-L01: ACK “salvo” só no sucesso (OM03 — sem vazamento no fail).
      if (advanceSucceeded) {
        window.requestAnimationFrame(() => {
          const lastAssistant = [...messagesRef.current]
            .reverse()
            .find((m) => m.role === 'assistant' || m.role === 'system')
          setSrAnnounce(
            lastAssistant
              ? 'Progresso salvo. Nova etapa da trilha disponível'
              : 'Progresso salvo. Etapa atualizada',
          )
          if (focusMessageById(lastAssistant?.id)) return
          if (continuarBtnRef.current && !continuarBtnRef.current.disabled) {
            continuarBtnRef.current.focus()
          } else {
            inputRef.current?.focus({ preventScroll: true })
          }
        })
      }
    }
  }

  async function doMaria(userLine: string) {
    if (content?.status !== 'ok') return
    // Exercício: Maria bloqueada até o feedback (depois libera — B3 / D#6).
    if (content.stage_type === 'exercise' && !exerciseDone) return
    const liveSession = ensureSessionOrRedirect()
    if (!liveSession) return
    mariaCancelledRef.current = false
    // Entra no sidechat já no envio — evita limbo sem Continuar/Voltar (R07-P02).
    setMariaSidechat(true)
    setBusy(true)
    setBusyReason('maria')
    clearError()
    const q = content.question_number
    const askLine = userLine
    setMessages((prev) => [
      ...prev,
      markAnimate({
        id: `u-${Date.now()}`,
        role: 'user',
        text: askLine,
        questionNumber: q,
        kind: 'sidechat',
        timeLabel: formatBubbleTime(null, true),
      }),
    ])
    // R12-O05 / R18-N04: só limpa draft no ack; falha restaura.
    setDraft('')
    try {
      const result = await askMaria({
        student_id: liveSession.student_id,
        trail_id: trailId,
        message: askLine,
        stage_number: content.stage_number,
        question_number: content.question_number,
      })
      setMessages((prev) => [
        ...prev,
        markAnimate({
          id: `m-${Date.now()}`,
          role: 'assistant',
          text: result.reply,
          questionNumber: q,
          kind: 'sidechat',
          timeLabel: formatBubbleTime(null, true),
        }),
      ])
      // Se o aluno já voltou, não reabre o limbo do sidechat.
      if (!mariaCancelledRef.current) {
        setMariaSidechat(true)
        setMariaEntrance(true)
      }
    } catch (err) {
      setDraft(askLine)
      reportError(err, 'Erro ao falar com Maria.', () => {
        void doMaria(askLine)
      })
      if (!mariaCancelledRef.current) {
        setMariaSidechat(true)
      }
    } finally {
      setBusy(false)
      setBusyReason(null)
      // C2-R7 N01 / R23-L04: Voltar/composer estável — reafirma pós-fecho do KB.
      focusAfterMariaAck()
    }
  }

  function onVoltarParaTrilha() {
    mariaCancelledRef.current = true
    setMariaSidechat(false)
    setMariaEntrance(false)
    // PR01 / R30: sai da Maria no mesmo frame — não esperar settle do askMaria.
    setBusy(false)
    setBusyReason(null)
    setShowTyping(false)
    clearError()
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
      clearJumpChip()
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
    // F08: pós-Voltar → foco no Continuar (ou composer).
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (continuarBtnRef.current && !continuarBtnRef.current.disabled) {
          continuarBtnRef.current.focus()
        } else {
          inputRef.current?.focus()
        }
      }, 80)
    })
  }

  /** D#2: toque só seleciona; Enviar confirma. */
  function onOptionSelect(option: ExerciseOption) {
    if (busy || content?.status !== 'ok' || content.stage_type !== 'exercise') {
      return
    }
    if (exerciseDone || exercisePhase === 'submitting') return
    setSelectedOptionKey(option.key)
    setExercisePhase('selected')
    setPendingOptionKey(null)
    clearError()
    // R23-L04: seleção mantém foco no radio (não deixa cair no body).
    window.requestAnimationFrame(() => {
      const selected = document.querySelector(
        `.chat-exercise__option.is-selected`,
      ) as HTMLElement | null
      selected?.focus({ preventScroll: true })
    })
  }

  async function submitSelectedOption() {
    if (busy || content?.status !== 'ok' || content.stage_type !== 'exercise') {
      return
    }
    if (exerciseDone || exercisePhase === 'submitting') return
    const liveSession = ensureSessionOrRedirect()
    if (!liveSession) return
    const option = normalizeExerciseOptions(content.options).find(
      (o) => o.key === selectedOptionKey,
    )
    if (!option) return

    setBusy(true)
    setBusyReason('exercise')
    setPendingOptionKey(option.key)
    setExercisePhase('submitting')
    clearError()
    setMariaSidechat(false)
    const q = content.question_number
    try {
      const attempt = await submitExerciseAttempt({
        student_id: liveSession.student_id,
        institution_id: liveSession.institution_id,
        trail_id: trailId,
        stage_number: content.stage_number,
        question_number: content.question_number,
        student_answer: option.key,
        feedback: content.explanation,
      })
      // D#3: só feedback da escola / IA — sem hardcode de veredito.
      const pedagogical = attempt.pedagogical_feedback?.trim() || null
      let rich =
        content.explanation?.trim() ||
        pedagogical ||
        attempt.feedback?.trim() ||
        null
      if (rich) {
        rich = stripHardcodedVerdict(rich) || null
      }
      // R02: não misturar “Parabéns pelo acerto” com attempt errado.
      if (rich && attempt.score !== null) {
        rich = alignBlocoWithAttempt(rich, attempt.is_correct) || null
      }
      const feedbackText = rich?.trim() || null
      // B3: se o BLOCO seguinte já entrou neste feedback, pular reentrega.
      skipNextBlocoDeliveryRef.current = Boolean(feedbackText)
      // B5: opção escolhida vira banner no histórico (não some).
      setMessages((prev) => {
        const next = [
          ...prev,
          markAnimate({
            id: `u-${Date.now()}`,
            role: 'user',
            text: option.text,
            stageType: 'exercise' as const,
            kind: 'exercise-answer' as const,
            questionNumber: q,
          }),
        ]
        if (feedbackText) {
          next.push(
            markAnimate({
              id: `f-${Date.now()}`,
              role: 'assistant',
              text: feedbackText,
              stageType: 'exercise',
              kind: 'feedback',
              questionNumber: q,
            }),
          )
        }
        return next
      })
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
      if (feedbackText) {
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
      }
      setExerciseDone(true)
      setExercisePhase('done')
      setSelectedOptionKey(null)
      setPendingOptionKey(null)
      // R23-L02 / L07: anunciar feedback + focar Continuar (chrome, sem CTA novo).
      setSrAnnounce(
        feedbackText
          ? 'Feedback da questão disponível. Pode continuar.'
          : 'Resposta enviada. Pode continuar.',
      )
    } catch (err) {
      skipNextBlocoDeliveryRef.current = false
      // R18-N06: falha → error; mantém card + seleção.
      // OM02: um recovery — Enviar (não 2× “Tentar de novo” banner+card).
      // OM03: limpa ACK stale de Continuar no fail de envio.
      setExercisePhase('error')
      setPendingOptionKey(null)
      setSrAnnounce('')
      reportError(err, 'Erro ao enviar a resposta.')
    } finally {
      setBusy(false)
      setBusyReason(null)
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          if (continuarBtnRef.current && !continuarBtnRef.current.disabled) {
            continuarBtnRef.current.focus()
            return
          }
          const feedback = [...messagesRef.current]
            .reverse()
            .find((m) => m.kind === 'feedback')
          if (focusMessageById(feedback?.id)) return
          const selected = document.querySelector(
            `.chat-exercise__option.is-selected`,
          ) as HTMLElement | null
          selected?.focus({ preventScroll: true })
        }, 80)
      })
    }
  }

  async function onSend(event?: FormEvent) {
    event?.preventDefault()
    if (busy || content?.status !== 'ok') return

    // Exercício: Enviar confirma a opção selecionada (D#2); Maria bloqueada (D#6).
    if (content.stage_type === 'exercise' && !exerciseDone) {
      if (selectedOptionKey) {
        await submitSelectedOption()
      }
      return
    }

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
  const options =
    content?.status === 'ok' && content.stage_type === 'exercise'
      ? normalizeExerciseOptions(content.options)
      : []
  /** ER06: exercício sem opções = falha de carga, não lock eterno. */
  const exerciseOptionsMissing =
    onExerciseStep && !exerciseDone && options.length === 0
  /** Maria/free-text bloqueados no exercício até feedback (D#6). */
  const mariaLockedOnExercise =
    onExerciseStep && !exerciseDone && !exerciseOptionsMissing
  const composerBlocked =
    mariaLockedOnExercise || busy || content?.status !== 'ok'
  /** Enviar confirma opção selecionada no exercício (D#2). */
  const canSubmitExercise =
    mariaLockedOnExercise &&
    !!selectedOptionKey &&
    !busy &&
    exercisePhase !== 'submitting' &&
    (exercisePhase === 'selected' || exercisePhase === 'error')
  const canSendFreeText =
    content?.status === 'ok' && !busy && !composerBlocked && !!draft.trim()
  const canSend = canSubmitExercise || canSendFreeText

  const showContinuar =
    content?.status === 'ok' &&
    !busy &&
    !continuarLeaving &&
    !mariaSidechat &&
    !advanceInFlightRef.current &&
    !exerciseOptionsMissing &&
    (content.stage_type === 'fixed' ||
      content.stage_type === 'ai' ||
      (content.stage_type === 'exercise' && exerciseDone))

  /**
   * PR02 / R30: Voltar só no sidechat ativo (paridade #6).
   * Nunca empilhar com Continuar após exit — hist sidechat/entrance não bastam.
   */
  const showVoltarTrilha =
    content?.status === 'ok' &&
    mariaSidechat &&
    (!busy || busyReason === 'maria')

  /** D#10 / R14-L14 — UI Maria mantém seta. */
  const continuarLabel = 'Continuar trilha →'

  /**
   * R08-M02: com embed YT/Drive na etapa corrente, Continuar vira secundário
   * (outline) para não competir com a mídia como CTA verde primário.
   */
  const currentStageHasEmbed =
    content?.status === 'ok' &&
    textHasEmbed(contentToAssistantText(content))

  const markExternalMediaOpen = useCallback((msgId: string, href: string) => {
    externalMediaOpenRef.current = { msgId, href, at: Date.now() }
  }, [])

  const exerciseLockLabel =
    exercisePhase === 'submitting'
      ? 'Enviando resposta…'
      : exercisePhase === 'error'
        ? 'Falha ao enviar — toque em Enviar para tentar de novo'
        : selectedOptionKey
          ? 'Toque em Enviar para confirmar'
          : 'Escolha uma opção e toque em Enviar'

  const exercisePrompt =
    content?.status === 'ok' && content.stage_type === 'exercise'
      ? exercisePromptFromContent(content)
      : ''

  /**
   * B5 / R18-N06: opções ficam visíveis em idle→error→submitting;
   * só saem após exerciseDone (banner já está no thread). Nunca some sem ack.
   */
  const optionsVisible =
    content?.status === 'ok' &&
    content.stage_type === 'exercise' &&
    !exerciseDone &&
    options.length > 0
  const exerciseComposerOpen = optionsVisible
  const highlightOptionKey = pendingOptionKey || selectedOptionKey
  const exerciseSubmitting = exercisePhase === 'submitting'

  const currentQuestion =
    content?.status === 'ok' ? content.question_number : null
  const collapsedTail = messagesForCollapsedTail(messages, currentQuestion)
  /** Fora do sidechat: tail focado na aula (N02) — Maria hist só no expand. */
  const focusedCollapsedTail =
    mariaSidechat || historyExpanded
      ? collapsedTail
      : collapsedTail.filter(isTrailStepMessage)
  const hiddenHistoryCount = Math.max(
    0,
    messages.length - focusedCollapsedTail.length,
  )
  const showHistoryCollapse =
    historyHasMore || hiddenHistoryCount > 0
  const rawVisibleMessages =
    historyExpanded || hiddenHistoryCount === 0
      ? messages
      : focusedCollapsedTail
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
    // C2-R6 N03: expand local primeiro → âncora na etapa; older page sem roubar scroll.
    pendingScrollAnchorRef.current = { kind: 'current-step' }
    setHistoryExpanded(true)
    if (historyHasMore) {
      // Espera o paint do expand + current-step antes do prepend de página antiga.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
      await loadOlderHistory({ keepCurrentStep: true })
      // Reafirma após merge (layoutEffect seguinte).
      pendingScrollAnchorRef.current = { kind: 'current-step' }
      const scroller = threadRef.current
      if (scroller) scrollToCurrentStep(scroller)
    }
  }

  /** F06: setas movem entre opções; nunca vazam foco para iframe. */
  function onOptionKeyDown(
    e: KeyboardEvent<HTMLButtonElement>,
    optIndex: number,
    opts: ExerciseOption[],
  ) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowLeft') {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    const delta =
      e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1
    const next = (optIndex + delta + opts.length) % opts.length
    const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '.chat-exercise__option',
    )
    buttons?.[next]?.focus()
  }

  const exerciseLockedComposer =
    content?.status === 'ok' &&
    content.stage_type === 'exercise' &&
    !exerciseDone

  /** C2-R6 N04: trilha bogus / inativa — empty-state + sem composer zumbi. */
  const trailShellUnavailable =
    historyReady &&
    ((content != null &&
      (content.status === 'not_found' ||
        content.status === 'inactive_trail' ||
        content.status === 'inactive_student')) ||
      (content == null && Boolean(error)))

  const trailEmptyCopy =
    content?.status === 'inactive_student'
      ? 'Sua conta está inativa nesta trilha.'
      : content?.status === 'inactive_trail'
        ? 'Esta trilha está inativa no momento.'
        : (content && content.status !== 'ok' ? content.message : null) ||
          error ||
          'Essa trilha não está disponível na sua conta.'

  const placeholder =
    content == null
      ? historyReady
        ? 'Trilha indisponível no momento'
        : 'Carregando a trilha…'
      : content.status !== 'ok'
        ? 'Trilha indisponível no momento'
        : 'Pergunte à Maria...'

  const trailBusy = Boolean(busy && busyReason === 'trail') || continuarLeaving
  const hintKey =
    content?.status !== 'ok'
      ? 'off'
      : trailBusy
        ? trailBusyLabel.startsWith('Salvando')
          ? 'busy-save'
          : 'busy-load'
        : content.stage_type === 'exercise'
          ? exerciseDone
            ? 'ex-done'
            : exerciseComposerOpen
              ? 'ex-locked'
              : 'ex-pending'
          : mariaSidechat
            ? 'maria'
            : 'trail'

  // C2-R4 N01/N03: typing alinhado ao CTA (trail) e estágio longo (Maria).
  const typing = typingCopy(busyReason, {
    trailLabel: trailBusyLabel,
    mariaLongWait,
  })
  /** C2-R4 N04: bob infinito só fora da espera da resposta. */
  const mariaBusyWaiting = Boolean(busy && busyReason === 'maria')
  /**
   * R04-L03 / R01-F25 / R01-F05 / R09-X09 + C2-R1 N03:
   * typing em Maria/feedback/Continuar (trail) — nunca junto do card “Enviando…”.
   */
  const showTypingBubble =
    busy &&
    showTyping &&
    (busyReason === 'maria' ||
      busyReason === 'exercise' ||
      busyReason === 'trail') &&
    exercisePhase !== 'submitting'
  const showCtaSlot =
    content?.status === 'ok' &&
    (showContinuar ||
      showVoltarTrilha ||
      continuarLeaving ||
      (busy && busyReason === 'trail') ||
      (busy && busyReason === 'maria' && mariaSidechat))
  /** F02/F07: Enviar permanece no Tab com aria-disabled no exercício sem seleção. */
  const sendAriaDisabled = exerciseLockedComposer && !canSubmitExercise
  const sendDisabledHard = !exerciseLockedComposer && !canSend
  /** R01-F15 / R09-X05: enunciado fica no card; bolha da célula atual some o corpo. */
  const activeExerciseCellKey =
    content?.status === 'ok' &&
    content.stage_type === 'exercise' &&
    !exerciseDone
      ? trailCellKey(content.stage_number, content.question_number)
      : null
  const exerciseLegend =
    exerciseSubmitting
      ? 'Enviando resposta…'
      : exercisePhase === 'error'
        ? 'Não foi possível enviar'
        : 'Responda a questão'

  const currentCell =
    content?.status === 'ok'
      ? trailCellKey(content.stage_number, content.question_number)
      : null

  const lessonTitle =
    content?.status === 'ok' && content.stage_title
      ? stripDecorTitle(content.stage_title)
      : ''
  const lessonBody =
    content?.status === 'ok'
      ? stripOptionLines(
          (content.content ?? '').trim() ||
            (content.stage_type === 'ai' && content.prompt
              ? 'Gerando conteúdo da tutoria…'
              : ''),
        )
      : ''

  const showLessonCard =
    content?.status === 'ok' && Boolean(lessonTitle || lessonBody)

  const showMariaEntrance =
    mariaEntrance ||
    mariaSidechat ||
    visibleMessages.some((m) => m.kind === 'sidechat')

  const chatMessages = visibleMessages.filter((msg) => {
    if (!String(msg.text ?? '').trim()) return false
    const promptMovedToCard =
      Boolean(activeExerciseCellKey) &&
      msg.role === 'assistant' &&
      msg.stageType === 'exercise' &&
      msg.cellKey === activeExerciseCellKey
    // Mantém a bolha do enunciado ativo para o cue "Questão abaixo…".
    if (promptMovedToCard) return true
    if (
      showLessonCard &&
      currentCell &&
      msg.cellKey === currentCell &&
      msg.role === 'assistant' &&
      msg.kind !== 'feedback' &&
      msg.kind !== 'sidechat' &&
      msg.kind !== 'resume'
    ) {
      return false
    }
    return true
  })

  function renderBubbleParts(text: string, msgId?: string) {
    return renderMessageLines(text).map((part) =>
      renderMessagePart(part, {
        onOpenExternalMedia: msgId
          ? (href) => markExternalMediaOpen(msgId, href)
          : undefined,
      }),
    )
  }

  return (
    <main
      className="chat-thread"
      aria-busy={busy || undefined}
      aria-labelledby="crias-player-heading"
    >
      <h1 id="crias-player-heading" className="visually-hidden">
        Player da trilha {trailHeading}
      </h1>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {srAnnounce}
      </div>
      {error && !trailShellUnavailable ? (
        <div className="error chat-thread__banner" role="alert">
          <p className="chat-thread__banner-text">{error}</p>
          {canRetry ? (
            <button
              type="button"
              className="chat-thread__retry"
              onClick={() => {
                const fn = retryFnRef.current
                clearError()
                fn?.()
              }}
            >
              Tentar de novo
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="chat-thread__body">
        <div
          id="crias-thread-log"
          className="chat-thread__scroll"
          ref={threadRef}
          onScroll={updateNearBottom}
          role="log"
          aria-relevant="additions"
          aria-busy={historyLoadingMore || undefined}
        >
        {/* R04-L06: busy observável no expand/prepend do histórico. */}
        {historyLoadingMore && !trailShellUnavailable ? (
          <div
            className="chat-thread__skeleton chat-thread__skeleton--prepend"
            aria-hidden="true"
          >
            <div className="chat-thread__skeleton-line chat-thread__skeleton-line--short" />
            <div className="chat-thread__skeleton-line chat-thread__skeleton-line--mid" />
            <div className="chat-thread__skeleton-line chat-thread__skeleton-line--long" />
            <p className="muted chat-thread__skeleton__label">
              Carregando mensagens…
            </p>
          </div>
        ) : null}
        {!trailShellUnavailable && !historyExpanded && showHistoryCollapse ? (
          <div className="chat-history-collapse">
            <button
              type="button"
              className="chat-history-collapse__btn"
              disabled={historyLoadingMore}
              aria-expanded={false}
              aria-controls="crias-thread-log"
              onClick={() => void onExpandHistory()}
            >
              {historyLoadingMore
                ? 'Carregando mensagens…'
                : `Ver mensagens anteriores${
                    hiddenHistoryCount > 0
                      ? ` (${hiddenHistoryCount}${historyHasMore ? '+' : ''})`
                      : historyHasMore
                        ? ''
                        : ''
                  }`}
            </button>
          </div>
        ) : null}
        {!trailShellUnavailable &&
        historyExpanded &&
        (showHistoryCollapse || historyHasMore) ? (
          <div className="chat-history-collapse">
            {historyHasMore ? (
              <button
                type="button"
                className="chat-history-collapse__btn"
                disabled={historyLoadingMore}
                aria-busy={historyLoadingMore || undefined}
                onClick={() => void loadOlderHistory()}
              >
                {historyLoadingMore
                  ? 'Carregando mensagens…'
                  : 'Carregar mensagens mais antigas'}
              </button>
            ) : null}
            <button
              type="button"
              className="chat-history-collapse__btn"
              aria-expanded={true}
              aria-controls="crias-thread-log"
              onClick={() => setHistoryExpanded(false)}
            >
              Recolher mensagens anteriores
            </button>
          </div>
        ) : null}
        {!trailShellUnavailable && showLessonCard ? (
          <section
            className="lesson-card"
            aria-label="Conteúdo da etapa"
            data-current-step="true"
          >
            <span className="lesson-card__icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4.5 5.25c1.6-.9 3.4-1.35 5.25-1.35.95 0 1.9.15 2.8.45v14.4a9.3 9.3 0 0 0-2.8-.45c-1.85 0-3.65.45-5.25 1.35V5.25z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.5 5.25c-1.6-.9-3.4-1.35-5.25-1.35-.95 0-1.9.15-2.8.45v14.4c.9-.3 1.85-.45 2.8-.45 1.85 0 3.65.45 5.25 1.35V5.25z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="lesson-card__copy">
              {lessonTitle ? (
                <h2 className="lesson-card__title">{lessonTitle}</h2>
              ) : null}
              {lessonBody ? (
                <div className="lesson-card__body">
                  {renderBubbleParts(lessonBody)}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {!trailShellUnavailable && showMariaEntrance ? (
          <div className="maria-entrance" aria-live="polite">
            <div className="maria-entrance__divider">
              <span className="maria-entrance__pill">
                <span aria-hidden>✦</span> Parceiro de estudo chamado
              </span>
            </div>
            <div className="maria-entrance__row">
              <MariaMascot
                className={`maria-mascot${
                  mariaBusyWaiting ? ' maria-mascot--static' : ''
                }`}
              />
              <div className="maria-entrance__intro">
                <p className="maria-entrance__intro-label">MARIA</p>
                <p className="maria-entrance__intro-text">
                  Oi, eu sou a Maria.
                  <span>Vim te ajudar.</span>
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!trailShellUnavailable &&
          chatMessages.map((msg) => {
          const promptMovedToCard =
            Boolean(activeExerciseCellKey) &&
            msg.role === 'assistant' &&
            msg.stageType === 'exercise' &&
            msg.cellKey === activeExerciseCellKey
          const speaker =
            msg.role === 'assistant'
              ? 'MARIA'
              : msg.role === 'user'
                ? 'Você'
                : 'Sistema'
          const labelId = `bubble-label-${msg.id}`
          const isFeedback = msg.kind === 'feedback'
          const mediaResume = mediaResumeMsgId === msg.id
          return (
            <article
              key={msg.id}
              className={`${bubbleClassName(msg)}${
                promptMovedToCard ? ' chat-bubble--prompt-in-card' : ''
              }${mediaResume ? ' chat-bubble--media-resume' : ''}`}
              data-msg-id={msg.id}
              data-stage-type={msg.stageType}
              data-cell-key={msg.cellKey || undefined}
              data-animate={msg.animate ? 'true' : undefined}
              data-media-resume={mediaResume ? 'true' : undefined}
              aria-labelledby={msg.role !== 'user' ? labelId : undefined}
              aria-label={msg.role === 'user' ? 'Você' : undefined}
              tabIndex={-1}
              {...(isFeedback
                ? { role: 'status', 'aria-live': 'polite' as const }
                : {})}
            >
              <div className="chat-bubble__row">
                <span className="chat-bubble__avatar" aria-hidden>
                  {msg.role === 'user' ? 'V' : msg.role === 'assistant' ? 'M' : 'S'}
                </span>
                <div className="chat-bubble__stack">
                  {msg.role !== 'user' ? (
                    <p className="chat-bubble__label" id={labelId}>
                      {speaker}
                    </p>
                  ) : null}
                  <div className="chat-bubble__text">
                    {promptMovedToCard ? (
                      <p className="muted">Questão abaixo — escolha uma opção.</p>
                    ) : (
                      renderBubbleParts(msg.text, msg.id)
                    )}
                  </div>
                  <div className="chat-bubble__meta">
                    <span>
                      {msg.timeLabel || formatBubbleTime(null, true) || ''}
                    </span>
                    {msg.role === 'user' ? (
                      <span className="chat-bubble__checks" aria-label="Enviada">
                        ✓✓
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          )
        })}

        {showTypingBubble ? (
          <article
            className={`chat-bubble chat-bubble--assistant chat-bubble--typing chat-bubble--typing-${busyReason || 'trail'}${
              mariaLongWait && busyReason === 'maria'
                ? ' chat-bubble--typing-long'
                : ''
            }`}
            aria-live="polite"
            aria-label={typing.aria}
            data-busy-reason={busyReason || undefined}
            data-long-wait={
              mariaLongWait && busyReason === 'maria' ? 'true' : undefined
            }
          >
            <div className="chat-bubble__row">
              <span className="chat-bubble__avatar" aria-hidden>
                M
              </span>
              <div className="chat-bubble__stack">
                <p className="chat-bubble__label">{typing.label}</p>
                <div className="chat-bubble__text">
                  <span className="typing-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="typing-dots__reduced">{typing.reduced}</span>
                  {mariaLongWait && busyReason === 'maria' ? (
                    <p className="typing-dots__status" aria-hidden="true">
                      Ainda pensando…
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ) : null}

        {!historyReady ? (
          <div className="chat-thread__skeleton" aria-hidden="true">
            <div className="chat-thread__skeleton-line chat-thread__skeleton-line--short" />
            <div className="chat-thread__skeleton-line chat-thread__skeleton-line--long" />
            <div className="chat-thread__skeleton-line chat-thread__skeleton-line--mid" />
            <p className="muted chat-thread__loading">Carregando a trilha…</p>
          </div>
        ) : null}
        {historyReady && !content && !error ? (
          <p className="muted chat-thread__loading">Carregando…</p>
        ) : null}
        {trailShellUnavailable ? (
          <div className="chat-thread__empty" role="status">
            <p className="chat-thread__empty-title">Trilha não encontrada</p>
            <p className="lede">{trailEmptyCopy}</p>
            <Link to="/" className="chat-home__cta">
              Minhas trilhas
            </Link>
          </div>
        ) : null}
        {exerciseOptionsMissing ? (
          <div className="chat-exercise chat-exercise--error" role="alert">
            <p className="chat-exercise__legend">Questão indisponível</p>
            <p>
              Não foi possível carregar as opções. Toque em “Tentar de novo” no
              aviso acima.
            </p>
          </div>
        ) : null}

        {optionsVisible ? (
          <div
            className={[
              'chat-exercise',
              exerciseSubmitting ? 'chat-exercise--pending' : '',
              exercisePhase === 'error' ? 'chat-exercise--error-state' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="group"
            aria-label="Responda a questão"
            aria-busy={exerciseSubmitting || undefined}
            data-exercise-phase={exercisePhase}
          >
            <p className="chat-exercise__legend">{exerciseLegend}</p>
            {exercisePrompt ? (
              <div className="chat-exercise__prompt">
                {renderMessageLines(exercisePrompt).map((part) =>
                  renderMessagePart(part),
                )}
              </div>
            ) : null}
            <div
              className="chat-exercise__options"
              role="radiogroup"
              aria-label="Opções da questão"
            >
              {options.map((opt, optIndex) => {
                const selected = highlightOptionKey === opt.key
                const dimmed = exerciseSubmitting && !selected
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={[
                      'chat-exercise__option',
                      selected ? 'is-selected' : '',
                      dimmed ? 'is-dimmed' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={busy || exerciseSubmitting}
                    onClick={() => onOptionSelect(opt)}
                    onKeyDown={(e) => onOptionKeyDown(e, optIndex, options)}
                  >
                    {opt.text}
                  </button>
                )
              })}
            </div>
            {exercisePhase === 'error' ? (
              <div className="chat-exercise__retry" role="status">
                <p>
                  Não foi possível enviar. Sua escolha foi mantida. Toque em
                  Enviar para tentar de novo.
                </p>
              </div>
            ) : null}
            {exerciseSubmitting ? (
              <p className="chat-exercise__pending-label" aria-live="polite">
                Enviando resposta…
              </p>
            ) : null}
          </div>
        ) : null}

      </div>

      {/* CTA fora do scroller: não cobre bolhas (C3-CTA-OVERLAP); pin C2-40 intacto. */}
      {showCtaSlot && !trailShellUnavailable ? (
        <div
          className={`chat-cta-slot${trailBusy ? ' chat-cta-slot--busy' : ''}`}
        >
          {/* C2-R6 N02: chip docked no CTA — sem overlap de bolha/card. */}
          {jumpChip ? (
            <button
              type="button"
              className="chat-new-msg-chip chat-new-msg-chip--docked"
              onClick={() => scrollToBottom('smooth')}
            >
              {unseenBelow ? 'Nova mensagem' : 'Ir para o fim'}
            </button>
          ) : null}
          {showVoltarTrilha ? (
            <div className="chat-continue chat-continue--sidechat chat-continue--enter">
              <button
                ref={voltarBtnRef}
                type="button"
                className="chat-continue__btn"
                onClick={onVoltarParaTrilha}
              >
                Voltar à trilha
              </button>
            </div>
          ) : null}

          {showContinuar || trailBusy ? (
            <div
              className={`chat-continue${trailBusy ? ' chat-continue--leaving' : ' chat-continue--enter'}${
                currentStageHasEmbed && !trailBusy
                  ? ' chat-continue--with-media'
                  : ''
              }`}
            >
              {currentStageHasEmbed && !trailBusy ? (
                <p className="chat-cta-slot__media-hint">
                  Vídeo na etapa — Continuar trilha quando quiser
                </p>
              ) : null}
              <button
                ref={continuarBtnRef}
                type="button"
                className={`chat-continue__btn${
                  currentStageHasEmbed && !trailBusy
                    ? ' chat-continue__btn--secondary'
                    : ''
                }`}
                disabled={
                  busy ||
                  continuarLeaving ||
                  advanceInFlightRef.current ||
                  offline
                }
                aria-busy={trailBusy || undefined}
                onClick={() => void doAdvance()}
              >
                {trailBusy ? trailBusyLabel : continuarLabel}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {jumpChip && !showCtaSlot && !trailShellUnavailable ? (
        <button
          type="button"
          className="chat-new-msg-chip"
          onClick={() => scrollToBottom('smooth')}
        >
          {unseenBelow ? 'Nova mensagem' : 'Ir para o fim'}
        </button>
      ) : null}
      {/* C2-R7 N02: CTA some sob KB (display:none) — chip docked some junto;
          fallback absoluto só visível com data-keyboard=open. */}
      {jumpChip && showCtaSlot && !trailShellUnavailable ? (
        <button
          type="button"
          className="chat-new-msg-chip chat-new-msg-chip--kb-fallback"
          onClick={() => scrollToBottom('smooth')}
        >
          {unseenBelow ? 'Nova mensagem' : 'Ir para o fim'}
        </button>
      ) : null}
      </div>

      {!trailShellUnavailable ? (
      <footer
        className={`chat-composer${
          exerciseLockedComposer ? ' chat-composer--locked' : ''
        }${canSubmitExercise ? ' chat-composer--ready-submit' : ''}${
          showContinuar ? ' chat-composer--with-continue' : ''
        }${showVoltarTrilha ? ' chat-composer--with-voltar' : ''}`}
      >
<form
          className="chat-composer__form"
          onSubmit={(e) => {
            if (sendAriaDisabled) {
              e.preventDefault()
              return
            }
            void onSend(e)
          }}
        >
          {exerciseLockedComposer ? (
            <span
              className="chat-composer__lock"
              aria-hidden="true"
              title={exerciseLockLabel}
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
                {exerciseLockLabel}
              </span>
            </span>
          ) : null}
          <textarea
            ref={inputRef}
            className="chat-composer__input"
            rows={1}
            value={draft}
            disabled={composerBlocked && !exerciseLockedComposer}
            readOnly={exerciseLockedComposer}
            placeholder={exerciseLockedComposer ? '' : placeholder}
            aria-label={
              exerciseLockedComposer ? exerciseLockLabel : 'Pergunte à Maria'
            }
            enterKeyHint={canSubmitExercise ? 'send' : 'send'}
            inputMode="text"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onComposerKeyDown}
          />
          <button
            type="submit"
className={`chat-composer__send${sendAriaDisabled ? ' is-aria-disabled' : ''}`}
            disabled={sendDisabledHard}
            aria-disabled={sendAriaDisabled || undefined}
            aria-label={
              canSubmitExercise
                ? 'Enviar resposta'
                : sendAriaDisabled
                  ? 'Enviar — escolha uma opção primeiro'
                  : 'Enviar pergunta à Maria'
            }
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4.5 11.2 19.2 4.7a.8.8 0 0 1 1.1.9l-3.6 14.2a.8.8 0 0 1-1.3.4l-4.3-3.7-2.5 2.4a.6.6 0 0 1-1-.4v-3.9l11-8.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
        {content?.status === 'ok' && !exerciseLockedComposer ? (
          <p key={hintKey} className="muted chat-composer__hint chat-composer__hint--fade">
            {/* R01-F06 / R01-F09 / R14-L01 + C2-R1 N03 */}
            {trailBusy
              ? // C2-R4 N01: rodapé na mesma fase do CTA/typing
                trailBusyLabel.startsWith('Salvando')
                ? 'Aguarde — salvando progresso'
                : 'Aguarde — carregando a próxima etapa'
              : content.stage_type === 'exercise'
                ? showContinuar
                  ? 'Pergunte à Maria · Continuar trilha avança'
                  : 'Pergunte à Maria; o botão verde avança a trilha'
                : mariaSidechat
                  ? 'Voltar à trilha reexibe o passo atual'
                  : showContinuar
                    ? 'Enviar fala com Maria · Continuar trilha avança'
                    : 'Enviar fala com Maria · o botão verde avança a trilha'}
          </p>
        ) : null}
      </footer>
      ) : null}
    </main>
  )
}
