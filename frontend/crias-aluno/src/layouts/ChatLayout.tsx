import Horizon from '../components/Horizon'
import EdgeFade from '../components/EdgeFade'
import LogoutDialog from '../components/LogoutDialog'
import { aplicarTema, temaAtual, type Tema } from '../lib/tema'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  fetchTrailActivities,
  fetchTrailNames,
  fetchTrailQuestionTotals,
  fetchTrailStageTotals,
  isAuthError,
  listStudentTrails,
  type StudentTrailRow,
  type TrailActivity,
} from '../lib/api'
import { confirmOnline } from '../lib/connectivity'
import { toUserFacingError } from '../lib/networkError'
import {
  clearSession,
  getSession,
  SESSION_CLEARED_EVENT,
} from '../lib/session'
import { writeFocusedTrailId } from '../lib/trailFocus'
import {
  activityProgressPct,
  formatAtividadeLabel,
  formatTrailChromeProgress,
} from '../lib/trailProgressLabel'

const STATUS_LABEL: Record<StudentTrailRow['status'], string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  blocked: 'Bloqueada',
}

/**
 * Shell compacto (= menu em tela cheia). v1.0, seção 3: ponto de quebra único, 768px.
 * Até 768px é celular. Acima disso o menu fica fixo, de 280px, e é recolhível.
 */
const COMPACT_MQ = '(max-width: 768px)'

function isCompactViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(COMPACT_MQ).matches
}

/** Compacto: drawer fechado por padrão (C5-MOBILE-SIDEBAR-CTA / LS01). */
function initialSidebarOpen() {
  if (typeof window === 'undefined') return true
  return !isCompactViewport()
}

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
}

/** Quem também usa a Gestão (professor, coordenação) vê o seletor Aluno | Gestão. A Gestão grava este aviso. */
function hasGestaoAccess(): boolean {
  try {
    return localStorage.getItem('crias:acesso-gestao') === '1'
  } catch {
    return false
  }
}

export default function ChatLayout() {
  const session = getSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [rows, setRows] = useState<StudentTrailRow[] | null>(null)
  const [trailsError, setTrailsError] = useState<string | null>(null)
  const [trailsLoading, setTrailsLoading] = useState(true)
  const [stageTotals, setStageTotals] = useState<Record<string, number>>({})
  /** Totais de atividades (question) por trilha — INTERFACE / R5-N01. */
  const [questionTotals, setQuestionTotals] = useState<Record<string, number>>(
    {},
  )
  /** C2-R1 N04: nome humano da trilha (nunca ID cru na UI). */
  const [trailNames, setTrailNames] = useState<Record<string, string>>({})
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen)
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )
  const [isNarrow, setIsNarrow] = useState(() => isCompactViewport())
  const [playerChrome, setPlayerChrome] = useState<{
    trailId: string | null
    stageTitle: string | null
    stageNumber: number | null
    questionNumber: number | null
    mariaActive: boolean
    /** Player mostra a trilha concluída (progresso completo). */
    completed?: boolean
  }>({
    trailId: null,
    stageTitle: null,
    stageNumber: null,
    questionNumber: null,
    mariaActive: false,
  })
  const drawerAsModal = isNarrow && sidebarOpen
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const restoreFocusRef = useRef(false)
  /**
   * C3-R13 N01: entry de history do drawer modal — back do SO fecha o dialog
   * sem sair da trilha; Esc/Fechar dá history.back() para limpar a entry.
   */
  const drawerHistoryPushedRef = useRef(false)
  const drawerClosingFromPopRef = useRef(false)
  /** Só a resposta mais recente de /student_trails aplica (sem stale fora de ordem). */
  const trailsReqSeqRef = useRef(0)
  /** Títulos das atividades de cada trilha (menu e "AGORA" do Início). */
  const [activities, setActivities] = useState<Record<string, TrailActivity[]>>(
    {},
  )
  /** Trilhas com a lista de atividades aberta no menu. */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [tema, setTema] = useState<Tema>(() => temaAtual())

  // ER05: sessão sumiu mid-app → login (guarda rota para pós-login).
  useEffect(() => {
    if (!session) {
      navigate('/login', {
        replace: true,
        state: { reason: 'missing', from: location },
      })
    }
  }, [session, navigate, location])

  useEffect(() => {
    const onCleared = () => {
      navigate('/login', {
        replace: true,
        state: { reason: 'auth', from: location },
      })
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'crias_student_session' && !e.newValue) {
        navigate('/login', {
          replace: true,
          state: { reason: 'missing', from: location },
        })
      }
    }
    window.addEventListener(SESSION_CLEARED_EVENT, onCleared)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, onCleared)
      window.removeEventListener('storage', onStorage)
    }
  }, [navigate, location])

  const reloadTrails = useCallback(async () => {
    const s = getSession()
    if (!s) {
      clearSession('missing')
      navigate('/login', {
        replace: true,
        state: { reason: 'missing', from: location },
      })
      return
    }
    const seq = ++trailsReqSeqRef.current
    setTrailsLoading(true)
    setTrailsError(null)
    try {
      const data = await listStudentTrails(s.student_id)
      if (seq !== trailsReqSeqRef.current) return
      setRows(data)
    } catch (err) {
      if (seq !== trailsReqSeqRef.current) return
      if (isAuthError(err)) {
        clearSession('auth')
        navigate('/login', {
          replace: true,
          state: {
            reason: 'auth',
            message: (err as Error).message,
            from: location,
          },
        })
        return
      }
      setTrailsError(
        toUserFacingError(err, 'Não foi possível carregar suas trilhas.'),
      )
      setRows(null)
    } finally {
      if (seq === trailsReqSeqRef.current) setTrailsLoading(false)
    }
  }, [navigate, location])

  const reloadTrailsRef = useRef(reloadTrails)
  reloadTrailsRef.current = reloadTrails

  // R12-O01: indicador offline (não silencioso).
  // C3-R12 N02: evento `online` com rede morta — banner/CTA só após probe ok.
  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => {
      void (async () => {
        const ok = await confirmOnline()
        if (!ok) {
          setOffline(true)
          return
        }
        setOffline(false)
        void reloadTrailsRef.current()
      })()
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_MQ)
    const sync = () => {
      const compact = mq.matches
      setIsNarrow(compact)
      // R24-LS01 / R06-E09: landscape/compacto — drawer fecha (não gruda aberta).
      if (compact) setSidebarOpen(false)
    }
    sync()
    mq.addEventListener('change', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      mq.removeEventListener('change', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  const closeDrawer = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus
    setSidebarOpen(false)
  }, [])

  /**
   * R7-N01: Link do drawer navega; history.back() do efeito desfazia a rota.
   * Fecha sem pop — a entry pushState fica atrás da nova página (back ok).
   */
  const closeDrawerForNav = useCallback(() => {
    restoreFocusRef.current = false
    if (drawerHistoryPushedRef.current) {
      drawerHistoryPushedRef.current = false
      drawerClosingFromPopRef.current = true
    }
    setSidebarOpen(false)
  }, [])

  /**
   * C3-R13 N01: drawer modal empurra history; Android/browser back fecha o
   * dialog (popstate) em vez de ir para home. Esc/Fechar limpa a entry.
   */
  useEffect(() => {
    if (!drawerAsModal) {
      if (
        drawerHistoryPushedRef.current &&
        !drawerClosingFromPopRef.current
      ) {
        drawerHistoryPushedRef.current = false
        window.history.back()
      }
      drawerClosingFromPopRef.current = false
      return
    }
    if (!drawerHistoryPushedRef.current) {
      window.history.pushState({ criasDrawer: true }, '')
      drawerHistoryPushedRef.current = true
    }
    const onPop = () => {
      drawerClosingFromPopRef.current = true
      drawerHistoryPushedRef.current = false
      restoreFocusRef.current = true
      setSidebarOpen(false)
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
    }
  }, [drawerAsModal])

  // R03-A02 / A07 / F05: Escape + trap de foco + retorno ao ☰.
  useEffect(() => {
    if (!drawerAsModal) {
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false
        window.requestAnimationFrame(() => {
          menuBtnRef.current?.focus()
        })
      }
      return
    }
    const sidebar = sidebarRef.current
    if (!sidebar) return

    const focusables = focusableIn(sidebar)
    const first = focusables[0]
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDrawer(true)
        return
      }
      if (e.key !== 'Tab') return
      const list = focusableIn(sidebar)
      if (list.length === 0) return
      const head = list[0]
      const tail = list[list.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (!active || active === head || !sidebar.contains(active)) {
          e.preventDefault()
          tail.focus()
        }
      } else if (!active || active === tail || !sidebar.contains(active)) {
        e.preventDefault()
        head.focus()
      }
    }
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null
      if (target && !sidebar.contains(target)) {
        const list = focusableIn(sidebar)
        list[0]?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [drawerAsModal, closeDrawer])

  useEffect(() => {
    void reloadTrails()
    const onProgress = () => {
      void reloadTrails()
    }
    window.addEventListener('crias:trail-progress', onProgress)
    return () => {
      window.removeEventListener('crias:trail-progress', onProgress)
    }
  }, [reloadTrails, location.pathname])

  useEffect(() => {
    let cancelled = false
    void fetchTrailStageTotals()
      .then((map) => {
        if (!cancelled) setStageTotals(map)
      })
      .catch(() => {
        if (!cancelled) setStageTotals({})
      })
    void fetchTrailNames()
      .then((map) => {
        if (!cancelled) setTrailNames(map)
      })
      .catch(() => {
        if (!cancelled) setTrailNames({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Totais de atividade quando a lista de trilhas chega (R1-N01 / R5-N01).
  useEffect(() => {
    if (!rows?.length) return
    let cancelled = false
    const ids = rows.map((r) => r.trail_id)
    void fetchTrailQuestionTotals(ids)
      .then((map) => {
        if (!cancelled) setQuestionTotals(map)
      })
      .catch(() => {
        /* keep previous */
      })
    return () => {
      cancelled = true
    }
  }, [rows])

  // Títulos das atividades de cada trilha (só leitura, rota pública existente).
  useEffect(() => {
    if (!rows?.length) return
    let cancelled = false
    for (const r of rows) {
      void fetchTrailActivities(r.trail_id)
        .then((list) => {
          if (cancelled || list.length === 0) return
          setActivities((prev) => ({ ...prev, [r.trail_id]: list }))
        })
        .catch(() => {
          /* sem títulos: o menu mostra "Atividade N" */
        })
    }
    return () => {
      cancelled = true
    }
  }, [rows])

  // Player / rotas compactas: nunca reabrir drawer só por navegar.
  useEffect(() => {
    if (isCompactViewport()) {
      restoreFocusRef.current = false
      setSidebarOpen(false)
    }
  }, [location.pathname])

  function confirmLogout() {
    setLogoutOpen(false)
    clearSession('logout')
    navigate('/login', { replace: true })
  }

  function alternarTema() {
    const next: Tema = tema === 'escuro' ? 'claro' : 'escuro'
    aplicarTema(next)
    setTema(next)
  }

  const trailMatch = location.pathname.match(/^\/trilha\/([^/]+)/)
  const activeTrailId = trailMatch
    ? decodeURIComponent(trailMatch[1])
    : null
  const activeRow = rows?.find((r) => r.trail_id === activeTrailId) ?? null
  /** v1.0: atividade passada sendo vista (?atividade=N). Vazio = atividade atual. */
  const viewActivityRaw = new URLSearchParams(location.search).get('atividade')
  const viewActivity =
    viewActivityRaw && /^\d+$/.test(viewActivityRaw)
      ? Number.parseInt(viewActivityRaw, 10)
      : null

  useEffect(() => {
    if (activeTrailId) {
      setExpanded((prev) =>
        prev[activeTrailId] ? prev : { ...prev, [activeTrailId]: true },
      )
    }
  }, [activeTrailId])

  // Layout effect: listener ativo antes do layout effect do player que despacha.
  useLayoutEffect(() => {
    const onChrome = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        trailId?: string
        stageTitle?: string | null
        stageNumber?: number
        questionNumber?: number
        mariaActive?: boolean
        completed?: boolean
      }
      if (detail?.trailId && detail.trailId !== activeTrailId) return
      setPlayerChrome({
        trailId: detail.trailId ?? activeTrailId,
        stageTitle: detail.stageTitle ?? null,
        stageNumber:
          typeof detail.stageNumber === 'number' ? detail.stageNumber : null,
        questionNumber:
          typeof detail.questionNumber === 'number'
            ? detail.questionNumber
            : null,
        mariaActive: Boolean(detail.mariaActive),
        completed: Boolean(detail.completed),
      })
    }
    window.addEventListener('crias:player-chrome', onChrome)
    return () => window.removeEventListener('crias:player-chrome', onChrome)
  }, [activeTrailId])

  useEffect(() => {
    if (!activeTrailId) {
      setPlayerChrome({
        trailId: null,
        stageTitle: null,
        stageNumber: null,
        questionNumber: null,
        mariaActive: false,
      })
    }
  }, [activeTrailId])

  /**
   * Etapa exibida pelo player (mesma fonte do header). O GET /student_trails
   * do sidebar volta depois do next-content — sem isto o card da trilha ativa
   * ficava 1 etapa atrás (ex.: “Etapa 3 de 12 · 25%” com a etapa 4 na tela).
   */
  const playerStageNumber =
    activeTrailId &&
    playerChrome.trailId === activeTrailId &&
    typeof playerChrome.stageNumber === 'number'
      ? playerChrome.stageNumber
      : null
  const playerQuestionNumber =
    activeTrailId &&
    playerChrome.trailId === activeTrailId &&
    typeof playerChrome.questionNumber === 'number'
      ? playerChrome.questionNumber
      : null
  /** Trilha ativa concluída no player (antes do GET /student_trails voltar). */
  const playerCompleted =
    Boolean(activeTrailId) &&
    playerChrome.trailId === activeTrailId &&
    Boolean(playerChrome.completed)

  const firstName = useMemo(
    () => session?.name.split(' ')[0] || 'Aluno',
    [session?.name],
  )

  if (!session) return null

  // Menu em tela cheia (celular): o conteúdo atrás fica inerte enquanto o menu está aberto.
  const mainInert = drawerAsModal
  const onHome = location.pathname === '/'
  const onMonitoria = location.pathname === '/monitoria'

  /** Dados de uma trilha para o menu (mesma regra de progresso de antes). */
  function rowInfo(row: StudentTrailRow) {
    const rowCompleted =
      row.status === 'completed' ||
      (row.trail_id === activeTrailId && playerCompleted)
    const stageNumberRaw =
      row.trail_id === activeTrailId &&
      playerStageNumber != null &&
      row.status !== 'completed'
        ? playerStageNumber
        : row.current_stage_number
    const questionNumberRaw =
      row.trail_id === activeTrailId &&
      playerQuestionNumber != null &&
      row.status !== 'completed'
        ? playerQuestionNumber
        : row.current_question_number
    const totalStepsRaw =
      stageTotals[row.trail_id] && stageTotals[row.trail_id] > 0
        ? stageTotals[row.trail_id]
        : null
    const totalActivitiesRaw =
      questionTotals[row.trail_id] && questionTotals[row.trail_id] > 0
        ? questionTotals[row.trail_id]
        : null
    const stageNumber =
      rowCompleted && totalStepsRaw != null
        ? Math.max(totalStepsRaw, stageNumberRaw)
        : stageNumberRaw
    const questionNumber =
      rowCompleted && totalActivitiesRaw != null
        ? Math.max(totalActivitiesRaw, questionNumberRaw)
        : questionNumberRaw
    const pct =
      activityProgressPct({
        activity: questionNumber,
        totalActivities: totalActivitiesRaw,
        completed: rowCompleted,
      }) ??
      (totalStepsRaw != null
        ? rowCompleted
          ? 100
          : Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  ((Math.max(stageNumber, 1) - 1) /
                    Math.max(totalStepsRaw, stageNumber)) *
                    100,
                ),
              ),
            )
        : null)
    const rowStatus = rowCompleted ? 'completed' : row.status
    const label = trailNames[row.trail_id] || row.trail_id || 'Trilha'
    const meta =
      formatAtividadeLabel(questionNumber, totalActivitiesRaw) ||
      formatTrailChromeProgress({
        activity: questionNumber,
        totalActivities: totalActivitiesRaw,
        step: stageNumber,
        totalSteps: totalStepsRaw,
      }) ||
      `Atividade ${Math.max(questionNumber, 1)}`
    return {
      rowCompleted,
      rowStatus,
      questionNumber,
      totalActivities: totalActivitiesRaw,
      pct,
      label,
      meta,
    }
  }

  // Topo: título, pontos das etapas e "Atividade X de Y · Etapa A de B".
  const topTitle = activeTrailId
    ? trailNames[activeTrailId] || activeTrailId || 'Trilha'
    : onMonitoria
      ? 'Monitoria'
      : ''
  const totalStepsTop =
    activeTrailId && stageTotals[activeTrailId] > 0
      ? stageTotals[activeTrailId]
      : 0
  const currentActivityTop = activeTrailId
    ? playerCompleted && questionTotals[activeTrailId] > 0
      ? Math.max(
          questionTotals[activeTrailId],
          playerQuestionNumber ?? activeRow?.current_question_number ?? 1,
        )
      : (playerQuestionNumber ?? activeRow?.current_question_number ?? null)
    : null
  const shownActivityTop = currentActivityTop
  const stepTop =
    playerCompleted && totalStepsTop > 0
      ? Math.max(totalStepsTop, playerStageNumber ?? 1)
      : (playerStageNumber ?? activeRow?.current_stage_number ?? null)
  const topStage = onMonitoria
    ? 'Conversar com seu monitor'
    : activeTrailId
      ? formatTrailChromeProgress({
          activity: shownActivityTop,
          totalActivities:
            questionTotals[activeTrailId] > 0
              ? questionTotals[activeTrailId]
              : null,
          step: stepTop,
          totalSteps: totalStepsTop > 0 ? totalStepsTop : null,
        })
      : null
  const dotIndex =
    totalStepsTop > 0 && stepTop != null
      ? Math.min(totalStepsTop, Math.max(1, stepTop)) - 1
      : -1
  const dotsDone = playerCompleted

  const closeIcon = (
    <>
      <svg className="v1-0-icon-desk" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M9 4v16" />
      </svg>
      <svg className="v1-0-icon-mob" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </>
  )
  const openIcon = (
    <>
      <svg className="v1-0-icon-desk" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M9 4v16" />
      </svg>
      <svg className="v1-0-icon-mob" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    </>
  )

  return (
    <div className="v1-0-shell">
      {sidebarOpen ? (
        <aside
          id="crias-sidebar"
          ref={sidebarRef}
          className="v1-0-sidebar"
          aria-label="Menu"
          aria-modal={drawerAsModal ? true : undefined}
          role={drawerAsModal ? 'dialog' : 'navigation'}
        >
          <div className="v1-0-sidebar__plate" aria-hidden="true" />
          <div className="v1-0-sidebar__head">
            <Link
              to="/"
              className="v1-0-sidebar__logo"
              aria-label="Ir para o início"
              onClick={() => closeDrawerForNav()}
            >
              <img
                data-logo="1"
                src={`${import.meta.env.BASE_URL}crias-logo-dark-green.svg`}
                alt="Crias"
                height={20}
              />
            </Link>
            <button
              type="button"
              className="v1-0-iconbtn"
              aria-label="Fechar menu"
              onClick={() => closeDrawer(true)}
            >
              {closeIcon}
            </button>
          </div>
          <nav className="v1-0-sidebar__nav" aria-label="Menu do aluno">
            <p className="v1-0-group">
              <span className="v1-0-group__text">Acompanhamento</span>
              <span className="v1-0-group__line" />
            </p>
            <Link
              to="/painel"
              className={`v1-0-navitem${location.pathname === '/painel' ? ' is-active' : ''}`}
              aria-current={location.pathname === '/painel' ? 'page' : undefined}
              onClick={() => closeDrawerForNav()}
            >
              <span className="v1-0-navitem__copy">
                <span className="v1-0-navitem__name">Painel</span>
                <span className="v1-0-navitem__meta">Ver seus dados de estudo</span>
              </span>
            </Link>
            <Link
              to="/monitoria"
              className={`v1-0-navitem${onMonitoria ? ' is-active' : ''}`}
              aria-current={onMonitoria ? 'page' : undefined}
              onClick={() => closeDrawerForNav()}
            >
              <span className="v1-0-navitem__copy">
                <span className="v1-0-navitem__name">Monitoria</span>
                <span className="v1-0-navitem__meta">Conversar com seu monitor</span>
              </span>
            </Link>

            <p className="v1-0-group v1-0-group--next">
              <span className="v1-0-group__text">Trilhas</span>
              <span className="v1-0-group__line" />
            </p>
            {trailsLoading && rows === null ? (
              <div className="v1-0-skel-list" role="status" aria-busy="true" aria-live="polite">
                <div className="v1-0-skel-row" />
                <div className="v1-0-skel-row" />
              </div>
            ) : trailsError ? (
              <div role="alert">
                <p className="v1-0-menu-status v1-0-menu-status--err">
                  Não foi possível carregar suas trilhas
                </p>
                <button
                  type="button"
                  className="v1-0-menu-retry"
                  onClick={() => void reloadTrails()}
                >
                  Tentar de novo
                </button>
              </div>
            ) : rows && rows.length === 0 ? (
              <p className="v1-0-menu-status v1-0-menu-status--empty">
                Nenhuma trilha liberada
              </p>
            ) : rows ? (
              <ul className="v1-0-trails">
                {rows.map((row) => {
                  const href = `/trilha/${encodeURIComponent(row.trail_id)}`
                  const active = location.pathname === href
                  const info = rowInfo(row)
                  const isOpen = Boolean(expanded[row.trail_id])
                  const titles = activities[row.trail_id] ?? []
                  const total = Math.max(info.totalActivities ?? 0, titles.length)
                  const acts = Array.from({ length: total }, (_, i) => {
                    const n = i + 1
                    const found = titles.find((t) => t.number === n)
                    return { n, title: found?.title || `Atividade ${n}` }
                  })
                  const viewingNow = active && info.questionNumber
                  return (
                    <li
                      key={row.id}
                      className={`v1-0-trailrow${active ? ' is-active' : ''}`}
                    >
                      <div className="v1-0-trailrow__top">
                        <Link
                          to={href}
                          className="v1-0-trailrow__open"
                          aria-current={active ? 'page' : undefined}
                          title={info.label}
                          aria-label={`${info.label}. ${STATUS_LABEL[info.rowStatus]}. ${info.meta}`}
                          onClick={() => {
                            writeFocusedTrailId(row.trail_id)
                            setExpanded((prev) => ({ ...prev, [row.trail_id]: true }))
                            closeDrawerForNav()
                          }}
                        >
                          <span className="v1-0-trailrow__text">
                            <span className="v1-0-trailrow__name" data-fade="1">
                              {info.label}
                            </span>
                            <span className="v1-0-bar">
                              <span
                                className="v1-0-bar__fill"
                                style={{ width: `${info.pct ?? 0}%` }}
                              />
                            </span>
                            <span className="v1-0-trailrow__meta" data-fade="1">
                              {info.meta}
                            </span>
                          </span>
                        </Link>
                        <button
                          type="button"
                          className="v1-0-trailrow__toggle"
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? 'Recolher' : 'Abrir'} atividades de ${info.label}`}
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              [row.trail_id]: !prev[row.trail_id],
                            }))
                          }
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00be85" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d={isOpen ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
                          </svg>
                        </button>
                      </div>
                      {isOpen && acts.length > 0 ? (
                        <ul className="v1-0-acts">
                          {acts.map((a) => {
                            const st =
                              info.rowCompleted || a.n < info.questionNumber
                                ? 'done'
                                : a.n === info.questionNumber
                                  ? 'cur'
                                  : 'future'
                            return (
                              <li key={a.n}>
                                <button
                                  type="button"
                                  className={`v1-0-act${viewingNow === a.n ? ' is-viewing' : ''}`}
                                  disabled={st === 'future'}
                                  onClick={() => {
                                    writeFocusedTrailId(row.trail_id)
                                    closeDrawerForNav()
                                    navigate(
                                      st === 'cur' || info.rowCompleted && a.n === info.questionNumber
                                        ? href
                                        : `${href}?atividade=${a.n}`,
                                    )
                                  }}
                                >
                                  <span className={`v1-0-act__dot is-${st}`}>
                                    {st === 'done' ? '✓' : String(a.n)}
                                  </span>
                                  <span className="v1-0-act__title" data-fade="1">
                                    {a.title}
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </nav>

          <div className="v1-0-sidebar__foot">
            {hasGestaoAccess() ? (
              <div className="v1-1-switch" role="group" aria-label="Alternar entre aluno e gestão">
                <button type="button" className="is-on" aria-pressed="true">
                  Aluno
                </button>
                <a href="/" aria-pressed="false">
                  Gestão
                </a>
              </div>
            ) : null}
            <div className="v1-0-sidebar__user">
              <button
                type="button"
                className="v1-0-profile"
                aria-label={`Abrir perfil de ${firstName}`}
              >
                <span className="v1-0-avatar" aria-hidden>
                  {(firstName || 'A').charAt(0).toUpperCase()}
                </span>
                <span className="v1-0-profile__name">{firstName}</span>
                <svg className="v1-0-profile__chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                className="v1-0-iconbtn"
                aria-label={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
                title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
                onClick={alternarTema}
              >
                {tema === 'escuro' ? (
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                  </svg>
                ) : (
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="v1-0-iconbtn"
                aria-label="Salvar e sair"
                title="Salvar e sair"
                onClick={() => setLogoutOpen(true)}
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3M14 8l4 4-4 4M18 12H9.5" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      <div className="v1-0-main">
        <Horizon mode={onHome ? 'home' : 'chat'} />
        <EdgeFade />
        {offline ? (
          <div className="v1-0-offline" role="status" aria-live="polite">
            Sem conexão. Reconecte para continuar.
          </div>
        ) : null}
        <header className="v1-0-topbar">
          {!sidebarOpen ? (
            <button
              ref={menuBtnRef}
              type="button"
              className="v1-0-iconbtn"
              aria-label="Abrir menu"
              aria-expanded={false}
              aria-controls="crias-sidebar"
              aria-haspopup="dialog"
              onClick={() => setSidebarOpen(true)}
            >
              {openIcon}
            </button>
          ) : null}
          <div className="v1-0-topbar__titles">
            {topTitle ? (
              <span className="v1-0-topbar__title" data-fade="1" title={topTitle}>
                {topTitle}
              </span>
            ) : null}
            {topStage ? (
              <span className="v1-0-topbar__stage">
                {onMonitoria || dotIndex < 0 ? (
                  <span className="v1-0-dot v1-0-dot--single" aria-hidden="true" />
                ) : (
                  <span className="v1-0-topbar__dots" aria-hidden="true">
                    {Array.from({ length: totalStepsTop }, (_, i) => {
                      const done = i < dotIndex || (i === dotIndex && dotsDone)
                      const now = i === dotIndex && !dotsDone
                      return (
                        <span
                          key={i}
                          className={`v1-0-dot${done ? ' is-done' : ''}${now ? ' is-now' : ''}`}
                        />
                      )
                    })}
                  </span>
                )}
                <span className="v1-0-topbar__stagetext" data-fade="1">
                  {topStage}
                </span>
              </span>
            ) : null}
          </div>
        </header>
        <div className="v1-0-content" inert={mainInert || undefined}>
          <Outlet
            context={{
              trailRows: rows,
              trailsError,
              trailsLoading,
              retryTrails: () => void reloadTrails(),
              activeTrailRow: activeRow,
              trailNames,
              stageTotals,
              questionTotals,
              activities,
              viewActivity,
            }}
          />
        </div>
      </div>

      {logoutOpen ? (
        <LogoutDialog
          onCancel={() => setLogoutOpen(false)}
          onConfirm={confirmLogout}
        />
      ) : null}
    </div>
  )
}
