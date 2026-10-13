import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { GabaritoPageView } from '../design/views/GabaritoPageView'
import type {
  GabaritoQuestionRow,
  GabaritoSaveBanner,
  GabaritoSortBy,
  GabaritoSortDir,
} from '../design/types/gabaritoPageView'
import { db } from '../lib/firebase'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import {
  snapshotToTrail,
  TRAILS_COLLECTION,
} from '../lib/trailFirestore'
import {
  snapshotToTrailStage,
  TRAIL_STAGES_COLLECTION,
} from '../lib/trailStageFirestore'
import {
  snapshotToTrailStageQuestion,
  TRAIL_STAGE_QUESTIONS_COLLECTION,
} from '../lib/trailStageQuestionFirestore'
import type { Institution } from '../types/institution'
import type { Trail } from '../types/trail'
import type { TrailStage } from '../types/trailStage'
import type { TrailStageQuestion } from '../types/trailStageQuestion'

const LAST_TRAIL_ID_STORAGE_KEY = 'trilha_admin_gabarito_trail_id'

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; count: number }
  | { kind: 'error'; message: string }

export function GabaritoPage() {
  const [trails, setTrails] = useState<Trail[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loadingTrails, setLoadingTrails] = useState(true)
  const [trailsError, setTrailsError] = useState<string | null>(null)
  const [onlyActiveTrails, setOnlyActiveTrails] = useState(true)
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(() => {
    const saved = window.localStorage.getItem(LAST_TRAIL_ID_STORAGE_KEY)
    return saved?.trim() ? saved : null
  })

  const [stages, setStages] = useState<TrailStage[]>([])
  const [questions, setQuestions] = useState<TrailStageQuestion[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  const [onlyMissing, setOnlyMissing] = useState(false)
  const [onlyAnnulled, setOnlyAnnulled] = useState(false)
  const [filterStage, setFilterStage] = useState<number | ''>('')
  const [filterQuestion, setFilterQuestion] = useState<number | ''>('')
  const [sortBy, setSortBy] = useState<GabaritoSortBy>('stage')
  const [sortDir, setSortDir] = useState<GabaritoSortDir>('asc')
  /** Edições pendentes: docId -> valor digitado de correct_option. */
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' })
  const [annullingId, setAnnullingId] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setLoadingTrails(false)
      return
    }
    const unsubTrails = onSnapshot(
      collection(db, TRAILS_COLLECTION),
      (snap) => {
        const list = snap.docs.map(snapshotToTrail)
        list.sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'pt-BR', {
            sensitivity: 'base',
          }),
        )
        setTrails(list)
        setTrailsError(null)
        setLoadingTrails(false)
      },
      (err) => {
        setTrailsError(err.message)
        setLoadingTrails(false)
      },
    )
    const unsubInstitutions = onSnapshot(
      collection(db, INSTITUTIONS_COLLECTION),
      (snap) => {
        setInstitutions(snap.docs.map(snapshotToInstitution))
      },
      () => {
        setInstitutions([])
      },
    )
    return () => {
      unsubTrails()
      unsubInstitutions()
    }
  }, [])

  const institutionNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const inst of institutions) {
      map.set(inst.id, inst.name?.trim() || inst.id)
    }
    return map
  }, [institutions])

  const visibleTrails = useMemo(
    () => (onlyActiveTrails ? trails.filter((t) => t.active) : trails),
    [trails, onlyActiveTrails],
  )

  useEffect(() => {
    if (!selectedTrailId) return
    if (!loadingTrails && !visibleTrails.some((t) => t.id === selectedTrailId)) {
      setSelectedTrailId(null)
    }
  }, [selectedTrailId, visibleTrails, loadingTrails])

  useEffect(() => {
    if (!selectedTrailId?.trim()) return
    window.localStorage.setItem(LAST_TRAIL_ID_STORAGE_KEY, selectedTrailId)
  }, [selectedTrailId])

  useEffect(() => {
    let unsubStages: (() => void) | null = null
    let unsubQuestions: (() => void) | null = null

    setDrafts({})
    setSaveState({ kind: 'idle' })
    setFilterStage('')
    setFilterQuestion('')
    setOnlyMissing(false)
    setOnlyAnnulled(false)
    setSortBy('stage')
    setSortDir('asc')
    setAnnullingId(null)

    if (!db || !selectedTrailId) {
      setStages([])
      setQuestions([])
      setDataError(null)
      setLoadingData(false)
      return
    }

    setLoadingData(true)

    unsubStages = onSnapshot(
      query(
        collection(db, TRAIL_STAGES_COLLECTION),
        where('trail_id', '==', selectedTrailId),
      ),
      (snap) => {
        setStages(snap.docs.map(snapshotToTrailStage))
        setDataError(null)
      },
      (err) => {
        setDataError(err.message)
        setStages([])
      },
    )

    unsubQuestions = onSnapshot(
      query(
        collection(db, TRAIL_STAGE_QUESTIONS_COLLECTION),
        where('trail_id', '==', selectedTrailId),
      ),
      (snap) => {
        setQuestions(snap.docs.map(snapshotToTrailStageQuestion))
        setDataError(null)
        setLoadingData(false)
      },
      (err) => {
        setDataError(err.message)
        setQuestions([])
        setLoadingData(false)
      },
    )

    return () => {
      unsubStages?.()
      unsubQuestions?.()
    }
  }, [selectedTrailId])

  const stageTypeByNumber = useMemo(() => {
    const map = new Map<number, TrailStage>()
    for (const s of stages) map.set(s.stage_number, s)
    return map
  }, [stages])

  const exerciseQuestions = useMemo(() => {
    const list = questions.filter(
      (q) => stageTypeByNumber.get(q.stage_number)?.stage_type === 'exercise',
    )
    list.sort((a, b) =>
      a.stage_number !== b.stage_number
        ? a.stage_number - b.stage_number
        : a.question_number - b.question_number,
    )
    return list
  }, [questions, stageTypeByNumber])

  const missingCount = useMemo(
    () =>
      exerciseQuestions.filter(
        (q) => !q.annulled && !(q.correct_option ?? '').trim(),
      ).length,
    [exerciseQuestions],
  )

  const annulledCount = useMemo(
    () => exerciseQuestions.filter((q) => q.annulled).length,
    [exerciseQuestions],
  )

  const availableStages = useMemo(() => {
    const nums = new Set(exerciseQuestions.map((q) => q.stage_number))
    return [...nums].sort((a, b) => a - b)
  }, [exerciseQuestions])

  const availableQuestions = useMemo(() => {
    const source =
      filterStage !== ''
        ? exerciseQuestions.filter((q) => q.stage_number === filterStage)
        : exerciseQuestions
    const nums = new Set(source.map((q) => q.question_number))
    return [...nums].sort((a, b) => a - b)
  }, [exerciseQuestions, filterStage])

  useEffect(() => {
    if (
      filterQuestion !== '' &&
      !availableQuestions.includes(filterQuestion)
    ) {
      setFilterQuestion('')
    }
  }, [availableQuestions, filterQuestion])

  const visibleQuestions = useMemo(() => {
    let list = exerciseQuestions
    if (onlyAnnulled) {
      list = list.filter((q) => q.annulled)
    } else if (onlyMissing) {
      list = list.filter(
        (q) => !q.annulled && !(q.correct_option ?? '').trim(),
      )
    }
    if (filterStage !== '') {
      list = list.filter((q) => q.stage_number === filterStage)
    }
    if (filterQuestion !== '') {
      list = list.filter((q) => q.question_number === filterQuestion)
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'stage') {
        cmp = a.stage_number - b.stage_number
        if (cmp === 0) cmp = a.question_number - b.question_number
      } else {
        cmp = a.question_number - b.question_number
        if (cmp === 0) cmp = a.stage_number - b.stage_number
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [
    exerciseQuestions,
    onlyMissing,
    onlyAnnulled,
    filterStage,
    filterQuestion,
    sortBy,
    sortDir,
  ])

  /** Valor exibido no input: rascunho se existir, senão o salvo. */
  function inputValue(q: TrailStageQuestion): string {
    return drafts[q.id] ?? q.correct_option ?? ''
  }

  function isDirty(q: TrailStageQuestion): boolean {
    if (!(q.id in drafts)) return false
    return drafts[q.id].trim() !== (q.correct_option ?? '').trim()
  }

  const dirtyQuestions = useMemo(
    () => exerciseQuestions.filter((q) => !q.annulled && isDirty(q)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exerciseQuestions, drafts],
  )

  function validateDraft(q: TrailStageQuestion, value: string): string | null {
    const v = value.trim()
    if (!v) return null
    if (q.options && q.options.length > 0) {
      const keys = q.options.map((o) => o.key)
      if (!keys.includes(v)) {
        return `Deve ser uma das alternativas: ${keys.join(', ')}`
      }
    }
    return null
  }

  const validationErrors = useMemo(() => {
    const errs = new Map<string, string>()
    for (const q of dirtyQuestions) {
      const err = validateDraft(q, drafts[q.id] ?? '')
      if (err) errs.set(q.id, err)
    }
    return errs
  }, [dirtyQuestions, drafts])

  async function handleSaveAll() {
    if (!db) return
    if (dirtyQuestions.length === 0) return
    if (validationErrors.size > 0) {
      setSaveState({
        kind: 'error',
        message: 'Corrija os campos destacados antes de salvar.',
      })
      return
    }

    setSaveState({ kind: 'saving' })
    try {
      const dbOk = db
      await Promise.all(
        dirtyQuestions.map((q) => {
          const v = (drafts[q.id] ?? '').trim()
          return updateDoc(doc(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION, q.id), {
            correct_option: v || null,
            updated_at: serverTimestamp(),
          })
        }),
      )
      const count = dirtyQuestions.length
      setDrafts({})
      setSaveState({ kind: 'saved', count })
    } catch (err) {
      setSaveState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Erro ao salvar.',
      })
    }
  }

  async function handleToggleAnnulled(questionId: string) {
    if (!db) return
    const q = exerciseQuestions.find((item) => item.id === questionId)
    if (!q) return

    if (q.annulled) {
      const ok = window.confirm(
        `Desanular a questão s${q.stage_number} q${q.question_number}? Ela voltará a contar no gabarito.`,
      )
      if (!ok) return
      setAnnullingId(questionId)
      try {
        await updateDoc(doc(db, TRAIL_STAGE_QUESTIONS_COLLECTION, questionId), {
          annulled: false,
          annulled_at: null,
          annulled_reason: null,
          updated_at: serverTimestamp(),
        })
        setSaveState({ kind: 'idle' })
      } catch (err) {
        setSaveState({
          kind: 'error',
          message:
            err instanceof Error ? err.message : 'Erro ao desanular questão.',
        })
      } finally {
        setAnnullingId(null)
      }
      return
    }

    const reasonRaw = window.prompt(
      `Motivo da anulação (s${q.stage_number} q${q.question_number}). A questão não contará como acerto nem erro.`,
      q.annulled_reason ?? '',
    )
    if (reasonRaw === null) return
    const reason = reasonRaw.trim()
    if (!reason) {
      setSaveState({
        kind: 'error',
        message: 'Informe um motivo para anular a questão.',
      })
      return
    }

    setAnnullingId(questionId)
    try {
      await updateDoc(doc(db, TRAIL_STAGE_QUESTIONS_COLLECTION, questionId), {
        annulled: true,
        annulled_at: serverTimestamp(),
        annulled_reason: reason,
        updated_at: serverTimestamp(),
      })
      setDrafts((d) => {
        if (!(questionId in d)) return d
        const next = { ...d }
        delete next[questionId]
        return next
      })
      setSaveState({ kind: 'idle' })
    } catch (err) {
      setSaveState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Erro ao anular questão.',
      })
    } finally {
      setAnnullingId(null)
    }
  }

  const selectedTrail = useMemo(
    () => trails.find((t) => t.id === selectedTrailId) ?? null,
    [trails, selectedTrailId],
  )

  function toggleSort(column: GabaritoSortBy) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
  }

  const saveBanner: GabaritoSaveBanner =
    saveState.kind === 'saved'
      ? {
          kind: 'saved',
          message:
            saveState.count === 1
              ? 'Gabarito de 1 questão salvo.'
              : `Gabarito de ${saveState.count} questões salvo.`,
        }
      : saveState.kind === 'error'
        ? { kind: 'error', message: saveState.message }
        : saveState.kind === 'saving'
          ? { kind: 'saving' }
          : { kind: 'idle' }

  const filtersSummaryParts: string[] = []
  if (exerciseQuestions.length === 0) {
    filtersSummaryParts.push('Nenhuma questão de exercício nesta trilha.')
  } else {
    if (missingCount === 0) {
      filtersSummaryParts.push(
        `Todas as questões não anuladas têm gabarito (${exerciseQuestions.length} no total).`,
      )
    } else {
      filtersSummaryParts.push(
        `${missingCount} de ${exerciseQuestions.length} sem gabarito.`,
      )
    }
    if (annulledCount > 0) {
      filtersSummaryParts.push(
        `${annulledCount} anulada${annulledCount === 1 ? '' : 's'}.`,
      )
    }
  }
  if (
    visibleQuestions.length !== exerciseQuestions.length &&
    exerciseQuestions.length > 0
  ) {
    filtersSummaryParts.push(`Exibindo ${visibleQuestions.length}.`)
  }
  const filtersSummary = filtersSummaryParts.join(' ')

  const emptyMessage =
    exerciseQuestions.length === 0
      ? 'Esta trilha não tem questões em stages do tipo exercise.'
      : onlyAnnulled
        ? 'Nenhuma questão anulada com os filtros atuais.'
        : onlyMissing
          ? 'Nenhuma questão sem gabarito com os filtros atuais.'
          : 'Nenhuma questão corresponde aos filtros.'

  const rows: GabaritoQuestionRow[] = visibleQuestions.map((q) => {
    const saved = (q.correct_option ?? '').trim()
    const value = inputValue(q)
    const dirty = isDirty(q)
    const err = !q.annulled && dirty ? validateDraft(q, value) : null
    const filled = dirty ? value.trim() !== '' : saved !== ''
    return {
      id: q.id,
      stageNumber: q.stage_number,
      questionNumber: q.question_number,
      title: q.title || '—',
      content: q.content || '—',
      inputValue: value,
      placeholder:
        q.options && q.options.length > 0
          ? `Ex.: ${q.options[0].key}`
          : 'Resposta correta',
      ariaLabel: `Resposta correta de stage ${q.stage_number} questão ${q.question_number}`,
      inputError: err,
      inputDisabled: q.annulled || annullingId === q.id,
      statusBadge: q.annulled
        ? 'anulada'
        : filled
          ? dirty
            ? 'editado'
            : 'preenchido'
          : 'faltando',
      annulledReason: q.annulled_reason,
      annulled: q.annulled,
    }
  })

  return (
    <GabaritoPageView
      loadingTrails={loadingTrails}
      trailOptions={visibleTrails.map((t) => {
        const instName =
          institutionNameById.get(t.institution_id) || t.institution_id || '—'
        return {
          id: t.id,
          label: `${t.name || t.id} · ${instName}${t.active ? '' : ' (inativa)'}`,
        }
      })}
      selectedTrailId={selectedTrailId}
      onSelectTrail={setSelectedTrailId}
      onlyActiveTrails={onlyActiveTrails}
      onOnlyActiveTrailsChange={setOnlyActiveTrails}
      trailsError={trailsError}
      selectedTrailName={selectedTrail?.name?.trim() || 'Trilha'}
      loadingData={loadingData}
      saveDisabled={saveState.kind === 'saving' || dirtyQuestions.length === 0}
      saveButtonLabel={
        saveState.kind === 'saving'
          ? 'Salvando…'
          : dirtyQuestions.length > 0
            ? `Salvar alterações (${dirtyQuestions.length})`
            : 'Salvar alterações'
      }
      onSaveAll={() => void handleSaveAll()}
      dataError={dataError}
      saveBanner={saveBanner}
      onlyMissing={onlyMissing}
      onOnlyMissingChange={(checked) => {
        setOnlyMissing(checked)
        if (checked) setOnlyAnnulled(false)
      }}
      onlyAnnulled={onlyAnnulled}
      onOnlyAnnulledChange={(checked) => {
        setOnlyAnnulled(checked)
        if (checked) setOnlyMissing(false)
      }}
      filterStage={filterStage}
      onFilterStageChange={setFilterStage}
      filterQuestion={filterQuestion}
      onFilterQuestionChange={setFilterQuestion}
      availableStages={availableStages.map((n) => ({
        value: n,
        label: `Stage ${n}`,
      }))}
      availableQuestions={availableQuestions.map((n) => ({
        value: n,
        label: `Questão ${n}`,
      }))}
      filtersSummary={filtersSummary}
      sortBy={sortBy}
      sortDir={sortDir}
      onToggleSort={toggleSort}
      rows={rows}
      emptyMessage={emptyMessage}
      onDraftChange={(questionId, value) => {
        setDrafts((d) => ({
          ...d,
          [questionId]: value,
        }))
        if (saveState.kind === 'saved') {
          setSaveState({ kind: 'idle' })
        }
      }}
      onToggleAnnulled={(questionId) => {
        void handleToggleAnnulled(questionId)
      }}
      annullingId={annullingId}
    />
  )
}
