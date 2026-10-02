import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { STUDENTS_COLLECTION, snapshotToStudent } from '../lib/studentFirestore'
import {
  STUDENT_TRAILS_COLLECTION,
  snapshotToStudentTrail,
  studentTrailDocId,
} from '../lib/studentTrailFirestore'
import { TRAILS_COLLECTION, snapshotToTrail } from '../lib/trailFirestore'
import { trailPath } from '../lib/paths'
import {
  CONVERSATION_LOGS_COLLECTION,
  snapshotToConversationLog,
} from '../lib/conversationLogFirestore'
import { agentLabelForTrailId } from '../lib/agentUsage'
import { situationFromProgress } from '../lib/studentSituation'
import { StudentForm } from '../components/StudentForm'
import {
  ConversationChat,
  LOGS_PAGE_SIZE,
} from '../components/ConversationChat'
import { StudentDetailPageView } from '../design/views/StudentDetailPageView'
import type { StudentDetailTrailRow } from '../design/types/studentDetailPageView'
import type { Student } from '../types/student'
import type { StudentTrail, StudentTrailStatus } from '../types/studentTrail'
import type { ConversationLog } from '../types/conversationLog'
import type { Trail } from '../types/trail'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const agentTrailFilter = (searchParams.get('agent_trail_id') ?? '').trim()
  const agentTrailFilters = useMemo(() => {
    const raw = (searchParams.get('agent_trail_ids') ?? '').trim()
    const fromList = raw
      ? raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
    if (fromList.length > 0) return [...new Set(fromList)]
    return agentTrailFilter ? [agentTrailFilter] : []
  }, [searchParams, agentTrailFilter])
  const agentTrailFiltersKey = agentTrailFilters.join('\0')
  const [stu, setStu] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [trails, setTrails] = useState<StudentTrail[]>([])
  const [loadingTrails, setLoadingTrails] = useState(true)
  const [trailsError, setTrailsError] = useState<string | null>(null)

  const [logs, setLogs] = useState<ConversationLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [logsVisibleCount, setLogsVisibleCount] = useState(LOGS_PAGE_SIZE)

  const [institutionTrails, setInstitutionTrails] = useState<Trail[]>([])
  const [loadingInstitutionTrails, setLoadingInstitutionTrails] = useState(false)
  const [institutionTrailsError, setInstitutionTrailsError] = useState<
    string | null
  >(null)

  const [linkTrailId, setLinkTrailId] = useState('')
  const [linkStatus, setLinkStatus] = useState<StudentTrailStatus>('not_started')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [editingTrailId, setEditingTrailId] = useState<string | null>(null)
  const [editStage, setEditStage] = useState('')
  const [editQuestion, setEditQuestion] = useState('')
  const [editStatus, setEditStatus] = useState<StudentTrailStatus>('not_started')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deactivateBusy, setDeactivateBusy] = useState(false)

  useEffect(() => {
    if (!db || !id) return
    const unsub = onSnapshot(
      doc(db, STUDENTS_COLLECTION, id),
      (snap) => {
        if (!snap.exists()) {
          setStu(null)
          setError(null)
          setLoading(false)
          return
        }

        setStu(snapshotToStudent(snap))
        setError(null)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return () => unsub()
  }, [id])

  useEffect(() => {
    if (!db || !id) return
    const dbOk = db
    let unsub: (() => void) | null = null

    async function run() {
      setLoadingLogs(true)
      setLogsError(null)

      const q =
        agentTrailFilters.length > 1
          ? query(
              collection(dbOk, CONVERSATION_LOGS_COLLECTION),
              where('student_id', '==', id),
              where('trail_id', 'in', agentTrailFilters.slice(0, 30)),
            )
          : agentTrailFilters.length === 1
            ? query(
                collection(dbOk, CONVERSATION_LOGS_COLLECTION),
                where('student_id', '==', id),
                where('trail_id', '==', agentTrailFilters[0]),
              )
            : query(
                collection(dbOk, CONVERSATION_LOGS_COLLECTION),
                where('student_id', '==', id),
              )

      unsub = onSnapshot(
        q,
        (snap) => {
          const next = snap.docs.map(snapshotToConversationLog)
          next.sort((a, b) => {
            const ma = a.created_at?.toMillis?.() ?? 0
            const mb = b.created_at?.toMillis?.() ?? 0
            return mb - ma
          })
          setLogs(next)
          setLogsError(null)
          setLoadingLogs(false)
        },
        (err) => {
          setLogsError(err.message)
          setLoadingLogs(false)
        },
      )
    }

    void run()
    return () => unsub?.()
  }, [id, agentTrailFilters, agentTrailFiltersKey])

  useEffect(() => {
    setLogsVisibleCount(LOGS_PAGE_SIZE)
  }, [id, agentTrailFiltersKey])

  useEffect(() => {
    if (!db || !id) return
    const dbOk = db
    let unsub: (() => void) | null = null

    async function run() {
      setLoadingTrails(true)
      setTrailsError(null)

      const q = query(
        collection(dbOk, STUDENT_TRAILS_COLLECTION),
        where('student_id', '==', id),
      )

      unsub = onSnapshot(
        q,
        (snap) => {
          const next = snap.docs.map(snapshotToStudentTrail)
          setTrails(next)
          setTrailsError(null)
          setLoadingTrails(false)
        },
        (err) => {
          setTrailsError(err.message)
          setLoadingTrails(false)
        },
      )
    }

    void run()
    return () => unsub?.()
  }, [id])

  useEffect(() => {
    if (!db || !stu?.institution_id) {
      setInstitutionTrails([])
      setLoadingInstitutionTrails(false)
      setInstitutionTrailsError(null)
      return
    }
    const dbOk = db
    const instId = stu.institution_id
    let unsub: (() => void) | null = null

    setLoadingInstitutionTrails(true)
    setInstitutionTrailsError(null)

    const q = query(
      collection(dbOk, TRAILS_COLLECTION),
      where('institution_id', '==', instId),
    )

    unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map(snapshotToTrail)
        next.sort((a, b) => {
          const an = (a.name || a.id).toLowerCase()
          const bn = (b.name || b.id).toLowerCase()
          return an.localeCompare(bn, 'pt-BR')
        })
        setInstitutionTrails(next)
        setInstitutionTrailsError(null)
        setLoadingInstitutionTrails(false)
      },
      (err) => {
        setInstitutionTrailsError(err.message)
        setLoadingInstitutionTrails(false)
      },
    )

    return () => unsub?.()
  }, [stu?.institution_id])

  const sortedTrails = useMemo(() => {
    return [...trails].sort((a, b) => {
      const ma = a.updated_at?.toMillis?.() ?? a.created_at?.toMillis?.() ?? 0
      const mb = b.updated_at?.toMillis?.() ?? b.created_at?.toMillis?.() ?? 0
      return mb - ma
    })
  }, [trails])

  const trailById = useMemo(() => {
    const m = new Map<string, Trail>()
    for (const t of institutionTrails) m.set(t.id, t)
    return m
  }, [institutionTrails])

  const linkedTrailIdSet = useMemo(() => {
    return new Set(trails.map((t) => t.trail_id).filter(Boolean))
  }, [trails])

  const linkableTrails = useMemo(() => {
    return institutionTrails.filter((t) => !linkedTrailIdSet.has(t.id))
  }, [institutionTrails, linkedTrailIdSet])

  async function handleLinkTrail(e: FormEvent) {
    e.preventDefault()
    if (!db || !id || !stu?.institution_id) return
    const firestore = db
    const trailId = linkTrailId.trim()
    if (!trailId) {
      setLinkError('Selecione uma trilha.')
      return
    }

    setLinkBusy(true)
    setLinkError(null)
    try {
      await runTransaction(firestore, async (tx) => {
        const ref = doc(
          firestore,
          STUDENT_TRAILS_COLLECTION,
          studentTrailDocId(id, trailId),
        )
        const snap = await tx.get(ref)
        if (snap.exists()) {
          throw new Error(
            'Este aluno já está vinculado a esta trilha (registro já existe).',
          )
        }
        const now = serverTimestamp()
        const base: Record<string, unknown> = {
          student_id: id,
          institution_id: stu.institution_id,
          trail_id: trailId,
          current_stage_number: 1,
          current_question_number: 1,
          status: linkStatus,
          completed_at: null,
          last_interaction_at: null,
          created_at: now,
          updated_at: now,
        }
        if (linkStatus === 'in_progress') {
          base.started_at = now
        } else {
          base.started_at = null
        }
        tx.set(ref, base)
      })
      setLinkTrailId('')
      setLinkStatus('not_started')
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Erro ao vincular trilha.')
    } finally {
      setLinkBusy(false)
    }
  }

  function handleStartEditTrail(row: StudentTrail) {
    setEditingTrailId(row.id)
    setEditStage(String(row.current_stage_number))
    setEditQuestion(String(row.current_question_number))
    setEditStatus(row.status)
    setEditError(null)
  }

  function handleCancelEditTrail() {
    if (editBusy) return
    setEditingTrailId(null)
    setEditStage('')
    setEditQuestion('')
    setEditStatus('not_started')
    setEditError(null)
  }

  function parsePositiveInteger(value: string, label: string): number {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1) {
      throw new Error(`${label} deve ser um número inteiro maior ou igual a 1.`)
    }
    return n
  }

  function parseStudentTrailStatus(value: string): StudentTrailStatus {
    if (
      value === 'not_started' ||
      value === 'in_progress' ||
      value === 'completed' ||
      value === 'blocked'
    ) {
      return value
    }
    throw new Error(
      'Status inválido. Use not_started, in_progress, completed ou blocked.',
    )
  }

  async function handleSaveTrailPosition(row: StudentTrail) {
    if (!db) return
    setEditBusy(true)
    setEditError(null)
    try {
      const nextStage = parsePositiveInteger(editStage, 'Stage atual')
      const nextQuestion = parsePositiveInteger(editQuestion, 'Questão atual')
      const nextStatus = parseStudentTrailStatus(editStatus)
      const firestore = db
      await runTransaction(firestore, async (tx) => {
        const ref = doc(firestore, STUDENT_TRAILS_COLLECTION, row.id)
        const snap = await tx.get(ref)
        if (!snap.exists()) {
          throw new Error('Registro de trilha do aluno não encontrado.')
        }
        const data = snap.data() ?? {}
        const now = serverTimestamp()
        const patch: Record<string, unknown> = {
          current_stage_number: nextStage,
          current_question_number: nextQuestion,
          status: nextStatus,
          updated_at: now,
          last_interaction_at: now,
        }
        if (
          (nextStatus === 'in_progress' || nextStatus === 'completed') &&
          !data.started_at
        ) {
          patch.started_at = now
        }
        if (nextStatus === 'completed') {
          patch.completed_at = now
        }
        tx.update(ref, patch)
      })
      setEditingTrailId(null)
      setEditStage('')
      setEditQuestion('')
      setEditStatus('not_started')
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Erro ao atualizar progresso da trilha.',
      )
    } finally {
      setEditBusy(false)
    }
  }

  async function handleUnlinkTrail(row: StudentTrail) {
    if (!db || editBusy) return
    const meta = trailById.get(row.trail_id)
    const label = meta?.name?.trim() ? meta.name : row.trail_id
    const ok = window.confirm(
      `Desvincular o aluno da trilha "${label}"?\n\n` +
        'O registro em student_trails será removido. O histórico de conversa permanece.',
    )
    if (!ok) return

    setEditBusy(true)
    setEditError(null)
    try {
      await deleteDoc(doc(db, STUDENT_TRAILS_COLLECTION, row.id))
      if (editingTrailId === row.id) {
        setEditingTrailId(null)
        setEditStage('')
        setEditQuestion('')
        setEditStatus('not_started')
      }
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Erro ao desvincular trilha.',
      )
    } finally {
      setEditBusy(false)
    }
  }

  if (!id) {
    return <StudentDetailPageView status="missing-id" />
  }

  const trailRows: StudentDetailTrailRow[] = sortedTrails.map((row) => {
    const meta = trailById.get(row.trail_id)
    const label = meta?.name?.trim() ? meta.name : row.trail_id
    const lastMs = row.last_interaction_at?.toMillis?.() ?? null
    const completionPct =
      row.status === 'completed'
        ? 100
        : row.status === 'not_started'
          ? 0
          : 50
    const situation = situationFromProgress({
      status: row.status,
      completionPct,
      lastInteractionAtMs: lastMs,
    })
    return {
      id: row.id,
      trailHref: trailPath(row.trail_id),
      trailLabel: label,
      trailIdSecondary: meta?.name?.trim() ? row.trail_id : null,
      inactiveHint: Boolean(meta?.name?.trim() && !meta.active),
      isEditing: editingTrailId === row.id,
      stageDisplay: row.current_stage_number,
      questionDisplay: row.current_question_number,
      status: row.status,
      startedAtLabel: row.started_at?.toDate
        ? row.started_at.toDate().toLocaleString('pt-BR')
        : '—',
      lastInteractionAtLabel: row.last_interaction_at?.toDate
        ? row.last_interaction_at.toDate().toLocaleString('pt-BR')
        : '—',
      situationLabel: situation.label,
      situationTone: situation.tone,
    }
  })

  let latestInteractionLabel: string | null = null
  {
    let best: number | null = null
    for (const row of trails) {
      const ms = row.last_interaction_at?.toMillis?.() ?? null
      if (ms != null && (best == null || ms > best)) best = ms
    }
    if (best != null) {
      latestInteractionLabel = new Date(best).toLocaleString('pt-BR')
    }
  }

  async function handleDeactivate() {
    if (!db || !id || !stu?.active || deactivateBusy) return
    const ok = window.confirm(
      `Desativar o aluno "${stu.name || id}"?\n\nO cadastro permanece, mas deixa de contar como ativo.`,
    )
    if (!ok) return
    setDeactivateBusy(true)
    try {
      await updateDoc(doc(db, STUDENTS_COLLECTION, id), {
        active: false,
        updated_at: serverTimestamp(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar.')
    } finally {
      setDeactivateBusy(false)
    }
  }

  return (
    <StudentDetailPageView
      status="ok"
      error={error}
      loading={loading}
      notFound={!stu}
      formSlot={stu ? <StudentForm docId={id} initial={stu} /> : null}
      hasStudent={Boolean(stu)}
      studentName={stu?.name ?? null}
      schoolGrade={stu?.school_grade || null}
      schoolLevel={stu?.school_level || null}
      studentLevelLabel={
        stu?.student_level != null ? String(stu.student_level) : null
      }
      lastInteractionLabel={latestInteractionLabel}
      activeLabel={stu ? (stu.active ? 'Ativo' : 'Inativo') : null}
      backHref="/alunos"
      onDeactivate={stu?.active ? () => void handleDeactivate() : null}
      deactivateBusy={deactivateBusy}
      loadingTrails={loadingTrails}
      trailsError={trailsError}
      editError={editError}
      trailRows={trailRows}
      editStage={editStage}
      editQuestion={editQuestion}
      editStatus={editStatus}
      editBusy={editBusy}
      onEditStageChange={setEditStage}
      onEditQuestionChange={setEditQuestion}
      onEditStatusChange={(value) => {
        if (
          value === 'not_started' ||
          value === 'in_progress' ||
          value === 'completed' ||
          value === 'blocked'
        ) {
          setEditStatus(value)
        }
      }}
      onStartEditTrail={(rowId) => {
        const row = trails.find((t) => t.id === rowId)
        if (row) handleStartEditTrail(row)
      }}
      onCancelEditTrail={handleCancelEditTrail}
      onSaveTrailPosition={(rowId) => {
        const row = trails.find((t) => t.id === rowId)
        if (row) void handleSaveTrailPosition(row)
      }}
      onUnlinkTrail={(rowId) => {
        const row = trails.find((t) => t.id === rowId)
        if (row) void handleUnlinkTrail(row)
      }}
      missingInstitutionId={!stu?.institution_id}
      institutionTrailsError={institutionTrailsError}
      linkError={linkError}
      linkTrailId={linkTrailId}
      onLinkTrailIdChange={setLinkTrailId}
      linkStatus={linkStatus}
      onLinkStatusChange={(value) =>
        setLinkStatus(value as StudentTrailStatus)
      }
      linkBusy={linkBusy}
      loadingInstitutionTrails={loadingInstitutionTrails}
      linkableTrails={linkableTrails.map((t) => ({
        id: t.id,
        label: `${t.name?.trim() ? `${t.name} (${t.id})` : t.id}${
          !t.active ? ' — inativa' : ''
        }`,
      }))}
      onLinkTrailSubmit={(e) => void handleLinkTrail(e)}
      loadingLogs={loadingLogs}
      logsError={logsError}
      logsEmpty={logs.length === 0}
      agentHistoryFilterLabel={
        agentTrailFilters.length > 0
          ? agentLabelForTrailId(agentTrailFilters[0]!)
          : null
      }
      onClearAgentHistoryFilter={
        agentTrailFilters.length > 0
          ? () => {
              const next = new URLSearchParams(searchParams)
              next.delete('agent_trail_id')
              next.delete('agent_trail_ids')
              setSearchParams(next, { replace: true })
            }
          : null
      }
      chatSlot={
        logs.length > 0 ? (
          <ConversationChat
            logs={logs}
            visibleCount={logsVisibleCount}
            showTrail={agentTrailFilters.length === 0}
            onLoadMore={() =>
              setLogsVisibleCount((count) =>
                Math.min(count + LOGS_PAGE_SIZE, logs.length),
              )
            }
          />
        ) : null
      }
    />
  )
}
