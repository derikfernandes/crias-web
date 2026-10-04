import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StudentShellView } from '../../design/layouts/StudentShellView'
import { TrilhaHistoryPageView } from '../../design/views/TrilhaHistoryPageView'
import {
  fetchTrailHistory,
  fetchTrilhaHome,
  TrilhaApiError,
  type TrilhaHistoryItem,
} from '../../lib/trilha/trilhaApi'
import {
  clearTrilhaSession,
  loadTrilhaSession,
} from '../../lib/trilha/trilhaSession'

function mapItem(item: TrilhaHistoryItem) {
  const body =
    item.content?.trim() ||
    item.prompt?.trim() ||
    ''
  return {
    stageNumber: item.stage_number,
    questionNumber: item.question_number,
    stageType: item.stage_type,
    title: item.title,
    body,
    studentAnswer: item.student_answer,
    isCorrect: item.is_correct,
  }
}

export function TrilhaHistoryPage() {
  const navigate = useNavigate()
  const session = loadTrilhaSession()!

  const [loadState, setLoadState] = useState<
    'loading' | 'ready' | 'empty' | 'error'
  >('loading')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [items, setItems] = useState<ReturnType<typeof mapItem>[]>([])

  const load = useCallback(async () => {
    setLoadState('loading')
    setErrorMessage(undefined)
    try {
      const home = await fetchTrilhaHome(session.token)
      if (!home.enrollment?.trail_id) {
        setItems([])
        setLoadState('empty')
        return
      }
      const history = await fetchTrailHistory(
        session.student.student_id,
        home.enrollment.trail_id,
        session.token,
      )
      const mapped = history.items.map(mapItem)
      setItems(mapped)
      setLoadState(mapped.length === 0 ? 'empty' : 'ready')
    } catch (e) {
      if (e instanceof TrilhaApiError && (e.status === 401 || e.status === 403)) {
        clearTrilhaSession()
        navigate('/trilha/login', {
          replace: true,
          state: { returnUrl: '/trilha/historico' },
        })
        return
      }
      setErrorMessage(
        e instanceof Error ? e.message : 'Erro ao carregar o histórico.',
      )
      setLoadState('error')
    }
  }, [navigate, session.student.student_id, session.token])

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

  return (
    <StudentShellView
      studentName={session.student.name || null}
      onLogout={logout}
    >
      <TrilhaHistoryPageView
        onContinueCurrent={() => navigate('/trilha/play')}
        items={items}
        loadState={loadState}
        errorMessage={errorMessage}
        onBack={() => navigate('/trilha')}
        onRetry={() => void load()}
      />
    </StudentShellView>
  )
}
