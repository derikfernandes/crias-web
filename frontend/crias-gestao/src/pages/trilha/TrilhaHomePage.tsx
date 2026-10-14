import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StudentShellView } from '../../design/layouts/StudentShellView'
import {
  TrilhaHomePageView,
  type TrilhaHomeTrailCard,
} from '../../design/views/TrilhaHomePageView'
import { type HomeNextAction } from '../../lib/trilha/homeCta'
import {
  fetchTrilhaHome,
  TrilhaApiError,
  type TrilhaHomeEnrollmentCard,
} from '../../lib/trilha/trilhaApi'
import {
  clearTrilhaSession,
  loadTrilhaSession,
} from '../../lib/trilha/trilhaSession'

const WA_HELP =
  'https://wa.me/5512974085258?text=' +
  encodeURIComponent('Olá! Preciso de ajuda com a Trilha Crias.')

function parseStatus(
  raw: string | undefined,
): TrilhaHomeTrailCard['status'] {
  if (
    raw === 'in_progress' ||
    raw === 'completed' ||
    raw === 'blocked' ||
    raw === 'not_started'
  ) {
    return raw
  }
  return 'in_progress'
}

function parseNextAction(raw: unknown): HomeNextAction | null {
  if (
    raw === 'deliver_content' ||
    raw === 'await_answer' ||
    raw === 'await_release' ||
    raw === 'blocked' ||
    raw === 'completed'
  ) {
    return raw
  }
  return null
}

function mapEnrollmentCard(row: TrilhaHomeEnrollmentCard): TrilhaHomeTrailCard {
  const status = parseStatus(row.enrollment.progress_status)
  const nextAction = parseNextAction(row.next_action)
  const stagesCompleted =
    typeof row.stages_completed === 'number' &&
    Number.isFinite(row.stages_completed)
      ? Math.max(0, Math.floor(row.stages_completed))
      : status === 'completed' || nextAction === 'completed'
        ? typeof row.total_stages === 'number'
          ? row.total_stages
          : Math.max(0, row.enrollment.current_stage_number)
        : Math.max(0, row.enrollment.current_stage_number - 1)

  return {
    trailId: row.enrollment.trail_id,
    title: row.trail?.title ?? row.enrollment.trail_id,
    institutionName: row.trail?.institution_name ?? null,
    subject: row.trail?.subject ?? null,
    status,
    nextAction,
    stageNumber: row.enrollment.current_stage_number,
    questionNumber: row.enrollment.current_question_number,
    progressRatio:
      typeof row.progress_ratio === 'number' && Number.isFinite(row.progress_ratio)
        ? row.progress_ratio
        : null,
    totalStages:
      typeof row.total_stages === 'number' && Number.isFinite(row.total_stages)
        ? row.total_stages
        : null,
    totalQuestions:
      typeof row.total_questions === 'number' &&
      Number.isFinite(row.total_questions)
        ? row.total_questions
        : null,
    stagesCompleted,
    lastActivityAt: row.enrollment.last_interaction_at ?? null,
  }
}

/** Compat: resposta antiga sem `enrollments[]` → um card a partir do enrollment. */
function cardsFromHome(
  home: Awaited<ReturnType<typeof fetchTrilhaHome>>,
): TrilhaHomeTrailCard[] {
  if (Array.isArray(home.enrollments) && home.enrollments.length > 0) {
    return home.enrollments.map(mapEnrollmentCard)
  }
  if (!home.enrollment || !home.trail) return []
  return [
    mapEnrollmentCard({
      enrollment: home.enrollment,
      trail: home.trail,
      next_action: home.next_action,
      is_released: home.is_released,
      stage_type: home.stage_type,
      progress_ratio: home.progress_ratio,
      total_stages: home.total_stages,
      total_questions: home.total_questions,
    }),
  ]
}

export function TrilhaHomePage() {
  const navigate = useNavigate()
  const session = loadTrilhaSession()!

  const [loadState, setLoadState] = useState<
    'loading' | 'ready' | 'empty' | 'error'
  >('loading')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [trails, setTrails] = useState<TrilhaHomeTrailCard[]>([])

  const load = useCallback(async () => {
    setLoadState('loading')
    setErrorMessage(undefined)
    try {
      const home = await fetchTrilhaHome(session.token)
      const cards = cardsFromHome(home)
      if (cards.length === 0) {
        setTrails([])
        setLoadState('empty')
        return
      }
      setTrails(cards)
      setLoadState('ready')
    } catch (e) {
      if (e instanceof TrilhaApiError && (e.status === 401 || e.status === 403)) {
        clearTrilhaSession()
        navigate('/trilha/login', { replace: true })
        return
      }
      setErrorMessage(
        e instanceof Error ? e.message : 'Erro ao carregar a home.',
      )
      setLoadState('error')
    }
  }, [navigate, session.token])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  function logout() {
    clearTrilhaSession()
    navigate('/trilha/login', { replace: true })
  }

  const totals = useMemo(() => {
    let inProgress = 0
    let completed = 0
    let stagesCompleted = 0
    for (const t of trails) {
      if (t.status === 'completed' || t.nextAction === 'completed') {
        completed += 1
      } else if (t.status === 'in_progress') {
        inProgress += 1
      }
      stagesCompleted += t.stagesCompleted
    }
    return {
      trails: trails.length,
      inProgress,
      completed,
      stagesCompleted,
    }
  }, [trails])

  return (
    <StudentShellView
      studentName={session.student.name || null}
      onLogout={logout}
    >
      <TrilhaHomePageView
        studentName={session.student.name || 'aluno'}
        trails={trails}
        totals={totals}
        whatsappHelpHref={WA_HELP}
        loadState={loadState}
        errorMessage={errorMessage}
        onContinue={(trailId) =>
          navigate(`/trilha/play?trail_id=${encodeURIComponent(trailId)}`)
        }
        onOpenHistory={(trailId) => {
          if (trailId) {
            navigate(
              `/trilha/historico?trail_id=${encodeURIComponent(trailId)}`,
            )
          } else {
            navigate('/trilha/historico')
          }
        }}
        onRetry={() => void load()}
      />
    </StudentShellView>
  )
}
