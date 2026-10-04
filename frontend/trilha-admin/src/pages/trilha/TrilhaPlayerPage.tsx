import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StudentShellView } from '../../design/layouts/StudentShellView'
import { TrilhaPlayerPageView } from '../../design/views/TrilhaPlayerPageView'
import type { StudentChatBubble } from '../../design/components/trilha/StudentConversationChat'
import {
  resolveAiDeliveryForTrigger,
  shouldEnsureAiOnTrigger,
} from '../../lib/trilha/aiDeliveryGate'
import {
  advanceWithConflictHandling,
  ensureStepDelivery,
  ensureTrailAi,
  fetchNextContent,
  fetchTrailConversation,
  fetchTrilhaHome,
  submitExercise,
  TrilhaApiError,
  type TrilhaConversationMessage,
  type TrilhaNextContent,
} from '../../lib/trilha/trilhaApi'
import { resolveExerciseOptions } from '../../lib/trilha/exerciseOptions'
import {
  clearTrilhaSession,
  loadTrilhaSession,
  newIdempotencyKey,
} from '../../lib/trilha/trilhaSession'

function mapStageType(
  t: TrilhaNextContent['stage_type'],
): 'fixed' | 'exercise' | 'ai' {
  if (t === 'exercise' || t === 'ai' || t === 'fixed') return t
  return 'fixed'
}

function normalizeNextAction(
  content: TrilhaNextContent,
): TrilhaNextContent['next_action'] {
  if (content.is_released === false && content.next_action !== 'completed') {
    return 'await_release'
  }
  return content.next_action
}

function mapChatMessages(
  rows: TrilhaConversationMessage[],
): StudentChatBubble[] {
  return rows
    .filter((m) => Boolean(m.message_text?.trim()))
    .map((m) => ({
      id: m.id,
      sender: m.sender,
      message_text: m.message_text,
      stage_number: m.stage_number,
      question_number: m.question_number,
      created_at: m.created_at,
      created_at_brasilia: m.created_at_brasilia,
    }))
}

/** POST ensure-ai — só via trigger `continue` (CTA no player). */
async function ensureIfContinue(
  next: TrilhaNextContent,
  studentId: string,
  trailId: string,
  token: string,
): Promise<TrilhaNextContent> {
  return resolveAiDeliveryForTrigger(next, 'continue', () =>
    ensureTrailAi(studentId, trailId, token),
  )
}

/** Persiste delivery fixed/exercise no Continuar (não no resume). */
async function persistDeliveryOnContinue(
  next: TrilhaNextContent,
  studentId: string,
  trailId: string,
  token: string,
): Promise<void> {
  if (next.stage_type === 'ai') return
  if (next.next_action !== 'deliver_content' && next.next_action !== 'await_answer') {
    return
  }
  await ensureStepDelivery(studentId, trailId, token)
}

export function TrilhaPlayerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preferredTrailId = searchParams.get('trail_id')?.trim() || null
  const session = loadTrilhaSession()!

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [answerValue, setAnswerValue] = useState('')
  const [trailId, setTrailId] = useState<string | null>(null)
  const [institutionId, setInstitutionId] = useState(
    session.student.institution_id,
  )
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null)
  const [totalStages, setTotalStages] = useState<number | null>(null)
  const [content, setContent] = useState<TrilhaNextContent | null>(null)
  const [chatMessages, setChatMessages] = useState<StudentChatBubble[]>([])
  const [feedbackState, setFeedbackState] = useState<'correct' | 'incorrect' | 'recorded' | null>(
    null,
  )
  const [victoryMessage, setVictoryMessage] = useState<string | null>(null)
  const [pendingNext, setPendingNext] = useState<TrilhaNextContent | null>(null)

  const refreshConversation = useCallback(
    async (tid: string) => {
      const conversation = await fetchTrailConversation(
        session.student.student_id,
        tid,
        session.token,
      )
      setChatMessages(mapChatMessages(conversation.messages))
    },
    [session.student.student_id, session.token],
  )

  const applyContent = useCallback((next: TrilhaNextContent) => {
    setContent({ ...next, next_action: normalizeNextAction(next) })
    setAnswerValue('')
    setFeedbackState(null)
    setPendingNext(null)
    setLoadState('ready')
  }, [])

  /** Resume / open / retry: só GET — nunca ensure-ai (P0 + A2). */
  const load = useCallback(async () => {
    setLoadState('loading')
    setErrorMessage(undefined)
    try {
      const home = await fetchTrilhaHome(session.token)
      const cards = Array.isArray(home.enrollments) ? home.enrollments : []
      const preferred = preferredTrailId
        ? cards.find((c) => c.enrollment.trail_id === preferredTrailId)
        : undefined
      const active = preferred ?? cards[0] ?? null
      const enrollment = active?.enrollment ?? home.enrollment
      if (!enrollment?.trail_id) {
        setErrorMessage('Ainda não há trilha para si.')
        setLoadState('error')
        return
      }
      const tid = enrollment.trail_id
      setTrailId(tid)
      setInstitutionId(
        enrollment.institution_id || session.student.institution_id,
      )
      const totalQ = active?.total_questions ?? home.total_questions
      const totalS = active?.total_stages ?? home.total_stages
      setTotalQuestions(
        typeof totalQ === 'number' && Number.isFinite(totalQ) ? totalQ : null,
      )
      setTotalStages(
        typeof totalS === 'number' && Number.isFinite(totalS) ? totalS : null,
      )
      const [next] = await Promise.all([
        fetchNextContent(session.student.student_id, tid, session.token),
        refreshConversation(tid),
      ])
      applyContent(next)
    } catch (e) {
      if (e instanceof TrilhaApiError && (e.status === 401 || e.status === 403)) {
        clearTrilhaSession()
        navigate('/trilha/login', {
          replace: true,
          state: { returnUrl: '/trilha/play' },
        })
        return
      }
      setErrorMessage(
        e instanceof Error ? e.message : 'Erro ao carregar o passo.',
      )
      setLoadState('error')
    }
  }, [
    applyContent,
    navigate,
    preferredTrailId,
    refreshConversation,
    session.student.institution_id,
    session.student.student_id,
    session.token,
  ])

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

  async function handleContinue() {
    if (!content || !trailId || submitting) return
    if (content.next_action !== 'deliver_content') return

    setSubmitting(true)
    setErrorMessage(undefined)
    setConflictMessage(null)

    try {
      // P0: ensure-ai só no Continuar — se a célula atual é ai pending, gera antes de avançar.
      let working = content
      if (shouldEnsureAiOnTrigger(working, 'continue')) {
        working = await ensureIfContinue(
          working,
          session.student.student_id,
          trailId,
          session.token,
        )
        applyContent(working)
      } else {
        await persistDeliveryOnContinue(
          working,
          session.student.student_id,
          trailId,
          session.token,
        )
      }
      await refreshConversation(trailId)

      const key = newIdempotencyKey(
        session.student.student_id,
        trailId,
        working.stage_number,
        working.question_number,
      )

      const outcome = await advanceWithConflictHandling({
        studentId: session.student.student_id,
        trailId,
        idempotencyKey: key,
        expectedVersion: working.progress_version,
        reason: 'delivered',
        token: session.token,
      })

      if (outcome.kind === 'conflict') {
        setConflictMessage(
          'Atualizámos o passo (também avançou no WhatsApp). Aqui está onde ficou.',
        )
        const next = await outcome.resync()
        const resolved = await ensureIfContinue(
          next,
          session.student.student_id,
          trailId,
          session.token,
        )
        if (!shouldEnsureAiOnTrigger(next, 'continue')) {
          await persistDeliveryOnContinue(
            resolved,
            session.student.student_id,
            trailId,
            session.token,
          )
        }
        await refreshConversation(trailId)
        applyContent(resolved)
        return
      }

      const next = await fetchNextContent(
        session.student.student_id,
        trailId,
        session.token,
      )
      // Pós-advance no Continuar: se o próximo é ai pending, gera agora (não no open).
      const resolved = await ensureIfContinue(
        next,
        session.student.student_id,
        trailId,
        session.token,
      )
      if (!shouldEnsureAiOnTrigger(next, 'continue')) {
        await persistDeliveryOnContinue(
          resolved,
          session.student.student_id,
          trailId,
          session.token,
        )
      }
      await refreshConversation(trailId)
      setVictoryMessage(
        `Etapa ${working.stage_number} · Q${working.question_number} concluída`,
      )
      window.setTimeout(() => {
        setVictoryMessage(null)
        applyContent(resolved)
      }, 180)
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : 'Falha ao avançar.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitAnswer() {
    if (!content || !trailId || submitting) return
    if (content.next_action !== 'await_answer') return
    const answer = answerValue.trim()
    if (!answer) return

    setSubmitting(true)
    setErrorMessage(undefined)
    setConflictMessage(null)
    const key = newIdempotencyKey(
      session.student.student_id,
      trailId,
      content.stage_number,
      content.question_number,
    )

    try {
      let submitResult: { status: string; is_correct?: boolean }
      try {
        submitResult = await submitExercise({
          studentId: session.student.student_id,
          trailId,
          institutionId,
          stageNumber: content.stage_number,
          questionNumber: content.question_number,
          answer,
          idempotencyKey: key,
          expectedVersion: content.progress_version,
          token: session.token,
        })
      } catch (e) {
        if (e instanceof TrilhaApiError && e.isConflict) {
          setConflictMessage(
            'Atualizámos o passo (também avançou no WhatsApp). Aqui está onde ficou.',
          )
          const next = await fetchNextContent(
            session.student.student_id,
            trailId,
            session.token,
          )
          await refreshConversation(trailId)
          applyContent(next)
          return
        }
        if (
          e instanceof TrilhaApiError &&
          (e.status === 404 || e.status === 501 || e.status === 405)
        ) {
          setErrorMessage(
            'Não conseguimos corrigir agora. Tente de novo — nada foi perdido.',
          )
          return
        }
        throw e
      }

      await refreshConversation(trailId)
      const next = await fetchNextContent(
        session.student.student_id,
        trailId,
        session.token,
      )
      setPendingNext(next)
      if (submitResult.is_correct === true) {
        setFeedbackState('correct')
      } else if (submitResult.is_correct === false) {
        setFeedbackState('incorrect')
      } else {
        setFeedbackState('recorded')
      }
    } catch (e) {
      setErrorMessage(
        e instanceof Error
          ? e.message
          : 'Não conseguimos corrigir agora. Tente de novo — nada foi perdido.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleContinueAfterFeedback() {
    if (pendingNext && trailId) {
      setVictoryMessage(
        feedbackState === 'correct'
          ? `Etapa ${content?.stage_number ?? ''} · Q${content?.question_number ?? ''} concluída`
          : null,
      )
      const resolved = await ensureIfContinue(
        pendingNext,
        session.student.student_id,
        trailId,
        session.token,
      )
      if (!shouldEnsureAiOnTrigger(pendingNext, 'continue')) {
        await persistDeliveryOnContinue(
          resolved,
          session.student.student_id,
          trailId,
          session.token,
        )
      }
      await refreshConversation(trailId)
      window.setTimeout(() => {
        setVictoryMessage(null)
        applyContent(resolved)
      }, feedbackState === 'correct' ? 160 : 0)
      return
    }
    void load()
  }

  const stageType = mapStageType(content?.stage_type ?? 'fixed')
  const rawBody =
    stageType === 'ai'
      ? content?.content?.trim() ||
        (content?.ai_status === 'pending'
          ? 'Ainda não gerado — toque Continuar para preparar a aula com a IA.'
          : 'Conteúdo da aula ainda não disponível.')
      : content?.content?.trim() ||
        content?.prompt?.trim() ||
        'Conteúdo indisponível neste passo.'
  const resolved =
    content?.next_action === 'await_answer'
      ? resolveExerciseOptions(content?.content ?? content?.prompt, content?.options)
      : { options: null, displayBody: rawBody }
  const body =
    content?.next_action === 'await_answer'
      ? resolved.displayBody || rawBody
      : rawBody

  return (
    <StudentShellView
      studentName={session.student.name || null}
      onLogout={logout}
    >
      <TrilhaPlayerPageView
        stageNumber={content?.stage_number ?? 1}
        questionNumber={content?.question_number ?? 1}
        totalQuestions={totalQuestions}
        totalStages={totalStages}
        stageType={stageType}
        title={content?.title ?? undefined}
        body={body}
        options={resolved.options}
        nextAction={content?.next_action ?? 'deliver_content'}
        submitting={submitting}
        answerValue={answerValue}
        loadState={loadState}
        errorMessage={errorMessage}
        conflictMessage={conflictMessage}
        feedbackState={feedbackState}
        victoryMessage={victoryMessage}
        chatMessages={chatMessages}
        onAnswerChange={setAnswerValue}
        onContinue={() => void handleContinue()}
        onSubmitAnswer={() => void handleSubmitAnswer()}
        onContinueAfterFeedback={() => void handleContinueAfterFeedback()}
        onBack={() => navigate('/trilha')}
        onRetry={() => void load()}
        onOpenHistory={() => navigate('/trilha/historico')}
      />
    </StudentShellView>
  )
}
