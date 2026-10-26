import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
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
import { formatSaoPauloDateTime } from '../lib/formatSaoPaulo'
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
  const [extraTrails, setExtraTrails] = useState<Trail[]>([])
  const [loadingInstitutionTrails, setLoadingInstitutionTrails] = useState(false)
  const [institutionTrailsError, setInstitutionTrailsError] = useState<
    string | null
  >(null)

  const [linkTrailId, setLinkTrailId] = useState('')
  const [linkStatus, setLinkStatus] = useState<StudentTrailStatus>('not_started')
  const linkBusy = false
  const [linkError, setLinkError] = useState<string | null>(null)
  const [editingTrailId, setEditingTrailId] = useState<string | null>(null)
  const [editStage, setEditStage] = useState('')
  const [editQuestion, setEditQuestion] = useState('')
  const [editStatus, setEditStatus] = useState<StudentTrailStatus>('not_started')
  const editBusy = false
  const [editError, setEditError] = useState<string | null>(null)

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

  // Trilhas vinculadas cujo doc não veio no escopo da instituição (nome some como t47).
  useEffect(() => {
    if (!db) {
      setExtraTrails([])
      return
    }
    const known = new Set(institutionTrails.map((t) => t.id))
    const missing = [
      ...new Set(
        trails
          .map((t) => t.trail_id)
          .filter((id): id is string => Boolean(id) && !known.has(id)),
      ),
    ]
    if (missing.length === 0) {
      setExtraTrails([])
      return
    }
    const dbOk = db
    let cancelled = false
    void (async () => {
      const found: Trail[] = []
      await Promise.all(
        missing.map(async (trailId) => {
          try {
            const snap = await getDoc(doc(dbOk, TRAILS_COLLECTION, trailId))
            if (snap.exists()) found.push(snapshotToTrail(snap))
          } catch {
            // sem acesso / inexistente: mantém o id na UI
          }
        }),
      )
      if (!cancelled) setExtraTrails(found)
    })()
    return () => {
      cancelled = true
    }
  }, [trails, institutionTrails])

  const trailById = useMemo(() => {
    const m = new Map<string, Trail>()
    for (const t of institutionTrails) m.set(t.id, t)
    for (const t of extraTrails) m.set(t.id, t)
    return m
  }, [institutionTrails, extraTrails])

  const trailNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const [id, t] of trailById) {
      const name = t.name?.trim()
      if (name) m.set(id, name)
    }
    return m
  }, [trailById])

  const linkedTrailIdSet = useMemo(() => {
    return new Set(trails.map((t) => t.trail_id).filter(Boolean))
  }, [trails])

  const linkableTrails = useMemo(() => {
    return institutionTrails.filter((t) => !linkedTrailIdSet.has(t.id))
  }, [institutionTrails, linkedTrailIdSet])

  /*
   * Trilhas vinculadas (1.1.1.b): vincular, desvincular e mudar atividade, etapa ou status NÃO gravam na linha.
   * As mudanças ficam pendentes e só o Salvar do topo grava (junto com o cadastro).
   */
  type TrailEdit = { stage: number; question: number; status: StudentTrailStatus }
  const [edits, setEdits] = useState<Map<string, TrailEdit>>(new Map())
  const [unlinked, setUnlinked] = useState<Set<string>>(new Set())
  const [newLinks, setNewLinks] = useState<Array<{ trailId: string; status: StudentTrailStatus }>>([])

  const pendingTrails = edits.size > 0 || unlinked.size > 0 || newLinks.length > 0

  function cancelTrailChanges() {
    setEdits(new Map())
    setUnlinked(new Set())
    setNewLinks([])
    setEditingTrailId(null)
    setLinkError(null)
    setEditError(null)
  }

  /** Grava as mudanças pendentes de trilhas. Lança erro se alguma falhar (o pop-up de sair mostra a mensagem). */
  async function persistTrailChanges(): Promise<void> {
    if (!db || !id) return
    const firestore = db
    for (const [rowId, e] of edits) {
      if (unlinked.has(rowId)) continue
      await runTransaction(firestore, async (tx) => {
        const ref = doc(firestore, STUDENT_TRAILS_COLLECTION, rowId)
        const snap = await tx.get(ref)
        if (!snap.exists()) throw new Error('Registro de trilha do aluno não encontrado.')
        const data = snap.data() ?? {}
        const now = serverTimestamp()
        const patch: Record<string, unknown> = {
          current_stage_number: e.stage,
          current_question_number: e.question,
          status: e.status,
          updated_at: now,
          last_interaction_at: now,
        }
        if ((e.status === 'in_progress' || e.status === 'completed') && !data.started_at) patch.started_at = now
        if (e.status === 'completed') patch.completed_at = now
        tx.update(ref, patch)
      })
    }
    for (const rowId of unlinked) await deleteDoc(doc(firestore, STUDENT_TRAILS_COLLECTION, rowId))
    for (const link of newLinks) {
      if (!stu?.institution_id) throw new Error('Este aluno não tem instituição.')
      await runTransaction(firestore, async (tx) => {
        const ref = doc(firestore, STUDENT_TRAILS_COLLECTION, studentTrailDocId(id, link.trailId))
        const snap = await tx.get(ref)
        if (snap.exists()) throw new Error('Este aluno já está vinculado a esta trilha (registro já existe).')
        const now = serverTimestamp()
        tx.set(ref, {
          student_id: id,
          institution_id: stu.institution_id,
          trail_id: link.trailId,
          current_stage_number: 1,
          current_question_number: 1,
          status: link.status,
          started_at: link.status === 'in_progress' ? now : null,
          completed_at: null,
          last_interaction_at: null,
          created_at: now,
          updated_at: now,
        })
      })
    }
    setEdits(new Map())
    setUnlinked(new Set())
    setNewLinks([])
  }

  function handleLinkTrail(e: FormEvent) {
    e.preventDefault()
    const trailId = linkTrailId.trim()
    if (!trailId) {
      setLinkError('Selecione uma trilha.')
      return
    }
    setLinkError(null)
    setNewLinks((cur) => (cur.some((l) => l.trailId === trailId) ? cur : [...cur, { trailId, status: linkStatus }]))
    setLinkTrailId('')
    setLinkStatus('not_started')
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

  function handleSaveTrailPosition(row: StudentTrail) {
    setEditError(null)
    try {
      const nextStage = parsePositiveInteger(editStage, 'Etapa atual')
      const nextQuestion = parsePositiveInteger(editQuestion, 'Atividade atual')
      const nextStatus = parseStudentTrailStatus(editStatus)
      setEdits((cur) => new Map(cur).set(row.id, { stage: nextStage, question: nextQuestion, status: nextStatus }))
      setEditingTrailId(null)
      setEditStage('')
      setEditQuestion('')
      setEditStatus('not_started')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Valores inválidos.')
    }
  }

  /** Marca ou desmarca a trilha para desvincular (só grava no Salvar do topo). */
  function handleUnlinkTrail(row: StudentTrail) {
    setUnlinked((cur) => {
      const next = new Set(cur)
      if (next.has(row.id)) next.delete(row.id)
      else next.add(row.id)
      return next
    })
  }

  if (!id) {
    return <StudentDetailPageView status="missing-id" />
  }

  const trailRows: StudentDetailTrailRow[] = [
    ...sortedTrails.map((row) => {
    const meta = trailById.get(row.trail_id)
    const label = meta?.name?.trim() ? meta.name : row.trail_id
    const pendingEdit = edits.get(row.id)
    return {
      pending: unlinked.has(row.id) ? ('unlink' as const) : pendingEdit ? ('edit' as const) : undefined,
      id: row.id,
      trailHref: trailPath(row.trail_id),
      trailLabel: label,
      trailIdSecondary: meta?.name?.trim() ? row.trail_id : null,
      inactiveHint: Boolean(meta?.name?.trim() && !meta.active),
      isEditing: editingTrailId === row.id,
      stageDisplay: pendingEdit?.stage ?? row.current_stage_number,
      questionDisplay: pendingEdit?.question ?? row.current_question_number,
      status: pendingEdit?.status ?? row.status,
      startedAtLabel: formatSaoPauloDateTime(row.started_at),
      lastInteractionAtLabel: formatSaoPauloDateTime(row.last_interaction_at),
    }
    }),
    ...newLinks.map((l) => {
      const meta = institutionTrails.find((t) => t.id === l.trailId)
      return {
        pending: 'new' as const,
        id: `new:${l.trailId}`,
        trailHref: trailPath(l.trailId),
        trailLabel: meta?.name?.trim() ? meta.name : l.trailId,
        trailIdSecondary: null,
        inactiveHint: false,
        isEditing: false,
        stageDisplay: 1,
        questionDisplay: 1,
        status: l.status,
        startedAtLabel: 'N/A',
        lastInteractionAtLabel: 'N/A',
      }
    }),
  ]

  return (
    <StudentDetailPageView
      status="ok"
      error={error}
      loading={loading}
      notFound={!stu}
      formSlot={
        stu ? (
          <StudentForm
            docId={id}
            initial={stu}
            extraDirty={pendingTrails}
            extraSave={persistTrailChanges}
            extraCancel={cancelTrailChanges}
          />
        ) : null
      }
      hasStudent={Boolean(stu)}
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
        if (!row) return
        handleStartEditTrail(row)
        const e = edits.get(row.id)
        if (e) {
          setEditStage(String(e.stage))
          setEditQuestion(String(e.question))
          setEditStatus(e.status)
        }
      }}
      onCancelEditTrail={handleCancelEditTrail}
      onSaveTrailPosition={(rowId) => {
        const row = trails.find((t) => t.id === rowId)
        if (row) handleSaveTrailPosition(row)
      }}
      onUnlinkTrail={(rowId) => {
        if (rowId.startsWith('new:')) {
          setNewLinks((cur) => cur.filter((l) => `new:${l.trailId}` !== rowId))
          return
        }
        const row = trails.find((t) => t.id === rowId)
        if (row) handleUnlinkTrail(row)
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
          !t.active ? ' (inativa)' : ''
        }`,
      }))}
      onLinkTrailSubmit={(e) => handleLinkTrail(e)}
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
            trailNames={trailNameMap}
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
