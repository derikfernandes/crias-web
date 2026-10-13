import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { INSTITUTIONS_COLLECTION } from '../lib/institutionFirestore'
import {
  formatTrailTs,
  TRAILS_COLLECTION,
  snapshotToTrail,
} from '../lib/trailFirestore'
import {
  TRAIL_STAGES_COLLECTION,
  trailStageDocId,
  snapshotToTrailStage,
} from '../lib/trailStageFirestore'
import {
  TRAIL_STAGE_QUESTIONS_COLLECTION,
  snapshotToTrailStageQuestion,
  trailStageQuestionDocId,
} from '../lib/trailStageQuestionFirestore'
import {
  STUDENT_TRAILS_COLLECTION,
  snapshotToStudentTrail,
  studentTrailDocId,
} from '../lib/studentTrailFirestore'
import {
  snapshotToStudent,
  STUDENTS_COLLECTION,
} from '../lib/studentFirestore'
import { TrailForm } from '../components/TrailForm'
import { TrailStructureEditor } from '../components/TrailStructureEditor'
import { TrailContentEditor } from '../components/TrailContentEditor'
import { TrailDetailPageView } from '../design/views/TrailDetailPageView'
import type { TrailDetailStudentTrailRow } from '../design/types/trailDetailPageView'
import type { Trail } from '../types/trail'
import type { TrailStage } from '../types/trailStage'
import type { StudentTrail } from '../types/studentTrail'
import type { Student } from '../types/student'
import type { TrailStageQuestion } from '../types/trailStageQuestion'
import { studentPath } from '../lib/paths'
import { loadXlsx } from '../lib/loadXlsx'
import {
  buildBulkInstructionsRows,
  buildBulkTemplateRows,
  bulkTemplateHeadersForStructure,
  buildQuestionFromStructure,
  contentEtapasFromTrailStageQuestions,
  defaultEtapasFromStructure,
  parseBulkTemplateRows,
  structurePhasesFromTrailData,
  syncQuestionPhasesWithStructure,
  type BulkImportPreview,
  type ContentEtapa,
  type ContentPhase,
  type StructurePhase,
} from '../lib/trailEditor'

const STUDENT_TRAILS_PAGE_SIZE = 20

export function TrailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<
    'structure' | 'content' | 'students'
  >('structure')
  const [trail, setTrail] = useState<Trail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stages, setStages] = useState<TrailStage[]>([])
  const [loadingStages, setLoadingStages] = useState(true)
  const [stagesError, setStagesError] = useState<string | null>(null)

  const [studentTrails, setStudentTrails] = useState<StudentTrail[]>([])
  const [loadingStudentTrails, setLoadingStudentTrails] = useState(false)
  const [studentTrailsError, setStudentTrailsError] = useState<string | null>(null)

  const [institutionStudents, setInstitutionStudents] = useState<Student[]>([])
  const [loadingInstitutionStudents, setLoadingInstitutionStudents] =
    useState(false)
  const [institutionStudentsError, setInstitutionStudentsError] = useState<
    string | null
  >(null)

  const [showAddStudentPicker, setShowAddStudentPicker] = useState(false)
  const [studentPickerFilter, setStudentPickerFilter] = useState('')
  const [addStudentError, setAddStudentError] = useState<string | null>(null)
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null)

  const [showBulkEditor, setShowBulkEditor] = useState(false)
  const [selectedStudentTrailIds, setSelectedStudentTrailIds] = useState<
    Set<string>
  >(new Set())
  const [bulkStage, setBulkStage] = useState('')
  const [bulkQuestion, setBulkQuestion] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null)
  const [filterStage, setFilterStage] = useState('')
  const [filterQuestion, setFilterQuestion] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [studentTrailsPage, setStudentTrailsPage] = useState(1)

  const [showTrailForm, setShowTrailForm] = useState(false)
  const [structurePhases, setStructurePhases] = useState<StructurePhase[]>([])
  const [savingStructure, setSavingStructure] = useState(false)
  const [structureError, setStructureError] = useState<string | null>(null)
  const [structureDirty, setStructureDirty] = useState(false)
  const [trailActiveDraft, setTrailActiveDraft] = useState(true)
  const [contentEtapas, setContentEtapas] = useState<ContentEtapa[]>([])
  const [selectedEtapaId, setSelectedEtapaId] = useState<string | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [phaseSaved, setPhaseSaved] = useState<Record<string, boolean>>({})
  const [stageQuestions, setStageQuestions] = useState<TrailStageQuestion[]>([])
  const [loadingStageQuestions, setLoadingStageQuestions] = useState(false)
  const [stageQuestionsError, setStageQuestionsError] = useState<string | null>(null)
  const [savingContentDraft, setSavingContentDraft] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [contentDirty, setContentDirty] = useState(false)
  const [bulkPreview, setBulkPreview] = useState<BulkImportPreview | null>(null)
  const [pendingBulkContent, setPendingBulkContent] = useState<ContentEtapa[] | null>(null)
  const [importingBulk, setImportingBulk] = useState(false)
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([])

  const sortedStudentTrails = useMemo(() => {
    return [...studentTrails].sort((a, b) => {
      const ma = a.updated_at?.toMillis?.() ?? a.created_at?.toMillis?.() ?? 0
      const mb = b.updated_at?.toMillis?.() ?? b.created_at?.toMillis?.() ?? 0
      return mb - ma
    })
  }, [studentTrails])

  const studentNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of institutionStudents) {
      m.set(s.id, s.name?.trim() || s.id)
    }
    return m
  }, [institutionStudents])

  const studentPhoneById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of institutionStudents) {
      const phone = s.phone_number?.trim?.() ?? ''
      if (phone) m.set(s.id, phone)
    }
    return m
  }, [institutionStudents])

  const eligibleStudentsToAdd = useMemo(() => {
    const inTrail = new Set(studentTrails.map((st) => st.student_id))
    return institutionStudents
      .filter((s) => s.institution_id && !inTrail.has(s.id))
      .sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR', {
          sensitivity: 'base',
        }),
      )
  }, [institutionStudents, studentTrails])

  const filteredEligibleStudents = useMemo(() => {
    const q = studentPickerFilter.trim().toLowerCase()
    if (!q) return eligibleStudentsToAdd
    const digits = studentPickerFilter.replace(/\D/g, '')
    return eligibleStudentsToAdd.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true
      if (s.id.toLowerCase().includes(q)) return true
      if (digits.length > 0 && s.phone_number.includes(digits)) return true
      return false
    })
  }, [eligibleStudentsToAdd, studentPickerFilter])

  const maxCreatedStageNumber = useMemo(() => {
    if (stages.length === 0) return 0
    return Math.max(...stages.map((s) => s.stage_number))
  }, [stages])

  const selectedEtapa = useMemo(
    () => contentEtapas.find((et) => et.id === selectedEtapaId) ?? null,
    [contentEtapas, selectedEtapaId],
  )

  const stageOptions = useMemo(() => {
    const numbers = new Set<number>()
    for (const s of stages) {
      if (Number.isFinite(s.stage_number) && s.stage_number >= 1) {
        numbers.add(s.stage_number)
      }
    }
    for (const q of stageQuestions) {
      if (Number.isFinite(q.stage_number) && q.stage_number >= 1) {
        numbers.add(q.stage_number)
      }
    }
    return [...numbers].sort((a, b) => a - b)
  }, [stages, stageQuestions])

  const questionOptions = useMemo(() => {
    const numbers = new Set<number>()
    for (const q of stageQuestions) {
      if (Number.isFinite(q.question_number) && q.question_number >= 1) {
        numbers.add(q.question_number)
      }
    }
    for (const row of studentTrails) {
      if (
        Number.isFinite(row.current_question_number) &&
        row.current_question_number >= 1
      ) {
        numbers.add(row.current_question_number)
      }
    }
    if (numbers.size === 0) {
      for (let i = 1; i <= contentEtapas.length; i++) numbers.add(i)
    }
    return [...numbers].sort((a, b) => a - b)
  }, [stageQuestions, studentTrails, contentEtapas])

  const filteredStudentTrails = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    const digits = studentSearch.replace(/\D/g, '')
    return sortedStudentTrails.filter((row) => {
      if (filterStage && row.current_stage_number !== Number(filterStage)) {
        return false
      }
      if (
        filterQuestion &&
        row.current_question_number !== Number(filterQuestion)
      ) {
        return false
      }
      if (!q) return true
      const name = (studentNameById.get(row.student_id) ?? '').toLowerCase()
      const phone = (studentPhoneById.get(row.student_id) ?? '').replace(
        /\D/g,
        '',
      )
      if (name.includes(q)) return true
      if (row.student_id.toLowerCase().includes(q)) return true
      if (digits.length > 0 && phone.includes(digits)) return true
      return false
    })
  }, [
    sortedStudentTrails,
    filterStage,
    filterQuestion,
    studentSearch,
    studentNameById,
    studentPhoneById,
  ])

  const studentTrailsTotalPages = Math.max(
    1,
    Math.ceil(filteredStudentTrails.length / STUDENT_TRAILS_PAGE_SIZE),
  )
  const paginatedStudentTrails = useMemo(() => {
    const start = (studentTrailsPage - 1) * STUDENT_TRAILS_PAGE_SIZE
    return filteredStudentTrails.slice(start, start + STUDENT_TRAILS_PAGE_SIZE)
  }, [filteredStudentTrails, studentTrailsPage])

  const allStudentTrailsSelected =
    filteredStudentTrails.length > 0 &&
    filteredStudentTrails.every((row) => selectedStudentTrailIds.has(row.id))

  useEffect(() => {
    setActiveTab('structure')
    setStudentTrails([])
    setInstitutionStudents([])
    setStageQuestions([])
    setStudentSearch('')
    setStudentTrailsPage(1)
  }, [id])

  useEffect(() => {
    if (studentTrailsPage > studentTrailsTotalPages) {
      setStudentTrailsPage(studentTrailsTotalPages)
    }
  }, [studentTrailsPage, studentTrailsTotalPages])

  useEffect(() => {
    if (!db || !id) return

    const unsub = onSnapshot(
      doc(db, TRAILS_COLLECTION, id),
      (snap) => {
        if (!snap.exists()) {
          setTrail(null)
          setError(null)
          setLoading(false)
          return
        }

        setTrail(snapshotToTrail(snap))
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
    if (!db || !id || activeTab !== 'students') return
    const dbOk = db
    let unsub: (() => void) | null = null

    async function run() {
      setLoadingStudentTrails(true)
      setStudentTrailsError(null)

      const q = query(
        collection(dbOk, STUDENT_TRAILS_COLLECTION),
        where('trail_id', '==', id),
      )

      unsub = onSnapshot(
        q,
        (snap) => {
          const next = snap.docs.map(snapshotToStudentTrail)
          setStudentTrails(next)
          setStudentTrailsError(null)
          setLoadingStudentTrails(false)
        },
        (err) => {
          setStudentTrailsError(err.message)
          setLoadingStudentTrails(false)
        },
      )
    }

    void run()
    return () => unsub?.()
  }, [activeTab, id])

  useEffect(() => {
    if (!db || !id) return
    const dbOk = db
    let unsub: (() => void) | null = null

    async function run() {
      setLoadingStages(true)
      setStagesError(null)

      const q = query(
        collection(dbOk, TRAIL_STAGES_COLLECTION),
        where('trail_id', '==', id),
      )

      unsub = onSnapshot(
        q,
        (snap) => {
          // Sem `orderBy` para não exigir índice composto no Firestore.
          // A ordenação por `stage_number` é feita no client.
          const next = snap.docs.map(snapshotToTrailStage)
          next.sort((a, b) => a.stage_number - b.stage_number)
          setStages(next)
          setStagesError(null)
          setLoadingStages(false)
        },
        (err) => {
          setStagesError(err.message)
          setLoadingStages(false)
        },
      )
    }

    void run()
    return () => unsub?.()
  }, [id])

  useEffect(() => {
    if (
      activeTab !== 'students' ||
      !db ||
      !trail?.institution_id?.trim()
    ) {
      setInstitutionStudents([])
      setInstitutionStudentsError(null)
      setLoadingInstitutionStudents(false)
      return
    }

    const instId = trail.institution_id.trim()
    setLoadingInstitutionStudents(true)
    setInstitutionStudentsError(null)

    const q = query(
      collection(db, STUDENTS_COLLECTION),
      where('institution_id', '==', instId),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map(snapshotToStudent)
        next.sort((a, b) =>
          (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR', {
            sensitivity: 'base',
          }),
        )
        setInstitutionStudents(next)
        setInstitutionStudentsError(null)
        setLoadingInstitutionStudents(false)
      },
      (err) => {
        setInstitutionStudentsError(err.message)
        setInstitutionStudents([])
        setLoadingInstitutionStudents(false)
      },
    )

    return () => unsub()
  }, [activeTab, trail?.institution_id])

  useEffect(() => {
    if (!showAddStudentPicker) {
      setStudentPickerFilter('')
      setAddStudentError(null)
    }
  }, [showAddStudentPicker])

  useEffect(() => {
    if (!showBulkEditor) {
      setSelectedStudentTrailIds(new Set())
      setBulkStage('')
      setBulkQuestion('')
      setBulkError(null)
      setBulkSuccess(null)
      setStudentSearch('')
      setFilterStage('')
      setFilterQuestion('')
    }
  }, [showBulkEditor])

  useEffect(() => {
    setSelectedStudentTrailIds(new Set())
    setBulkSuccess(null)
  }, [filterStage, filterQuestion, studentSearch])

  useEffect(() => {
    setSelectedStudentTrailIds((prev) => {
      if (prev.size === 0) return prev
      const existing = new Set(studentTrails.map((row) => row.id))
      let changed = false
      const next = new Set<string>()
      for (const rowId of prev) {
        if (existing.has(rowId)) next.add(rowId)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [studentTrails])

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(collection(db, INSTITUTIONS_COLLECTION), (snap) => {
      const next = snap.docs.map((d) => {
        const data = d.data()
        const nm =
          typeof (data as Record<string, unknown>).name === 'string'
            ? ((data as Record<string, unknown>).name as string)
            : ''
        return { id: d.id, name: nm }
      })
      next.sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR', {
          sensitivity: 'base',
        }),
      )
      setInstitutions(next)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!db || !id || activeTab !== 'content') return
    const dbOk = db
    let unsub: (() => void) | null = null

    async function run() {
      setLoadingStageQuestions(true)
      setStageQuestionsError(null)

      const q = query(
        collection(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION),
        where('trail_id', '==', id),
      )

      unsub = onSnapshot(
        q,
        (snap) => {
          const next = snap.docs.map(snapshotToTrailStageQuestion)
          setStageQuestions(next)
          setStageQuestionsError(null)
          setLoadingStageQuestions(false)
        },
        (err) => {
          setStageQuestionsError(err.message)
          setStageQuestions([])
          setLoadingStageQuestions(false)
        },
      )
    }

    void run()
    return () => unsub?.()
  }, [activeTab, id])

  useEffect(() => {
    if (!trail || structureDirty) return
    setStructurePhases(structurePhasesFromTrailData(trail.phase_blueprint, stages))
    setTrailActiveDraft(trail.active)
    setStructureError(null)
  }, [trail, stages, structureDirty])

  useEffect(() => {
    if (structurePhases.length === 0) return
    if (contentDirty) return
    const built = contentEtapasFromTrailStageQuestions(stageQuestions, structurePhases)
    const lastEtapa = built.at(-1)
    setContentEtapas(built)
    setSelectedEtapaId(lastEtapa?.id ?? null)
    setSelectedQuestionId(lastEtapa?.questions[0]?.id ?? null)
    setContentError(null)
  }, [contentDirty, stageQuestions, structurePhases])

  useEffect(() => {
    if (!selectedEtapa) return
    if (!selectedQuestionId) {
      setSelectedQuestionId(selectedEtapa.questions[0]?.id ?? null)
      return
    }
    if (!selectedEtapa.questions.some((q) => q.id === selectedQuestionId)) {
      setSelectedQuestionId(selectedEtapa.questions[0]?.id ?? null)
    }
  }, [selectedEtapa, selectedQuestionId])

  useEffect(() => {
    if (contentEtapas.length === 0) return
    setContentEtapas((prev) =>
      prev.map((et) => ({
        ...et,
        questions: et.questions.map((q) => ({
          ...q,
          phases: syncQuestionPhasesWithStructure(q, structurePhases),
        })),
      })),
    )
  }, [structurePhases])

  useEffect(() => {
    setBulkPreview(null)
    setPendingBulkContent(null)
  }, [structurePhases, id])

  async function addStudentToTrail(studentId: string) {
    if (!db || !id || !trail?.institution_id?.trim()) return
    const instId = trail.institution_id.trim()
    setAddStudentError(null)
    setAddingStudentId(studentId)
    const docRef = doc(
      db,
      STUDENT_TRAILS_COLLECTION,
      studentTrailDocId(studentId, id),
    )
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef)
        if (snap.exists()) {
          throw new Error(
            'Este aluno já possui registro nesta trilha (student_trails).',
          )
        }
        transaction.set(docRef, {
          student_id: studentId,
          institution_id: instId,
          trail_id: id,
          current_stage_number: 1,
          current_question_number: 1,
          status: 'not_started',
          started_at: null,
          completed_at: null,
          last_interaction_at: null,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        })
      })
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Não foi possível adicionar o aluno.'
      setAddStudentError(msg)
    } finally {
      setAddingStudentId(null)
    }
  }

  function toggleStudentTrailSelection(rowId: string) {
    setSelectedStudentTrailIds((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
    setBulkSuccess(null)
  }

  function toggleSelectAllStudentTrails() {
    setSelectedStudentTrailIds((prev) => {
      const allSelected =
        filteredStudentTrails.length > 0 &&
        filteredStudentTrails.every((row) => prev.has(row.id))
      const next = new Set(prev)
      if (allSelected) {
        filteredStudentTrails.forEach((row) => next.delete(row.id))
      } else {
        filteredStudentTrails.forEach((row) => next.add(row.id))
      }
      return next
    })
    setBulkSuccess(null)
  }

  async function applyBulkPosition() {
    if (!db) return
    setBulkError(null)
    setBulkSuccess(null)

    if (selectedStudentTrailIds.size === 0) {
      setBulkError('Selecione ao menos um aluno para alterar em lote.')
      return
    }
    const nextStage = Number(bulkStage)
    const nextQuestion = Number(bulkQuestion)
    if (!Number.isInteger(nextStage) || nextStage < 1) {
      setBulkError('Escolha um stage válido.')
      return
    }
    if (!Number.isInteger(nextQuestion) || nextQuestion < 1) {
      setBulkError('Escolha uma questão válida.')
      return
    }

    const dbOk = db
    const ids = [...selectedStudentTrailIds]
    setBulkBusy(true)
    try {
      const chunkSize = 400
      for (let start = 0; start < ids.length; start += chunkSize) {
        const chunk = ids.slice(start, start + chunkSize)
        const batch = writeBatch(dbOk)
        for (const rowId of chunk) {
          const ref = doc(dbOk, STUDENT_TRAILS_COLLECTION, rowId)
          batch.update(ref, {
            current_stage_number: nextStage,
            current_question_number: nextQuestion,
            updated_at: serverTimestamp(),
            last_interaction_at: serverTimestamp(),
          })
        }
        await batch.commit()
      }
      setBulkSuccess(
        `${ids.length} aluno(s) movido(s) para stage ${nextStage}, questão ${nextQuestion}.`,
      )
      setSelectedStudentTrailIds(new Set())
    } catch (e) {
      setBulkError(
        e instanceof Error ? e.message : 'Erro ao alterar alunos em lote.',
      )
    } finally {
      setBulkBusy(false)
    }
  }

  function addStructurePhase() {
    setStructurePhases((prev) => [
      ...prev,
      { id: `local-${Date.now()}-${prev.length + 1}`, title: `Fase ${prev.length + 1}`, stage_type: 'fixed', prompt: '' },
    ])
    setStructureDirty(true)
  }

  function removeStructurePhase(phaseId: string) {
    setStructurePhases((prev) =>
      prev.length <= 1 ? prev : prev.filter((p) => p.id !== phaseId),
    )
    setStructureDirty(true)
  }

  function updateStructurePhase(
    phaseId: string,
    patch: Partial<Pick<StructurePhase, 'title' | 'stage_type' | 'prompt'>>,
  ) {
    setStructurePhases((prev) =>
      prev.map((phase) => (phase.id === phaseId ? { ...phase, ...patch } : phase)),
    )
    setStructureDirty(true)
  }

  function addEtapa() {
    setContentEtapas((prev) => {
      const autoQuestion = buildQuestionFromStructure('Questão 1', structurePhases)
      const created = {
        id: `local-et-${Date.now()}-${prev.length + 1}`,
        name: `Etapa ${prev.length + 1}`,
        released: false,
        questions: [autoQuestion],
      }
      setSelectedEtapaId(created.id)
      setSelectedQuestionId(autoQuestion.id)
      return [...prev, created]
    })
    setContentDirty(true)
  }

  function removeEtapa(etapaId: string) {
    setContentEtapas((prev) => {
      if (prev.length <= 1) {
        setContentError('A trilha precisa de pelo menos 1 etapa.')
        return prev
      }
      const removedIndex = prev.findIndex((et) => et.id === etapaId)
      if (removedIndex < 0) return prev
      const next = prev.filter((et) => et.id !== etapaId)
      const nextSelected = next[Math.min(removedIndex, next.length - 1)] ?? null
      setSelectedEtapaId(nextSelected?.id ?? null)
      setSelectedQuestionId(nextSelected?.questions[0]?.id ?? null)
      setContentDirty(true)
      return next
    })
  }

  function updateQuestionTitle(questionId: string, value: string) {
    setContentEtapas((prev) =>
      prev.map((et) => ({
        ...et,
        questions: et.questions.map((q) =>
          q.id === questionId ? { ...q, title: value } : q,
        ),
      })),
    )
    setContentDirty(true)
  }

  function updateQuestionPhase(
    questionId: string,
    phaseId: string,
    patch: Partial<
      Pick<
        ContentPhase,
        'aiPrompt' | 'fixedText' | 'correctOption' | 'exerciseQuestions'
      >
    >,
  ) {
    setContentEtapas((prev) =>
      prev.map((et) => ({
        ...et,
        questions: et.questions.map((q) =>
          q.id === questionId
            ? {
                ...q,
                phases: q.phases.map((p) =>
                  p.phaseId === phaseId ? { ...p, ...patch } : p,
                ),
              }
            : q,
        ),
      })),
    )
    setPhaseSaved((prev) => ({
      ...prev,
      [`${questionId}:${phaseId}`]: false,
    }))
    setContentDirty(true)
  }

  function markPhaseSaved(questionId: string, phaseId: string) {
    setPhaseSaved((prev) => ({
      ...prev,
      [`${questionId}:${phaseId}`]: true,
    }))
  }

  function toggleEtapaReleased(etapaId: string) {
    setContentEtapas((prev) =>
      prev.map((et) =>
        et.id === etapaId ? { ...et, released: !et.released } : et,
      ),
    )
    setContentDirty(true)
  }

  async function exportStudentTrailsXlsx() {
    if (sortedStudentTrails.length === 0) return
    const XLSX = await loadXlsx()
    const rows = sortedStudentTrails.map((row) => ({
      Aluno: studentNameById.get(row.student_id) ?? row.student_id,
      Telefone: studentPhoneById.get(row.student_id) ?? '',
      'ID do aluno': row.student_id,
      'Stage atual': row.current_stage_number,
      'Questão atual': row.current_question_number,
      Status: row.status,
      Início: row.started_at?.toDate
        ? row.started_at.toDate().toLocaleString('pt-BR')
        : '',
      'Última interação': row.last_interaction_at?.toDate
        ? row.last_interaction_at.toDate().toLocaleString('pt-BR')
        : '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos')
    XLSX.writeFile(workbook, `alunos-trilha-${id}.xlsx`)
  }

  async function downloadBulkTemplate() {
    if (!id || structurePhases.length === 0) return
    const XLSX = await loadXlsx()
    const workbook = XLSX.utils.book_new()
    const instructions = buildBulkInstructionsRows(structurePhases)
    const templateHeaders = bulkTemplateHeadersForStructure(structurePhases)
    const templateRows = buildBulkTemplateRows(structurePhases, 5)
    const templateAoA = [
      templateHeaders,
      ...templateRows.map((row) => templateHeaders.map((header) => row[header] ?? '')),
    ]

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(instructions),
      'Instrucoes',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(templateAoA),
      'ConteudosModelo',
    )
    XLSX.writeFile(workbook, `modelo-conteudos-${id}.xlsx`)
  }

  async function importBulkTemplate(file: File) {
    if (structurePhases.length === 0) return
    setImportingBulk(true)
    setContentError(null)
    try {
      const XLSX = await loadXlsx()
      const buf = await file.arrayBuffer()
      const workbook = XLSX.read(buf, { type: 'array' })
      const sheet = workbook.Sheets.ConteudosModelo
      if (!sheet) {
        setContentError('A planilha precisa conter a aba "ConteudosModelo".')
        setBulkPreview(null)
        setPendingBulkContent(null)
        return
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
      })
      const preview = parseBulkTemplateRows(rows, structurePhases)
      setBulkPreview(preview)
      setPendingBulkContent(preview.validRows > 0 ? preview.nextContentEtapas : null)
      if (preview.validRows === 0) {
        setContentError(
          'Nenhuma linha válida encontrada na planilha. Corrija os erros e importe novamente.',
        )
      }
    } catch (err) {
      setContentError(
        err instanceof Error ? err.message : 'Falha ao ler arquivo da planilha.',
      )
      setBulkPreview(null)
      setPendingBulkContent(null)
    } finally {
      setImportingBulk(false)
    }
  }

  function applyBulkImport() {
    if (!pendingBulkContent || pendingBulkContent.length === 0) return
    const lastEtapa = pendingBulkContent.at(-1)
    setContentEtapas(pendingBulkContent)
    setSelectedEtapaId(lastEtapa?.id ?? null)
    setSelectedQuestionId(lastEtapa?.questions[0]?.id ?? null)
    setPhaseSaved({})
    setContentDirty(true)
    setBulkPreview(null)
    setPendingBulkContent(null)
  }

  async function saveStructureAndContinueToContent() {
    if (!db || !id || !trail) return
    const dbOk = db
    if (structurePhases.length < 1) {
      setStructureError('Inclua pelo menos uma fase na estrutura.')
      return
    }
    for (let i = 0; i < structurePhases.length; i++) {
      const phase = structurePhases[i]
      if (!phase.title.trim()) {
        setStructureError('Cada fase precisa de um nome.')
        return
      }
      if (phase.stage_type === 'ai' && !phase.prompt.trim()) {
        const label = phase.title.trim() || `Fase ${i + 1}`
        setStructureError(
          `A fase "${label}" usa IA e precisa de um comando da IA (instrução para o modelo).`,
        )
        return
      }
    }

    setSavingStructure(true)
    setStructureError(null)
    try {
      await runTransaction(dbOk, async (tx) => {
        const trailRef = doc(dbOk, TRAILS_COLLECTION, id)
        const previousTrailSnap = await tx.get(trailRef)
        if (!previousTrailSnap.exists()) {
          throw new Error('A trilha não existe mais ou foi excluída.')
        }
        const previousData = previousTrailSnap.exists()
          ? (previousTrailSnap.data() as { default_total_steps_per_stage?: unknown })
          : {}
        const previousStepsRaw = previousData.default_total_steps_per_stage
        const previousSteps =
          typeof previousStepsRaw === 'number' &&
          Number.isFinite(previousStepsRaw) &&
          previousStepsRaw >= 0
            ? Math.floor(previousStepsRaw)
            : 0
        const stepsToSave = structurePhases.length

        const stageSnapshots = new Map<number, Record<string, unknown> | null>()
        for (let i = 0; i < structurePhases.length; i++) {
          const stageNumber = i + 1
          const stageRef = doc(
            dbOk,
            TRAIL_STAGES_COLLECTION,
            trailStageDocId(id, stageNumber),
          )
          const stageSnap = await tx.get(stageRef)
          stageSnapshots.set(
            stageNumber,
            stageSnap.exists() ? (stageSnap.data() as Record<string, unknown>) : null,
          )
        }

        tx.update(trailRef, {
          default_total_steps_per_stage: stepsToSave,
          phase_blueprint: structurePhases.map((phase) => ({
            title: phase.title.trim(),
            stage_type: phase.stage_type,
            prompt: phase.stage_type === 'ai' ? phase.prompt.trim() : null,
          })),
          active: trailActiveDraft,
          updated_at: serverTimestamp(),
        })

        for (let i = 0; i < structurePhases.length; i++) {
          const phase = structurePhases[i]
          const stageNumber = i + 1
          const stageRef = doc(
            dbOk,
            TRAIL_STAGES_COLLECTION,
            trailStageDocId(id, stageNumber),
          )
          const previousStage = stageSnapshots.get(stageNumber) ?? null
          tx.set(
            stageRef,
            {
              trail_id: id,
              stage_number: stageNumber,
              title: phase.title.trim(),
              stage_type: phase.stage_type,
              prompt: phase.stage_type === 'ai' ? phase.prompt.trim() : null,
              is_released: typeof previousStage?.is_released === 'boolean' ? previousStage.is_released : false,
              active: typeof previousStage?.active === 'boolean' ? previousStage.active : true,
              created_at: previousStage?.created_at ?? serverTimestamp(),
              updated_at: serverTimestamp(),
            },
            { merge: true },
          )
        }

        const deleteFrom = stepsToSave + 1
        const deleteTo = Math.max(previousSteps, maxCreatedStageNumber)
        for (let stageNumber = deleteFrom; stageNumber <= deleteTo; stageNumber++) {
          const stageRef = doc(
            dbOk,
            TRAIL_STAGES_COLLECTION,
            trailStageDocId(id, stageNumber),
          )
          tx.delete(stageRef)
        }
      })

      setStructureDirty(false)
      if (contentEtapas.length === 0) {
        const defaults = defaultEtapasFromStructure(structurePhases)
        const lastEtapa = defaults.at(-1)
        setContentEtapas(defaults)
        setSelectedEtapaId(lastEtapa?.id ?? null)
        setSelectedQuestionId(lastEtapa?.questions[0]?.id ?? null)
      }
      setContentError(null)
      setActiveTab('content')
    } catch (e) {
      setStructureError(
        e instanceof Error ? e.message : 'Erro ao salvar estrutura da trilha.',
      )
    } finally {
      setSavingStructure(false)
    }
  }

  async function saveTrailContents() {
    if (!db || !id) return
    const dbOk = db
    if (contentEtapas.length === 0) {
      setContentError('Crie pelo menos uma etapa antes de salvar.')
      return
    }
    if (contentEtapas.some((etapa) => etapa.questions.length !== 1)) {
      setContentError(
        'Cada etapa deve ter exatamente 1 questão. Crie novos conteúdos adicionando uma nova etapa.',
      )
      return
    }

    const incomplete = contentEtapas.find((etapa) => {
      const question = etapa.questions[0]
      if (!question) return true
      return question.phases.some((phase) => {
        if (phase.phaseType === 'ai') return !phase.fixedText.trim()
        if (phase.phaseType === 'fixed') return !phase.fixedText.trim()
        return !phase.fixedText.trim()
      })
    })
    if (incomplete) {
      setContentError(
        `Preencha as questões da etapa "${incomplete.name.trim() || 'Sem nome'}" em todas as fases antes de salvar.`,
      )
      return
    }

    setSavingContentDraft(true)
    setContentError(null)
    try {
      const writes: Array<{
        refPath: string
        payload: Record<string, unknown>
      }> = []
      const expectedDocIds = new Set<string>()

      contentEtapas.forEach((etapa, etapaIdx) => {
        const question = etapa.questions[0]
        if (!question) return
        const questionNumber = etapaIdx + 1
        question.phases.forEach((phase, phaseIdx) => {
          const stageNumber = phaseIdx + 1
          const etapaLabel = etapa.name.trim() || `Etapa ${etapaIdx + 1}`
          const questionLabel = question.title.trim() || `Questão ${questionNumber}`
          const contentValue =
            phase.phaseType === 'exercise'
              ? phase.fixedText
              : phase.fixedText.trim()

          writes.push({
            refPath: trailStageQuestionDocId(id, stageNumber, questionNumber),
            payload: {
              trail_id: id,
              stage_number: stageNumber,
              question_number: questionNumber,
              title: `${etapaLabel} — ${questionLabel}`,
              content: contentValue,
              correct_option:
                phase.phaseType === 'exercise'
                  ? phase.correctOption.trim() || null
                  : null,
              is_released: etapa.released,
              active: true,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            },
          })
          expectedDocIds.add(trailStageQuestionDocId(id, stageNumber, questionNumber))
        })
      })

      const deleteDocIds = stageQuestions
        .map((row) => row.id)
        .filter((docId) => !expectedDocIds.has(docId))

      const operations: Array<
        | { type: 'set'; refPath: string; payload: Record<string, unknown> }
        | { type: 'delete'; refPath: string }
      > = [
        ...writes.map((item) => ({ type: 'set' as const, ...item })),
        ...deleteDocIds.map((docId) => ({ type: 'delete' as const, refPath: docId })),
      ]

      const chunkSize = 400
      for (let start = 0; start < operations.length; start += chunkSize) {
        const chunk = operations.slice(start, start + chunkSize)
        const batch = writeBatch(dbOk)
        for (const op of chunk) {
          const ref = doc(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION, op.refPath)
          if (op.type === 'set') {
            batch.set(ref, op.payload, { merge: true })
          } else {
            batch.delete(ref)
          }
        }
        await batch.commit()
      }
      setContentDirty(false)
    } catch (e) {
      setContentError(e instanceof Error ? e.message : 'Erro ao salvar os conteúdos.')
    } finally {
      setSavingContentDraft(false)
    }
  }

  if (!id) {
    return <TrailDetailPageView status="missing-id" />
  }

  const canWrite = Boolean(db)

  const institutionLabel = trail?.institution_id
    ? institutions.find((inst) => inst.id === trail.institution_id)?.name ||
      trail.institution_id
    : '—'

  const cadastro = trail
    ? {
        name: trail.name || 'Trilha',
        id: trail.id,
        subject: trail.subject || '—',
        description: trail.description || '—',
        activeLabel: trail.active ? 'Sim' : 'Não',
        createdAtLabel: formatTrailTs(trail.created_at),
        updatedAtLabel: formatTrailTs(trail.updated_at),
      }
    : null

  const studentTrailRows: TrailDetailStudentTrailRow[] = paginatedStudentTrails.map(
    (row) => {
      const nameFromMap = studentNameById.get(row.student_id)
      return {
        id: row.id,
        studentHref: studentPath(row.student_id),
        studentName: nameFromMap ?? null,
        studentId: row.student_id,
        phoneLabel: studentPhoneById.get(row.student_id) ?? null,
        stageDisplay: row.current_stage_number,
        questionDisplay: row.current_question_number,
        status: row.status,
        startedAtLabel: row.started_at?.toDate
          ? row.started_at.toDate().toLocaleString('pt-BR')
          : '—',
        lastInteractionAtLabel: row.last_interaction_at?.toDate
          ? row.last_interaction_at.toDate().toLocaleString('pt-BR')
          : '—',
        selected: selectedStudentTrailIds.has(row.id),
        selectAriaLabel: `Selecionar ${nameFromMap ?? row.student_id}`,
      }
    },
  )

  return (
    <TrailDetailPageView
      status="ok"
      error={error}
      loading={loading}
      notFound={!trail}
      activeTab={activeTab}
      onActiveTabChange={(tab) => {
        if (tab === 'content') {
          const lastEtapa = contentEtapas.at(-1)
          setSelectedEtapaId(lastEtapa?.id ?? null)
          setSelectedQuestionId(lastEtapa?.questions[0]?.id ?? null)
        }
        setActiveTab(tab)
      }}
      institutionLabel={institutionLabel}
      showTrailForm={showTrailForm}
      onToggleTrailForm={() => setShowTrailForm((open) => !open)}
      cadastro={cadastro}
      editFormSlot={
        trail ? (
          <TrailForm
            docId={id}
            initial={trail}
            onSaved={() => setShowTrailForm(false)}
          />
        ) : null
      }
      loadingStages={loadingStages}
      stagesError={stagesError}
      structureError={structureError}
      structureEditorSlot={
        <TrailStructureEditor
          structurePhases={structurePhases}
          active={trailActiveDraft}
          onToggleActive={(next) => {
            setTrailActiveDraft(next)
            setStructureDirty(true)
          }}
          onAddPhase={addStructurePhase}
          onRemovePhase={removeStructurePhase}
          onUpdatePhase={updateStructurePhase}
          onSubmit={() => void saveStructureAndContinueToContent()}
          submitLabel="Salvar estrutura"
          submitting={savingStructure}
          footerPrompt="Salvar alterações da estrutura da trilha?"
        />
      }
      loadingStageQuestions={loadingStageQuestions}
      stageQuestionsError={stageQuestionsError}
      contentEditorSlot={
        <TrailContentEditor
          contentEtapas={contentEtapas}
          selectedEtapaId={selectedEtapaId}
          selectedQuestionId={selectedQuestionId}
          phaseSaved={phaseSaved}
          saving={savingContentDraft}
          error={contentError}
          bulkPreview={bulkPreview}
          importingBulk={importingBulk}
          hasPendingImportedContent={Boolean(pendingBulkContent?.length)}
          onDownloadTemplate={downloadBulkTemplate}
          onImportFile={(file) => {
            void importBulkTemplate(file)
          }}
          onApplyImportedContent={applyBulkImport}
          onAddEtapa={addEtapa}
          onRemoveEtapa={removeEtapa}
          onSelectEtapa={setSelectedEtapaId}
          onSelectQuestion={setSelectedQuestionId}
          onToggleEtapaReleased={toggleEtapaReleased}
          onUpdateQuestionTitle={updateQuestionTitle}
          onUpdateQuestionPhase={updateQuestionPhase}
          onMarkPhaseSaved={markPhaseSaved}
          onBack={() => {
            setStructureDirty(false)
            setActiveTab('structure')
          }}
          onSave={() => void saveTrailContents()}
          backLabel="Estrutura salva"
          saveLabel="Salvar conteúdos"
        />
      }
      loadingStudentTrails={loadingStudentTrails}
      canExportXlsx={sortedStudentTrails.length > 0}
      onExportXlsx={() => {
        void exportStudentTrailsXlsx()
      }}
      showBulkEditor={showBulkEditor}
      canToggleBulkEditor={sortedStudentTrails.length > 0 && canWrite}
      onToggleBulkEditor={() => setShowBulkEditor((open) => !open)}
      showAddStudentPicker={showAddStudentPicker}
      canAddStudent={Boolean(trail?.institution_id?.trim()) && canWrite}
      onToggleAddStudentPicker={() =>
        setShowAddStudentPicker((open) => !open)
      }
      missingInstitution={!trail?.institution_id?.trim()}
      institutionStudentsError={institutionStudentsError}
      loadingInstitutionStudents={loadingInstitutionStudents}
      studentPickerFilter={studentPickerFilter}
      onStudentPickerFilterChange={setStudentPickerFilter}
      addStudentError={addStudentError}
      institutionStudentsCount={institutionStudents.length}
      eligibleStudentsCount={eligibleStudentsToAdd.length}
      filteredEligibleStudents={filteredEligibleStudents.map((s) => ({
        id: s.id,
        name: s.name || '—',
        isAdding: addingStudentId === s.id,
      }))}
      canMutateStudents={canWrite}
      addingStudentId={addingStudentId}
      onAddStudent={(studentId) => {
        void addStudentToTrail(studentId)
      }}
      bulkStage={bulkStage}
      onBulkStageChange={(value) => {
        setBulkStage(value)
        setBulkSuccess(null)
      }}
      bulkQuestion={bulkQuestion}
      onBulkQuestionChange={(value) => {
        setBulkQuestion(value)
        setBulkSuccess(null)
      }}
      stageOptions={stageOptions}
      questionOptions={questionOptions}
      bulkBusy={bulkBusy}
      selectedCount={selectedStudentTrailIds.size}
      canApplyBulk={
        !bulkBusy &&
        selectedStudentTrailIds.size > 0 &&
        Boolean(bulkStage) &&
        Boolean(bulkQuestion)
      }
      onApplyBulk={() => {
        void applyBulkPosition()
      }}
      bulkError={bulkError}
      bulkSuccess={bulkSuccess}
      studentTrailsError={studentTrailsError}
      hasStudentTrails={sortedStudentTrails.length > 0}
      totalStudentTrailsCount={sortedStudentTrails.length}
      studentSearch={studentSearch}
      onStudentSearchChange={(value) => {
        setStudentSearch(value)
        setStudentTrailsPage(1)
      }}
      filterStage={filterStage}
      onFilterStageChange={(value) => {
        setFilterStage(value)
        setStudentTrailsPage(1)
      }}
      filterQuestion={filterQuestion}
      onFilterQuestionChange={(value) => {
        setFilterQuestion(value)
        setStudentTrailsPage(1)
      }}
      onClearFilters={() => {
        setStudentSearch('')
        setFilterStage('')
        setFilterQuestion('')
        setStudentTrailsPage(1)
      }}
      filteredStudentTrailsCount={filteredStudentTrails.length}
      studentTrailRows={studentTrailRows}
      studentTrailsPage={studentTrailsPage}
      studentTrailsTotalPages={studentTrailsTotalPages}
      studentTrailsPageStart={
        filteredStudentTrails.length === 0
          ? 0
          : (studentTrailsPage - 1) * STUDENT_TRAILS_PAGE_SIZE + 1
      }
      studentTrailsPageEnd={Math.min(
        studentTrailsPage * STUDENT_TRAILS_PAGE_SIZE,
        filteredStudentTrails.length,
      )}
      onPreviousStudentTrailsPage={() =>
        setStudentTrailsPage((page) => Math.max(1, page - 1))
      }
      onNextStudentTrailsPage={() =>
        setStudentTrailsPage((page) => Math.min(studentTrailsTotalPages, page + 1))
      }
      allStudentTrailsSelected={allStudentTrailsSelected}
      onToggleSelectAllStudentTrails={toggleSelectAllStudentTrails}
      onToggleStudentTrailSelection={toggleStudentTrailSelection}
    />
  )
}
