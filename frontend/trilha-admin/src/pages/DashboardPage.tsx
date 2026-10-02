import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import type * as XLSX from 'xlsx'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { DashboardPageView } from '../design/views/DashboardPageView'
import {
  DASHBOARD_STUDENT_COLUMNS,
  type DashboardPillRowView,
  type DashboardStudentChartFilter,
  type DashboardStudentColumnKey,
  type DashboardStudentSortKey,
  type DashboardTab,
} from '../design/types/dashboardPageView'
import { db } from '../lib/firebase'
import {
  EMPTY_AGENT_USAGE,
  formatAgentLastActivity,
  messagesPerTutorPerDay,
  type AgentUsagePeriodDays,
  type AgentUsageView,
} from '../lib/agentUsage'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import { snapshotToStudent, STUDENTS_COLLECTION } from '../lib/studentFirestore'
import {
  snapshotToStudentTrail,
  STUDENT_TRAILS_COLLECTION,
} from '../lib/studentTrailFirestore'
import { snapshotToTrail, TRAILS_COLLECTION } from '../lib/trailFirestore'
import {
  snapshotToTrailStage,
  TRAIL_STAGES_COLLECTION,
} from '../lib/trailStageFirestore'
import {
  snapshotToTrailStageQuestion,
  TRAIL_STAGE_QUESTIONS_COLLECTION,
} from '../lib/trailStageQuestionFirestore'
import {
  fetchDashboardKpisSummary,
  fetchDashboardLogSummary,
} from '../lib/dashboardSummaryApi'
import {
  buildForcedCompletionLookup,
  collectForcedCompletions,
  FORCED_COMPLETION_EXPORT_LESSON_LABEL,
  FORCED_COMPLETION_EXPORT_TOPIC_LABEL,
  upsertForcedCompletionMarker,
  type ForcedCompletionTarget,
} from '../lib/forcedLessonCompletion'
import { loadXlsx } from '../lib/loadXlsx'
import { studentPath, trailPath } from '../lib/paths'
import { usePermissions } from '../hooks/usePermissions'
import { situationFromProgress } from '../lib/studentSituation'
import { pickContentExerciseExtrema } from '../lib/contentExerciseExtrema'
import type { ContentExercisePick } from '../lib/contentExerciseExtrema'
import type { Institution } from '../types/institution'
import type { Student } from '../types/student'
import type { StudentTrail } from '../types/studentTrail'
import type { Trail } from '../types/trail'
import type { TrailStage } from '../types/trailStage'
import type { TrailStageQuestion } from '../types/trailStageQuestion'

const LAST_INSTITUTION_ID_STORAGE_KEY = 'trilha_admin_selected_institution_id'
const STUDENTS_PAGE_SIZE = 20
const PILLS_PAGE_SIZE = 20
const ALL_STUDENT_COLUMNS = DASHBOARD_STUDENT_COLUMNS

type StudentColumnKey = DashboardStudentColumnKey
type StudentSortKey = DashboardStudentSortKey

type StudentRow = {
  student: Student
  released: number
  done: number
  completionPct: number | null
  lessonsReleased: number
  lessonsDone: number
  lessonsCompletionPct: number | null
  correct: number
  wrong: number
  accuracyPct: number | null
}

type StudentEngagementStatus = 'notStarted' | 'inProgress' | 'completed'

function getStudentEngagementStatus(
  row: StudentRow,
): StudentEngagementStatus {
  const completion = row.completionPct
  if (row.released === 0 || completion === null || completion <= 0) {
    return 'notStarted'
  }
  return completion >= 100 ? 'completed' : 'inProgress'
}

function getCompletionBucketKey(completion: number | null): string | null {
  if (completion === null) return null
  if (completion <= 20) return '0-20'
  if (completion <= 40) return '21-40'
  if (completion <= 60) return '41-60'
  if (completion <= 80) return '61-80'
  return '81-100'
}

type PillRow = {
  key: string
  trailId: string
  trailName: string
  subject: string
  stageNumber: number
  questionNumber: number
  title: string
  content: string
  gabarito: string
  total: number
  correct: number
  wrong: number
  accuracyPct: number
}

type PillSortKey =
  | 'trail'
  | 'position'
  | 'total'
  | 'correct'
  | 'wrong'
  | 'accuracyPct'

function compareNullableNumber(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a - b
}

function pct(num: number, den: number): number | null {
  if (den <= 0) return null
  return Math.round((num / den) * 100)
}

function formatPctExport(v: number | null): string {
  return v === null ? '' : `${v}%`
}

function slugFileName(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'trilha'
  )
}

/** Cabeçalho de coluna na planilha: aula (A) × tópico da aula (T). */
function lessonTopicColumn(topicNumber: number, lessonNumber: number): string {
  return `A${lessonNumber}.T${topicNumber}`
}

function lessonTopicColumnLabel(
  trailId: string,
  topicNumber: number,
  lessonNumber: number,
  stageByKey: Map<string, TrailStage>,
): string {
  const code = lessonTopicColumn(topicNumber, lessonNumber)
  const stageTitle = stageByKey.get(`${trailId}|${topicNumber}`)?.title?.trim()
  return stageTitle ? `${code} - ${stageTitle}` : code
}

const FIRESTORE_IN_LIMIT = 30

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function normalizeAnswer(value: string): string {
  let s = value.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

function answersMatch(studentAnswer: string, correctOption: string): boolean {
  return (
    normalizeAnswer(studentAnswer).toLowerCase() ===
    normalizeAnswer(correctOption).toLowerCase()
  )
}

/** Exibe gabarito numérico como letra: 1→A, 2→B, 3→C. */
function formatGabaritoLetter(value: string): string {
  const normalized = normalizeAnswer(value).toLowerCase()
  if (!normalized) return '—'
  const fromNumber: Record<string, string> = {
    '1': 'A',
    '2': 'B',
    '3': 'C',
  }
  if (fromNumber[normalized]) return fromNumber[normalized]
  const upper = normalized.toUpperCase()
  if (upper === 'A' || upper === 'B' || upper === 'C') return upper
  return upper
}

type LogAggregates = {
  doneByStudent: Map<string, Set<string>>
  answerMap: Map<string, string>
}

function scoreStudentFromAnswerMap(
  studentId: string,
  enrolledTrailIds: Set<string>,
  answerMap: Map<string, string>,
  stageByKey: Map<string, TrailStage>,
  questionByKey: Map<string, TrailStageQuestion>,
  deselectedStages: Set<string>,
  deselectedQuestions: Set<number>,
): { correct: number; wrong: number } {
  let correct = 0
  let wrong = 0
  const prefix = `${studentId}|`

  for (const [key, answer] of answerMap) {
    if (!key.startsWith(prefix) || !answer.trim()) continue

    const rest = key.slice(prefix.length)
    const sep1 = rest.indexOf('|')
    const sep2 = rest.indexOf('|', sep1 + 1)
    if (sep1 < 0 || sep2 < 0) continue

    const trailId = rest.slice(0, sep1)
    const stage = Number(rest.slice(sep1 + 1, sep2))
    const question = Number(rest.slice(sep2 + 1))
    if (!Number.isFinite(stage) || !Number.isFinite(question)) continue
    if (!enrolledTrailIds.has(trailId)) continue
    if (deselectedStages.has(`${trailId}|${stage}`)) continue
    if (deselectedQuestions.has(question)) continue

    const stageRec = stageByKey.get(`${trailId}|${stage}`)
    if (stageRec?.stage_type !== 'exercise') continue

    const questionRec = questionByKey.get(`${trailId}|${stage}|${question}`)
    // Questão anulada: fora do denominador (nem acerto nem erro).
    if (questionRec?.annulled === true) continue
    const gabarito = (questionRec?.correct_option ?? '').trim()
    if (!gabarito) continue

    if (answersMatch(answer, gabarito)) correct += 1
    else wrong += 1
  }

  return { correct, wrong }
}

const DATA_SOURCES = 3
/**
 * Gate inicial da Visão geral: alunos/trilhas + mode=kpis.
 * Meta + summary full só depois do primeiro clique num KPI.
 */
const INITIAL_LOAD_STEPS = DATA_SOURCES + 1

const EMPTY_LOG_AGGREGATES: LogAggregates = {
  doneByStudent: new Map(),
  answerMap: new Map(),
}

type XlsxModule = typeof import('xlsx')

function forceWorksheetCellString(
  xlsx: XlsxModule,
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number,
  value: string,
) {
  const ref = xlsx.utils.encode_cell({ r: row, c: col })
  worksheet[ref] = { t: 's', v: value }
}

const CORRESPONDENCE_HEADERS = ['Código', 'Tópico da aula', 'Enunciado'] as const

function buildTrailCorrespondenceRows(
  trailId: string,
  positions: { stage: number; question: number }[],
  stageByKey: Map<string, TrailStage>,
  questionByKey: Map<string, TrailStageQuestion>,
): string[][] {
  return positions.map((p) => {
    const question = questionByKey.get(`${trailId}|${p.stage}|${p.question}`)
    return [
      lessonTopicColumn(p.stage, p.question),
      stageByKey.get(`${trailId}|${p.stage}`)?.title?.trim() ?? '',
      (question?.content ?? question?.title ?? '').trim(),
    ]
  })
}

function appendCorrespondenceSheet(
  xlsx: XlsxModule,
  workbook: XLSX.WorkBook,
  trailId: string,
  positions: { stage: number; question: number }[],
  stageByKey: Map<string, TrailStage>,
  questionByKey: Map<string, TrailStageQuestion>,
) {
  const legendRows = buildTrailCorrespondenceRows(
    trailId,
    positions,
    stageByKey,
    questionByKey,
  )
  const legendSheet = xlsx.utils.aoa_to_sheet([
    [...CORRESPONDENCE_HEADERS],
    ...legendRows,
  ])
  CORRESPONDENCE_HEADERS.forEach((header, colIndex) => {
    forceWorksheetCellString(xlsx, legendSheet, 0, colIndex, header)
  })
  legendRows.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value.length > 0) {
        forceWorksheetCellString(xlsx, legendSheet, rowIndex + 1, colIndex, value)
      }
    })
  })
  xlsx.utils.book_append_sheet(workbook, legendSheet, 'Correspondência')
}

type TopicPosition = { stage: number; question: number }

function filterTrailTopicPositions(
  trailId: string,
  positions: TopicPosition[],
  deselectedStages: Set<string>,
  deselectedQuestions: Set<number>,
): TopicPosition[] {
  return positions.filter(
    (p) =>
      !deselectedStages.has(`${trailId}|${p.stage}`) &&
      !deselectedQuestions.has(p.question),
  )
}

function groupTopicsByLesson(positions: TopicPosition[]): Map<number, TopicPosition[]> {
  const byQuestion = new Map<number, TopicPosition[]>()
  for (const p of positions) {
    const arr = byQuestion.get(p.question)
    if (arr) arr.push(p)
    else byQuestion.set(p.question, [p])
  }
  return byQuestion
}

function isLessonCompleteForTrail(
  trailId: string,
  topics: TopicPosition[],
  studentDone: Set<string>,
): boolean {
  // Com a regra de conclusão forçada, o último tópico não-exercício já entra
  // em `studentDone` via `collectForcedCompletions` antes desta checagem.
  return topics.every((p) =>
    studentDone.has(`${trailId}|${p.stage}|${p.question}`),
  )
}

function computeLessonMetricsForTrails(
  trailIds: Iterable<string>,
  questionsByTrail: Map<string, TopicPosition[]>,
  studentDone: Set<string>,
  deselectedStages: Set<string>,
  deselectedQuestions: Set<number>,
): { lessonsReleased: number; lessonsDone: number; lessonsCompletionPct: number | null } {
  const releasedKeys = new Set<string>()
  const doneKeys = new Set<string>()

  for (const trailId of trailIds) {
    const selected = filterTrailTopicPositions(
      trailId,
      questionsByTrail.get(trailId) ?? [],
      deselectedStages,
      deselectedQuestions,
    )
    for (const [questionNumber, topics] of groupTopicsByLesson(selected)) {
      if (topics.length === 0) continue
      const lessonKey = `${trailId}|${questionNumber}`
      releasedKeys.add(lessonKey)
      if (isLessonCompleteForTrail(trailId, topics, studentDone)) {
        doneKeys.add(lessonKey)
      }
    }
  }

  const lessonsReleased = releasedKeys.size
  const lessonsDone = doneKeys.size
  return {
    lessonsReleased,
    lessonsDone,
    lessonsCompletionPct: pct(lessonsDone, lessonsReleased),
  }
}

function trailLessonNumbers(
  trailId: string,
  questionsByTrail: Map<string, TopicPosition[]>,
  deselectedStages: Set<string>,
  deselectedQuestions: Set<number>,
): number[] {
  const selected = filterTrailTopicPositions(
    trailId,
    questionsByTrail.get(trailId) ?? [],
    deselectedStages,
    deselectedQuestions,
  )
  return [...groupTopicsByLesson(selected).keys()].sort((a, b) => a - b)
}

function appendLessonsProgressSheet(
  xlsx: XlsxModule,
  workbook: XLSX.WorkBook,
  trail: Trail,
  students: Student[],
  questionsByTrail: Map<string, TopicPosition[]>,
  doneByStudent: Map<string, Set<string>>,
  deselectedStages: Set<string>,
  deselectedQuestions: Set<number>,
  forcedLookup: Set<string>,
) {
  const lessonNumbers = trailLessonNumbers(
    trail.id,
    questionsByTrail,
    deselectedStages,
    deselectedQuestions,
  )
  const lessonHeaders = lessonNumbers.map((n) => `A${n}`)
  const headers = [
    'Nome',
    'Telefone',
    ...lessonHeaders,
    'Qtd aulas',
    'Qtd realizadas',
    '% aulas',
  ]

  const sortedStudents = [...students].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'pt-BR', {
      sensitivity: 'base',
    }),
  )

  const rows = sortedStudents.map((student) => {
    const studentDone = doneByStudent.get(student.id) ?? new Set()
    const metrics = computeLessonMetricsForTrails(
      [trail.id],
      questionsByTrail,
      studentDone,
      deselectedStages,
      deselectedQuestions,
    )
    const byQuestion = groupTopicsByLesson(
      filterTrailTopicPositions(
        trail.id,
        questionsByTrail.get(trail.id) ?? [],
        deselectedStages,
        deselectedQuestions,
      ),
    )
    const lessonCells = lessonNumbers.map((n) => {
      const topics = byQuestion.get(n) ?? []
      if (topics.length === 0) return ''
      if (!isLessonCompleteForTrail(trail.id, topics, studentDone)) return 'Não'
      const wasForced = topics.some((p) =>
        forcedLookup.has(
          `${student.id}|${trail.id}|${p.stage}|${p.question}`,
        ),
      )
      return wasForced ? FORCED_COMPLETION_EXPORT_LESSON_LABEL : 'Sim'
    })
    return [
      student.name || student.id,
      student.phone_number || '',
      ...lessonCells,
      metrics.lessonsReleased,
      metrics.lessonsDone,
      formatPctExport(metrics.lessonsCompletionPct),
    ]
  })

  const sheet = xlsx.utils.aoa_to_sheet([headers, ...rows])
  headers.forEach((header, colIndex) => {
    forceWorksheetCellString(xlsx, sheet, 0, colIndex, header)
  })
  rows.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (typeof value === 'string' && value.length > 0) {
        forceWorksheetCellString(xlsx, sheet, rowIndex + 1, colIndex, value)
      }
    })
  })
  xlsx.utils.book_append_sheet(workbook, sheet, 'Aulas')
}

export function DashboardPage() {
  const { filterInstitutions } = usePermissions()
  const [activeTab, setActiveTab] = useState<DashboardTab>('students')
  const [questionsDataEnabled, setQuestionsDataEnabled] = useState(false)
  const [isQuestionsPending, startQuestionsTransition] = useTransition()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loadingInst, setLoadingInst] = useState(true)
  const [instError, setInstError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const saved = window.localStorage.getItem(LAST_INSTITUTION_ID_STORAGE_KEY)
    return saved?.trim() ? saved : null
  })

  const [students, setStudents] = useState<Student[]>([])
  const [trails, setTrails] = useState<Trail[]>([])
  const [studentTrails, setStudentTrails] = useState<StudentTrail[]>([])
  const [logAggregates, setLogAggregates] = useState<LogAggregates>(
    EMPTY_LOG_AGGREGATES,
  )
  const [stages, setStages] = useState<TrailStage[]>([])
  const [questions, setQuestions] = useState<TrailStageQuestion[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [, setLoadingLogs] = useState(false)
  const [loadStepsDone, setLoadStepsDone] = useState(0)
  const [loadStepsTotal, setLoadStepsTotal] = useState(INITIAL_LOAD_STEPS)
  const [loadPercent, setLoadPercent] = useState(0)
  const [loadLabel, setLoadLabel] = useState('')
  const [dataError, setDataError] = useState<string | null>(null)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [logsRetryKey, setLogsRetryKey] = useState(0)
  const [agentUsage, setAgentUsage] =
    useState<AgentUsageView>(EMPTY_AGENT_USAGE)
  const [agentPeriodDays, setAgentPeriodDays] =
    useState<AgentUsagePeriodDays>(30)
  const [selectedAgentTrailId, setSelectedAgentTrailId] = useState<
    string | null
  >(null)
  const [agentUsageLoading, setAgentUsageLoading] = useState(false)
  const [agentUsagePresent, setAgentUsagePresent] = useState(true)
  /** mode=kpis chegou — libera empty state + cards. */
  const [initialKpisLoaded, setInitialKpisLoaded] = useState(false)
  const initialKpisLoadedRef = useRef(false)
  /** Usuário pediu detalhe (clique num KPI) — dispara meta + mode=full. */
  const [detailRequested, setDetailRequested] = useState(false)
  const [fullDetailLoaded, setFullDetailLoaded] = useState(false)
  const fullDetailLoadedRef = useRef(false)
  const [fullDetailLoading, setFullDetailLoading] = useState(false)
  const dashboardLoadStartedAtRef = useRef(0)
  const loadProgressRef = useRef({ done: 0, total: INITIAL_LOAD_STEPS })
  const loadTargetPercentRef = useRef(0)

  const computeLoadPercent = (done: number, total: number, complete = false) => {
    if (complete) return 100
    if (total <= 0) return 0
    return Math.min(99, Math.round((done / total) * 100))
  }

  const syncLoadProgress = (label: string, options?: { complete?: boolean }) => {
    const { done, total } = loadProgressRef.current
    const pct = computeLoadPercent(done, total, options?.complete)
    loadTargetPercentRef.current = pct
    setLoadStepsDone(done)
    setLoadStepsTotal(total)
    setLoadLabel(label)
    if (options?.complete) {
      setLoadPercent(100)
    }
  }

  // Filtros da tabela de alunos
  const [nameFilter, setNameFilter] = useState('')
  const [pctMin, setPctMin] = useState(0)
  const [pctMax, setPctMax] = useState(100)
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null)
  const [selectedContentKey, setSelectedContentKey] = useState<string | null>(
    null,
  )
  const [opportunityTab, setOpportunityTab] = useState<'err' | 'duv' | 'hit'>(
    'err',
  )
  const [rankingWeights, setRankingWeights] = useState({
    progress: 100 / 3,
    interact: 100 / 3,
    accuracy: 100 / 3,
  })
  const [showAllRanking, setShowAllRanking] = useState(false)
  const [selectedMatrixCellKey, setSelectedMatrixCellKey] = useState<
    string | null
  >(null)
  const [studentChartFilter, setStudentChartFilter] =
    useState<DashboardStudentChartFilter | null>(null)
  const [hiddenColumns, setHiddenColumns] = useState<Set<StudentColumnKey>>(
    new Set(),
  )
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  /** Stages desmarcados (excluídos do cálculo). Vazio = todos incluídos. */
  const [deselectedStages, setDeselectedStages] = useState<Set<string>>(
    new Set(),
  )
  /** Questões desmarcadas (número da questão no stage). Vazio = todas incluídas. */
  const [deselectedQuestions, setDeselectedQuestions] = useState<Set<number>>(
    new Set(),
  )
  const [showStagePicker, setShowStagePicker] = useState(false)
  const [showQuestionPicker, setShowQuestionPicker] = useState(false)
  const [exportingTrailId, setExportingTrailId] = useState<string | null>(null)
  const [exportingPillTrailId, setExportingPillTrailId] = useState<string | null>(
    null,
  )
  const [exportError, setExportError] = useState<string | null>(null)
  const [studentSort, setStudentSort] = useState<{
    key: StudentSortKey
    dir: 'asc' | 'desc'
  }>({ key: 'name', dir: 'asc' })
  const [studentPage, setStudentPage] = useState(1)

  // Filtros do ranking de pílulas / aba Questões
  const [pillSearch, setPillSearch] = useState('')
  const [pillTrailFilter, setPillTrailFilter] = useState('')
  const [pillMinResponses, setPillMinResponses] = useState(1)
  const [pillAccMin, setPillAccMin] = useState(0)
  const [pillAccMax, setPillAccMax] = useState(100)
  const [pillPage, setPillPage] = useState(1)
  const [pillSort, setPillSort] = useState<{
    key: PillSortKey
    dir: 'asc' | 'desc'
  }>({ key: 'accuracyPct', dir: 'asc' })
  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!db) {
        setLoadingInst(false)
        return
      }
      try {
        const snap = await getDocs(collection(db, INSTITUTIONS_COLLECTION))
        if (cancelled) return
        setInstitutions(snap.docs.map(snapshotToInstitution))
        setInstError(null)
        setLoadingInst(false)
      } catch (err) {
        if (cancelled) return
        setInstError(err instanceof Error ? err.message : 'Erro ao carregar instituições.')
        setLoadingInst(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedId?.trim()) return
    window.localStorage.setItem(LAST_INSTITUTION_ID_STORAGE_KEY, selectedId)
  }, [selectedId])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== LAST_INSTITUTION_ID_STORAGE_KEY) return
      const next = e.newValue?.trim() || null
      setSelectedId(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!db || !selectedId) {
        setStudents([])
        setTrails([])
        setStudentTrails([])
        setLogAggregates(EMPTY_LOG_AGGREGATES)
        setAgentUsage(EMPTY_AGENT_USAGE)
        setAgentUsagePresent(true)
        setDataError(null)
        setLogsError(null)
        setLoadingData(false)
        setLoadingMeta(false)
        setLoadingLogs(false)
        setInitialKpisLoaded(false)
        initialKpisLoadedRef.current = false
        setDetailRequested(false)
        setFullDetailLoaded(false)
        fullDetailLoadedRef.current = false
        setFullDetailLoading(false)
        setAgentUsageLoading(false)
        setSelectedAgentTrailId(null)
        setLoadStepsDone(0)
        setLoadStepsTotal(INITIAL_LOAD_STEPS)
        loadProgressRef.current = { done: 0, total: INITIAL_LOAD_STEPS }
        loadTargetPercentRef.current = 0
        setLoadPercent(0)
        setLoadLabel('')
        return
      }

      loadProgressRef.current = { done: 0, total: INITIAL_LOAD_STEPS }
      loadTargetPercentRef.current = 0
      dashboardLoadStartedAtRef.current = performance.now()
      setLoadingData(true)
      // Meta/full só sob demanda (clique no KPI). Gate inicial = base + kpis.
      setLoadingMeta(false)
      setLoadingLogs(true)
      setInitialKpisLoaded(false)
      initialKpisLoadedRef.current = false
      setDetailRequested(false)
      setFullDetailLoaded(false)
      fullDetailLoadedRef.current = false
      setFullDetailLoading(false)
      setAgentUsageLoading(false)
      setSelectedAgentTrailId(null)
      setLogsError(null)
      setLoadStepsDone(0)
      setLoadStepsTotal(INITIAL_LOAD_STEPS)
      setLoadPercent(0)
      setLoadLabel('Carregando alunos e trilhas…')
      const dbOk = db
      const loadedSources = new Set<string>()

      const done = (source: string) => {
        if (loadedSources.has(source)) return
        loadedSources.add(source)
        loadProgressRef.current.done += 1
        syncLoadProgress('Carregando alunos e trilhas…')
        if (loadedSources.size >= DATA_SOURCES) {
          setLoadingData(false)
        }
      }

      // One-shot: dashboard não precisa de realtime nestas coleções.
      try {
        const [studentsSnap, trailsSnap, studentTrailsSnap] = await Promise.all([
          getDocs(
            query(
              collection(dbOk, STUDENTS_COLLECTION),
              where('institution_id', '==', selectedId),
            ),
          ),
          getDocs(
            query(
              collection(dbOk, TRAILS_COLLECTION),
              where('institution_id', '==', selectedId),
            ),
          ),
          getDocs(
            query(
              collection(dbOk, STUDENT_TRAILS_COLLECTION),
              where('institution_id', '==', selectedId),
            ),
          ),
        ])
        if (cancelled) return
        setStudents(studentsSnap.docs.map(snapshotToStudent))
        done('students')
        setTrails(trailsSnap.docs.map(snapshotToTrail))
        done('trails')
        setStudentTrails(studentTrailsSnap.docs.map(snapshotToStudentTrail))
        done('studentTrails')
        setDataError(null)
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Erro ao carregar dados.'
        setDataError(message)
        setStudents([])
        setTrails([])
        setStudentTrails([])
        done('students')
        done('trails')
        done('studentTrails')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const studentIdsKey = useMemo(
    () =>
      students
        .map((s) => s.id)
        .filter(Boolean)
        .sort()
        .join('\0'),
    [students],
  )

  const trailIdsKey = useMemo(
    () =>
      trails
        .map((t) => t.id)
        .filter(Boolean)
        .sort()
        .join('\0'),
    [trails],
  )

  // Stages e questões: só após o primeiro clique num indicador (detailRequested).
  // One-shot (getDocs): conteúdo muda pouco durante a sessão do dashboard.
  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!db || !selectedId) {
        setStages([])
        setQuestions([])
        setLoadingMeta(false)
        return
      }
      if (!detailRequested || loadingData) return

      const dbOk = db
      const trailIds = trailIdsKey ? trailIdsKey.split('\0') : []

      const metaDone = (source: 'stages' | 'questions') => {
        if (source === 'questions') {
          setLoadingMeta(false)
        }
      }

      if (trailIds.length === 0) {
        setStages([])
        setQuestions([])
        metaDone('stages')
        metaDone('questions')
        return
      }

      setLoadingMeta(true)
      const chunks = chunkArray(trailIds, FIRESTORE_IN_LIMIT)

      try {
        const stageSnaps = await Promise.all(
          chunks.map((chunk) =>
            getDocs(
              query(
                collection(dbOk, TRAIL_STAGES_COLLECTION),
                where('trail_id', 'in', chunk),
              ),
            ),
          ),
        )
        if (cancelled) return
        setStages(stageSnaps.flatMap((snap) => snap.docs.map(snapshotToTrailStage)))
        metaDone('stages')

        const questionSnaps = await Promise.all(
          chunks.map((chunk) =>
            getDocs(
              query(
                collection(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION),
                where('trail_id', 'in', chunk),
              ),
            ),
          ),
        )
        if (cancelled) return
        setQuestions(
          questionSnaps.flatMap((snap) =>
            snap.docs.map(snapshotToTrailStageQuestion),
          ),
        )
        metaDone('questions')
      } catch (err) {
        if (cancelled) return
        setDataError(err instanceof Error ? err.message : 'Erro ao carregar conteúdo.')
        setStages([])
        setQuestions([])
        metaDone('stages')
        metaDone('questions')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, trailIdsKey, loadingData, detailRequested])

  // Gate inicial: mode=kpis (agent_usage + contagens). Sem mapa students.
  useEffect(() => {
    let cancelled = false

    if (!db || !selectedId || loadingData) {
      return () => {
        cancelled = true
      }
    }

    const institutionId = selectedId
    const studentIds = studentIdsKey ? studentIdsKey.split('\0') : []
    if (studentIds.length === 0) {
      setAgentUsage({ ...EMPTY_AGENT_USAGE, periodDays: agentPeriodDays })
      setAgentUsagePresent(true)
      setLogsError(null)
      setLoadingLogs(false)
      setAgentUsageLoading(false)
      setInitialKpisLoaded(true)
      initialKpisLoadedRef.current = true
      loadProgressRef.current.done = INITIAL_LOAD_STEPS
      loadProgressRef.current.total = INITIAL_LOAD_STEPS
      syncLoadProgress('', { complete: true })
      return () => {
        cancelled = true
      }
    }

    const refreshing = initialKpisLoadedRef.current
    setLoadingLogs(true)
    if (refreshing) setAgentUsageLoading(true)
    setLogsError(null)
    if (!refreshing) {
      loadProgressRef.current.done = Math.min(
        loadProgressRef.current.done,
        DATA_SOURCES,
      )
      syncLoadProgress('Carregando indicadores…')
    }

    async function run() {
      try {
        const kpis = await fetchDashboardKpisSummary(
          institutionId,
          agentPeriodDays,
        )
        if (cancelled) return
        setAgentUsage(kpis.agentUsage)
        setAgentUsagePresent(kpis.agentUsagePresent)
        setInitialKpisLoaded(true)
        initialKpisLoadedRef.current = true
        if (!refreshing) {
          loadProgressRef.current.done = INITIAL_LOAD_STEPS
          loadProgressRef.current.total = INITIAL_LOAD_STEPS
          syncLoadProgress('', { complete: true })
        }
      } catch (err) {
        if (cancelled) return
        setLogsError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar métricas dos alunos.',
        )
        if (!refreshing) {
          setAgentUsage({ ...EMPTY_AGENT_USAGE, periodDays: agentPeriodDays })
          // Libera o gate para o banner de erro + retry ficarem acessíveis.
          setInitialKpisLoaded(true)
          initialKpisLoadedRef.current = true
          loadProgressRef.current.done = INITIAL_LOAD_STEPS
          loadProgressRef.current.total = INITIAL_LOAD_STEPS
          syncLoadProgress('', { complete: true })
        }
      } finally {
        if (!cancelled) {
          setLoadingLogs(false)
          setAgentUsageLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedId,
    studentIdsKey,
    loadingData,
    logsRetryKey,
    agentPeriodDays,
  ])

  // Detalhe sob demanda: mode=full (progressão) após clique num KPI.
  useEffect(() => {
    let cancelled = false

    if (!db || !selectedId || loadingData || !detailRequested) {
      return () => {
        cancelled = true
      }
    }

    const institutionId = selectedId
    const studentIds = studentIdsKey ? studentIdsKey.split('\0') : []
    if (studentIds.length === 0) {
      setLogAggregates(EMPTY_LOG_AGGREGATES)
      setFullDetailLoaded(true)
      fullDetailLoadedRef.current = true
      setFullDetailLoading(false)
      return () => {
        cancelled = true
      }
    }

    const refreshing = fullDetailLoadedRef.current
    setFullDetailLoading(true)
    if (refreshing) setAgentUsageLoading(true)

    async function run() {
      try {
        const summary = await fetchDashboardLogSummary(
          institutionId,
          agentPeriodDays,
        )
        if (cancelled) return
        setLogAggregates({
          doneByStudent: summary.doneByStudent,
          answerMap: summary.answerMap,
        })
        // Full também traz agent_usage — mantém KPI/tutores alinhados ao período.
        setAgentUsage(summary.agentUsage)
        setAgentUsagePresent(summary.agentUsagePresent)
        setFullDetailLoaded(true)
        fullDetailLoadedRef.current = true
      } catch (err) {
        if (cancelled) return
        setLogsError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar detalhes do dashboard.',
        )
        if (!refreshing) {
          setLogAggregates(EMPTY_LOG_AGGREGATES)
        }
      } finally {
        if (!cancelled) {
          setFullDetailLoading(false)
          setAgentUsageLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedId,
    studentIdsKey,
    trailIdsKey,
    loadingData,
    detailRequested,
    logsRetryKey,
    agentPeriodDays,
  ])

  const sortedInstitutions = useMemo(() => {
    return filterInstitutions(institutions).sort((a, b) => {
      const ma = a.updated_at?.toMillis?.() ?? a.created_at?.toMillis?.() ?? 0
      const mb = b.updated_at?.toMillis?.() ?? b.created_at?.toMillis?.() ?? 0
      return mb - ma
    })
  }, [institutions, filterInstitutions])

  const activeTrails = useMemo(() => trails.filter((t) => t.active), [trails])

  const trailById = useMemo(() => {
    const map = new Map<string, Trail>()
    for (const t of trails) map.set(t.id, t)
    return map
  }, [trails])

  const stageByKey = useMemo(() => {
    const map = new Map<string, TrailStage>()
    for (const s of stages) map.set(`${s.trail_id}|${s.stage_number}`, s)
    return map
  }, [stages])

  const questionByKey = useMemo(() => {
    const map = new Map<string, TrailStageQuestion>()
    for (const q of questions) {
      map.set(`${q.trail_id}|${q.stage_number}|${q.question_number}`, q)
    }
    return map
  }, [questions])

  /**
   * Posições (stage/question) de todas as questões ativas, por trilha.
   * Não filtra por is_released: uma questão respondida e bloqueada depois
   * continua contando.
   */
  const questionsByTrail = useMemo(() => {
    const map = new Map<string, { stage: number; question: number }[]>()
    for (const q of questions) {
      if (q.active === false) continue
      const arr = map.get(q.trail_id)
      if (arr) arr.push({ stage: q.stage_number, question: q.question_number })
      else map.set(q.trail_id, [{ stage: q.stage_number, question: q.question_number }])
    }
    return map
  }, [questions])

  /** Questões de exercício sem gabarito nas trilhas ativas da instituição. */
  const missingGabaritoCount = useMemo(() => {
    const activeIds = new Set(activeTrails.map((t) => t.id))
    let count = 0
    for (const q of questions) {
      if (!activeIds.has(q.trail_id)) continue
      const stage = stageByKey.get(`${q.trail_id}|${q.stage_number}`)
      if (stage?.stage_type !== 'exercise') continue
      if (q.annulled === true) continue
      if (!(q.correct_option ?? '').trim()) count += 1
    }
    return count
  }, [questions, activeTrails, stageByKey])

  /** Questões de exercício anuladas nas trilhas ativas (visíveis no cálculo). */
  const annulledQuestionKeys = useMemo(() => {
    const activeIds = new Set(activeTrails.map((t) => t.id))
    const keys = new Set<string>()
    for (const q of questions) {
      if (!activeIds.has(q.trail_id)) continue
      if (q.annulled !== true) continue
      const stage = stageByKey.get(`${q.trail_id}|${q.stage_number}`)
      if (stage?.stage_type !== 'exercise') continue
      keys.add(`${q.trail_id}|${q.stage_number}|${q.question_number}`)
    }
    return keys
  }, [questions, activeTrails, stageByKey])

  const annulledGabaritoCount = annulledQuestionKeys.size

  /** Trilhas ativas consideradas nos números da tabela de alunos. */
  const relevantTrails = activeTrails

  // Agregações de exercícios (ranking/oportunidades/conteúdo) só depois do
  // detalhe sob demanda — evita trabalho pesado na abertura da VG.
  useEffect(() => {
    if (!selectedId || loadingData || loadingMeta || !fullDetailLoaded) return
    if (!questionsDataEnabled) {
      startQuestionsTransition(() => {
        setQuestionsDataEnabled(true)
      })
    }
  }, [
    selectedId,
    loadingData,
    loadingMeta,
    fullDetailLoaded,
    questionsDataEnabled,
    startQuestionsTransition,
  ])

  const subjectTabs = useMemo(() => {
    const set = new Set<string>()
    for (const t of activeTrails) {
      const s = t.subject?.trim()
      if (s) set.add(s)
    }
    return [...set]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((s) => ({ id: s, label: s }))
  }, [activeTrails])

  // Garante matéria/trilha selecionadas quando a lista muda.
  useEffect(() => {
    if (subjectTabs.length === 0) {
      if (selectedSubject !== null) setSelectedSubject(null)
      if (selectedTrailId !== null) setSelectedTrailId(null)
      return
    }
    const subjectOk =
      selectedSubject != null &&
      subjectTabs.some((t) => t.id === selectedSubject)
    const nextSubject = subjectOk
      ? selectedSubject!
      : subjectTabs[0]!.id
    if (nextSubject !== selectedSubject) {
      setSelectedSubject(nextSubject)
    }
    const trailsForSubject = activeTrails.filter(
      (t) => (t.subject?.trim() || '') === nextSubject,
    )
    if (trailsForSubject.length === 0) {
      if (selectedTrailId !== null) setSelectedTrailId(null)
      return
    }
    const trailOk =
      selectedTrailId != null &&
      trailsForSubject.some((t) => t.id === selectedTrailId)
    const nextTrail = trailOk
      ? selectedTrailId!
      : trailsForSubject[0]!.id
    if (nextTrail !== selectedTrailId) {
      setSelectedTrailId(nextTrail)
    }
  }, [subjectTabs, activeTrails, selectedSubject, selectedTrailId])

  const scopedTrails = useMemo(() => {
    if (!selectedSubject) return activeTrails
    return activeTrails.filter(
      (t) => (t.subject?.trim() || '') === selectedSubject,
    )
  }, [activeTrails, selectedSubject])

  const scopedTrail = useMemo(() => {
    if (!selectedTrailId) return scopedTrails[0] ?? null
    return scopedTrails.find((t) => t.id === selectedTrailId) ?? null
  }, [scopedTrails, selectedTrailId])

  /** Stages das trilhas relevantes, para o filtro de seleção (agrupados por trilha). */
  const availableStages = useMemo(() => {
    const relevantIds = new Set(relevantTrails.map((t) => t.id))
    const list = stages
      .filter((s) => relevantIds.has(s.trail_id))
      .map((s) => ({
        key: `${s.trail_id}|${s.stage_number}`,
        trailId: s.trail_id,
        trailName: trailById.get(s.trail_id)?.name || s.trail_id,
        stageNumber: s.stage_number,
        title: s.title,
        stageType: s.stage_type,
      }))
    list.sort((a, b) =>
      a.trailName !== b.trailName
        ? a.trailName.localeCompare(b.trailName, 'pt-BR', {
            sensitivity: 'base',
          })
        : a.stageNumber - b.stageNumber,
    )
    return list
  }, [stages, relevantTrails, trailById])

  const selectedStageCount = useMemo(
    () =>
      availableStages.filter((s) => !deselectedStages.has(s.key)).length,
    [availableStages, deselectedStages],
  )

  /** Números de questão (q1, q2…) presentes nas trilhas relevantes. */
  const availableQuestions = useMemo(() => {
    const relevantIds = new Set(relevantTrails.map((t) => t.id))
    const nums = new Set<number>()
    for (const q of questions) {
      if (q.active === false) continue
      if (!relevantIds.has(q.trail_id)) continue
      if (q.question_number >= 1) nums.add(q.question_number)
    }
    return [...nums].sort((a, b) => a - b)
  }, [questions, relevantTrails])

  const selectedQuestionCount = useMemo(
    () =>
      availableQuestions.filter((n) => !deselectedQuestions.has(n)).length,
    [availableQuestions, deselectedQuestions],
  )

  const doneQuestionsByStudent = logAggregates.doneByStudent
  const studentAnswerMap = logAggregates.answerMap

  const trailsByStudentIds = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const st of studentTrails) {
      let set = map.get(st.student_id)
      if (!set) {
        set = new Set()
        map.set(st.student_id, set)
      }
      set.add(st.trail_id)
    }
    return map
  }, [studentTrails])

  const { enrichedDoneByStudent, forced: forcedCompletions } = useMemo(() => {
    // A regra de conclusão forçada usa a estrutura real da aula (sem filtros
    // de Aulas/Tópicos do dashboard), para não gravar marcador com base em
    // uma "última" posição artificial do filtro.
    return collectForcedCompletions({
      doneByStudent: doneQuestionsByStudent,
      trailsByStudent: trailsByStudentIds,
      questionsByTrail,
      stageByKey,
      deselectedStages: new Set(),
      deselectedQuestions: new Set(),
      institutionId: selectedId || null,
    })
  }, [
    doneQuestionsByStudent,
    trailsByStudentIds,
    questionsByTrail,
    stageByKey,
    selectedId,
  ])

  const forcedCompletionLookup = useMemo(
    () => buildForcedCompletionLookup(forcedCompletions),
    [forcedCompletions],
  )

  const persistedForcedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    persistedForcedRef.current.clear()
  }, [selectedId])

  useEffect(() => {
    if (!db || forcedCompletions.length === 0) return

    const pending: ForcedCompletionTarget[] = []
    for (const target of forcedCompletions) {
      const id = `${target.studentId}|${target.key}`
      if (persistedForcedRef.current.has(id)) continue
      persistedForcedRef.current.add(id)
      pending.push(target)
    }
    if (pending.length === 0) return

    let cancelled = false
    void (async () => {
      for (const target of pending) {
        if (cancelled) return
        try {
          await upsertForcedCompletionMarker(target)
        } catch (err) {
          console.warn('Falha ao gravar marcador de conclusão forçada', err)
          persistedForcedRef.current.delete(`${target.studentId}|${target.key}`)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [forcedCompletions])

  /**
   * Quantas respostas de alunos estão em questão anulada e saem do
   * denominador de acerto/erro.
   */
  const annulledAnswersExcluded = useMemo(() => {
    if (annulledQuestionKeys.size === 0) return 0
    let count = 0
    for (const [answerKey, answer] of studentAnswerMap) {
      if (!answer.trim()) continue
      const first = answerKey.indexOf('|')
      if (first < 0) continue
      const qKey = answerKey.slice(first + 1)
      if (annulledQuestionKeys.has(qKey)) count += 1
    }
    return count
  }, [studentAnswerMap, annulledQuestionKeys])

  /**
   * Todas as questões ativas da trilha (colunas de resposta no XLSX), agrupadas
   * por número da questão: Q1.S1, Q1.S2, …, Q2.S1, Q2.S2, …
   */
  const allQuestionColumnsByTrail = useMemo(() => {
    const map = new Map<string, { stage: number; question: number }[]>()
    for (const [trailId, positions] of questionsByTrail) {
      map.set(
        trailId,
        [...positions].sort((a, b) =>
          a.question !== b.question
            ? a.question - b.question
            : a.stage - b.stage,
        ),
      )
    }
    return map
  }, [questionsByTrail])

  const studentRows = useMemo<StudentRow[]>(() => {
    const relevantIds = new Set(relevantTrails.map((t) => t.id))

    // Trilhas inscritas (com progresso) de cada aluno, restritas às trilhas ativas.
    const trailsByStudent = new Map<string, StudentTrail[]>()
    for (const st of studentTrails) {
      if (!relevantIds.has(st.trail_id)) continue
      const arr = trailsByStudent.get(st.student_id)
      if (arr) arr.push(st)
      else trailsByStudent.set(st.student_id, [st])
    }

    const attemptsByStudent = new Map<string, { correct: number; wrong: number }>()
    for (const student of students) {
      const enrolled = trailsByStudent.get(student.id) ?? []
      const enrolledTrailIds = new Set(enrolled.map((st) => st.trail_id))
      attemptsByStudent.set(
        student.id,
        scoreStudentFromAnswerMap(
          student.id,
          enrolledTrailIds,
          studentAnswerMap,
          stageByKey,
          questionByKey,
          deselectedStages,
          deselectedQuestions,
        ),
      )
    }

    const rows: StudentRow[] = students.map((student) => {
      let released = 0
      let done = 0
      const enrolled = trailsByStudent.get(student.id) ?? []
      const studentDone = enrichedDoneByStudent.get(student.id) ?? new Set()
      for (const st of enrolled) {
        const positions = questionsByTrail.get(st.trail_id) ?? []
        const selected = positions.filter(
          (p) =>
            !deselectedStages.has(`${st.trail_id}|${p.stage}`) &&
            !deselectedQuestions.has(p.question),
        )
        released += selected.length

        for (const p of selected) {
          const key = `${st.trail_id}|${p.stage}|${p.question}`
          if (studentDone.has(key)) done += 1
        }
      }

      const lessonMetrics = computeLessonMetricsForTrails(
        enrolled.map((st) => st.trail_id),
        questionsByTrail,
        studentDone,
        deselectedStages,
        deselectedQuestions,
      )

      const agg = attemptsByStudent.get(student.id) ?? { correct: 0, wrong: 0 }
      return {
        student,
        released,
        done,
        completionPct: pct(done, released),
        lessonsReleased: lessonMetrics.lessonsReleased,
        lessonsDone: lessonMetrics.lessonsDone,
        lessonsCompletionPct: lessonMetrics.lessonsCompletionPct,
        correct: agg.correct,
        wrong: agg.wrong,
        accuracyPct: pct(agg.correct, agg.correct + agg.wrong),
      }
    })

    return rows
  }, [
    students,
    relevantTrails,
    studentTrails,
    questionsByTrail,
    stageByKey,
    questionByKey,
    deselectedStages,
    deselectedQuestions,
    enrichedDoneByStudent,
    studentAnswerMap,
  ])

  const filteredStudentRows = useMemo(() => {
    const query = nameFilter.trim().toLowerCase()
    const queryDigits = query.replace(/\D/g, '')
    const lo = Math.min(pctMin, pctMax)
    const hi = Math.max(pctMin, pctMax)

    return studentRows.filter((row) => {
      if (selectedGrade) {
        const grade = (row.student.school_grade || '').trim()
        if (grade !== selectedGrade) return false
      }
      if (query) {
        const name = (row.student.name || '').toLowerCase()
        const phone = (row.student.phone_number || '').replace(/\D/g, '')
        const matchName = name.includes(query)
        const matchPhone =
          queryDigits.length > 0 && phone.includes(queryDigits)
        if (!matchName && !matchPhone) return false
      }
      const completion = row.completionPct
      if (completion === null) {
        // Sem progresso: só passa se a faixa incluir 0.
        if (lo > 0) return false
      } else if (completion < lo || completion > hi) {
        return false
      }
      return true
    })
  }, [studentRows, nameFilter, pctMin, pctMax, selectedGrade])

  const scopedStudentRows = useMemo(() => {
    if (!scopedTrail) return filteredStudentRows
    return filteredStudentRows.filter((row) => {
      const enrolled = trailsByStudentIds.get(row.student.id)
      return enrolled?.has(scopedTrail.id) ?? false
    })
  }, [filteredStudentRows, scopedTrail, trailsByStudentIds])

  const chartFilteredStudentRows = useMemo(() => {
    if (!studentChartFilter) return filteredStudentRows

    if (studentChartFilter.kind === 'status') {
      return filteredStudentRows.filter(
        (row) => getStudentEngagementStatus(row) === studentChartFilter.key,
      )
    }

    if (studentChartFilter.kind === 'completion') {
      return filteredStudentRows.filter(
        (row) =>
          getCompletionBucketKey(row.completionPct) === studentChartFilter.key,
      )
    }

    const selectedLessonKeys = new Set(studentChartFilter.keys)
    const topicsByLessonKey = new Map<string, TopicPosition[]>()
    for (const key of selectedLessonKeys) {
      const sep = key.lastIndexOf('|')
      if (sep < 0) continue
      const trailId = key.slice(0, sep)
      const lessonNumber = Number(key.slice(sep + 1))
      if (!Number.isFinite(lessonNumber)) continue
      const topics =
        groupTopicsByLesson(
          filterTrailTopicPositions(
            trailId,
            questionsByTrail.get(trailId) ?? [],
            deselectedStages,
            deselectedQuestions,
          ),
        ).get(lessonNumber) ?? []
      topicsByLessonKey.set(key, topics)
    }

    return filteredStudentRows.filter((row) => {
      const enrolled = trailsByStudentIds.get(row.student.id)
      if (!enrolled) return false
      const studentDone = enrichedDoneByStudent.get(row.student.id) ?? new Set()
      for (const [lessonKey, topics] of topicsByLessonKey) {
        const trailId = lessonKey.slice(0, lessonKey.lastIndexOf('|'))
        if (!enrolled.has(trailId)) continue
        if (isLessonCompleteForTrail(trailId, topics, studentDone)) return true
      }
      return false
    })
  }, [
    filteredStudentRows,
    studentChartFilter,
    questionsByTrail,
    deselectedStages,
    deselectedQuestions,
    trailsByStudentIds,
    enrichedDoneByStudent,
  ])

  const sortedFilteredStudentRows = useMemo(() => {
    const rows = [...chartFilteredStudentRows]
    const { key, dir } = studentSort
    const mult = dir === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      let cmp = 0
      switch (key) {
        case 'name':
          cmp = (a.student.name || '').localeCompare(
            b.student.name || '',
            'pt-BR',
            { sensitivity: 'base' },
          )
          break
        case 'phone':
          cmp = (a.student.phone_number || '').localeCompare(
            b.student.phone_number || '',
            'pt-BR',
            { sensitivity: 'base' },
          )
          break
        case 'released':
          cmp = a.released - b.released
          break
        case 'done':
          cmp = a.done - b.done
          break
        case 'completionPct':
          cmp = compareNullableNumber(a.completionPct, b.completionPct)
          break
        case 'lessonsReleased':
          cmp = a.lessonsReleased - b.lessonsReleased
          break
        case 'lessonsDone':
          cmp = a.lessonsDone - b.lessonsDone
          break
        case 'lessonsCompletionPct':
          cmp = compareNullableNumber(a.lessonsCompletionPct, b.lessonsCompletionPct)
          break
        case 'correct':
          cmp = a.correct - b.correct
          break
        case 'wrong':
          cmp = a.wrong - b.wrong
          break
        case 'accuracyPct':
          cmp = compareNullableNumber(a.accuracyPct, b.accuracyPct)
          break
      }
      return cmp * mult
    })
    return rows
  }, [chartFilteredStudentRows, studentSort])

  const studentPageCount = useMemo(
    () =>
      Math.max(1, Math.ceil(sortedFilteredStudentRows.length / STUDENTS_PAGE_SIZE)),
    [sortedFilteredStudentRows.length],
  )

  const paginatedStudentRows = useMemo(() => {
    const start = (studentPage - 1) * STUDENTS_PAGE_SIZE
    return sortedFilteredStudentRows.slice(start, start + STUDENTS_PAGE_SIZE)
  }, [sortedFilteredStudentRows, studentPage])

  useEffect(() => {
    setStudentPage(1)
  }, [selectedId, nameFilter, pctMin, pctMax, studentChartFilter])

  useEffect(() => {
    if (studentPage > studentPageCount) {
      setStudentPage(studentPageCount)
    }
  }, [studentPage, studentPageCount])

  const studentPageRange = useMemo(() => {
    if (sortedFilteredStudentRows.length === 0) {
      return { start: 0, end: 0 }
    }
    const start = (studentPage - 1) * STUDENTS_PAGE_SIZE + 1
    const end = Math.min(
      studentPage * STUDENTS_PAGE_SIZE,
      sortedFilteredStudentRows.length,
    )
    return { start, end }
  }, [sortedFilteredStudentRows.length, studentPage])

  // Cards de resumo — refletem os filtros da tabela de alunos
  // (busca e faixa de % conclusão).
  const summary = useMemo(() => {
    const activeRows = filteredStudentRows.filter((r) => r.student.active)

    let doneTotal = 0
    let releasedTotal = 0
    let lessonsDoneTotal = 0
    let lessonsReleasedTotal = 0
    let correct = 0
    let total = 0
    for (const row of activeRows) {
      doneTotal += row.done
      releasedTotal += row.released
      lessonsDoneTotal += row.lessonsDone
      lessonsReleasedTotal += row.lessonsReleased
      correct += row.correct
      total += row.correct + row.wrong
    }

    const avgCompletion =
      releasedTotal > 0
        ? Math.round((doneTotal / releasedTotal) * 1000) / 10
        : null

    const avgLessonCompletion =
      lessonsReleasedTotal > 0
        ? Math.round((lessonsDoneTotal / lessonsReleasedTotal) * 1000) / 10
        : null

    const avgAccuracy =
      total > 0 ? Math.round((correct / total) * 1000) / 10 : null

    return {
      activeStudents: activeRows.length,
      activeTrails: activeTrails.length,
      avgCompletion,
      avgLessonCompletion,
      avgAccuracy,
    }
  }, [filteredStudentRows, activeTrails])

  const studentsCharts = useMemo(() => {
    const completionBuckets = [
      { key: '0-20', label: '0–20%', count: 0 },
      { key: '21-40', label: '21–40%', count: 0 },
      { key: '41-60', label: '41–60%', count: 0 },
      { key: '61-80', label: '61–80%', count: 0 },
      { key: '81-100', label: '81–100%', count: 0 },
    ]
    const statusCounts = {
      notStarted: 0,
      inProgress: 0,
      completed: 0,
    }

    for (const row of filteredStudentRows) {
      const completion = row.completionPct
      statusCounts[getStudentEngagementStatus(row)] += 1

      if (completion !== null) {
        if (completion <= 20) completionBuckets[0].count += 1
        else if (completion <= 40) completionBuckets[1].count += 1
        else if (completion <= 60) completionBuckets[2].count += 1
        else if (completion <= 80) completionBuckets[3].count += 1
        else completionBuckets[4].count += 1
      }
    }

    const multiTrail = relevantTrails.length > 1
    const lessonBars: {
      key: string
      label: string
      lessonNumber: number
      count: number
      enrolledCount: number
    }[] = []

    for (const trail of relevantTrails) {
      const lessonNumbers = trailLessonNumbers(
        trail.id,
        questionsByTrail,
        deselectedStages,
        deselectedQuestions,
      )
      const byQuestion = groupTopicsByLesson(
        filterTrailTopicPositions(
          trail.id,
          questionsByTrail.get(trail.id) ?? [],
          deselectedStages,
          deselectedQuestions,
        ),
      )

      for (const lessonNumber of lessonNumbers) {
        const topics = byQuestion.get(lessonNumber) ?? []
        if (topics.length === 0) continue

        let enrolledCount = 0
        let count = 0
        for (const row of filteredStudentRows) {
          const enrolled = trailsByStudentIds.get(row.student.id)
          if (!enrolled?.has(trail.id)) continue
          enrolledCount += 1
          const studentDone =
            enrichedDoneByStudent.get(row.student.id) ?? new Set()
          if (isLessonCompleteForTrail(trail.id, topics, studentDone)) {
            count += 1
          }
        }

        lessonBars.push({
          key: `${trail.id}|${lessonNumber}`,
          label: multiTrail
            ? `A${lessonNumber} · ${trail.name || trail.id}`
            : `A${lessonNumber}`,
          lessonNumber,
          count,
          enrolledCount,
        })
      }
    }

    return {
      studentCount: filteredStudentRows.length,
      completionBuckets,
      statuses: [
        {
          key: 'notStarted' as const,
          label: 'Não iniciou',
          count: statusCounts.notStarted,
        },
        {
          key: 'inProgress' as const,
          label: 'Em andamento',
          count: statusCounts.inProgress,
        },
        {
          key: 'completed' as const,
          label: 'Concluiu (100%)',
          count: statusCounts.completed,
        },
      ],
      lessonBars,
    }
  }, [
    filteredStudentRows,
    relevantTrails,
    questionsByTrail,
    deselectedStages,
    deselectedQuestions,
    trailsByStudentIds,
    enrichedDoneByStudent,
  ])

  const lastInteractionByStudent = useMemo(() => {
    const map = new Map<string, number>()
    const relevantIds = new Set(relevantTrails.map((t) => t.id))
    for (const st of studentTrails) {
      if (!relevantIds.has(st.trail_id)) continue
      const ms = st.last_interaction_at?.toMillis?.() ?? 0
      if (ms <= 0) continue
      const prev = map.get(st.student_id) ?? 0
      if (ms > prev) map.set(st.student_id, ms)
    }
    return map
  }, [studentTrails, relevantTrails])

  const statusByStudent = useMemo(() => {
    const map = new Map<string, string>()
    const relevantIds = new Set(relevantTrails.map((t) => t.id))
    const byStudent = new Map<string, StudentTrail[]>()
    for (const st of studentTrails) {
      if (!relevantIds.has(st.trail_id)) continue
      const arr = byStudent.get(st.student_id)
      if (arr) arr.push(st)
      else byStudent.set(st.student_id, [st])
    }
    for (const [studentId, list] of byStudent) {
      if (list.every((s) => s.status === 'completed')) {
        map.set(studentId, 'completed')
      } else if (list.every((s) => s.status === 'not_started')) {
        map.set(studentId, 'not_started')
      } else if (list.some((s) => s.status === 'completed')) {
        map.set(studentId, 'in_progress')
      } else if (list.some((s) => s.status === 'in_progress')) {
        map.set(studentId, 'in_progress')
      } else {
        map.set(studentId, 'not_started')
      }
    }
    return map
  }, [studentTrails, relevantTrails])

  const journeyBands = useMemo(() => {
    const counts = {
      completed: 0,
      final: 0,
      mid: 0,
      start: 0,
      stalled: 0,
      notStarted: 0,
    }
    for (const row of scopedStudentRows) {
      const situation = situationFromProgress({
        status: statusByStudent.get(row.student.id),
        completionPct: row.completionPct,
        lastInteractionAtMs: lastInteractionByStudent.get(row.student.id) ?? null,
      })
      counts[situation.key] += 1
    }
    // Ordem do protótipo: Não iniciaram → Início → Meio → Fim → Concluíram.
    // "Parado 7+" fica só no link do cabeçalho (não entra na barra).
    return [
      {
        key: 'notStarted' as const,
        label: 'Não iniciaram',
        count: counts.notStarted,
        criterion: '0 conteúdos concluídos',
      },
      {
        key: 'start' as const,
        label: 'Início',
        count: counts.start,
        criterion: '1% a 33% dos conteúdos liberados',
      },
      {
        key: 'mid' as const,
        label: 'Meio',
        count: counts.mid,
        criterion: '34% a 66%',
      },
      {
        key: 'final' as const,
        label: 'Fim',
        count: counts.final,
        criterion: '67% a 99%',
      },
      {
        key: 'completed' as const,
        label: 'Concluíram',
        count: counts.completed,
        criterion: '100% dos conteúdos liberados',
      },
      // Contagem usada só pelo link do cabeçalho (filtrada na view).
      {
        key: 'stalled' as const,
        label: 'Parado 7+ dias',
        count: counts.stalled,
        criterion: 'sem interação há 7 dias ou mais',
      },
    ]
  }, [scopedStudentRows, statusByStudent, lastInteractionByStudent])

  const gradeOptions = useMemo(() => {
    const set = new Set<string>()
    for (const s of students) {
      const g = s.school_grade?.trim()
      if (g) set.add(g)
    }
    return [...set]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((g) => ({ id: g, label: g }))
  }, [students])

  // Ranking de pílulas — itera só respostas existentes no mapa
  const gradablePillQuestions = useMemo(() => {
    const map = new Map<string, string>()
    if (!questionsDataEnabled) return map

    for (const trail of activeTrails) {
      const positions = questionsByTrail.get(trail.id) ?? []
      for (const p of positions) {
        const stage = stageByKey.get(`${trail.id}|${p.stage}`)
        if (stage?.stage_type !== 'exercise') continue

        const key = `${trail.id}|${p.stage}|${p.question}`
        const question = questionByKey.get(key)
        if (question?.annulled === true) continue
        const gabarito = (question?.correct_option ?? '').trim()
        if (!gabarito) continue
        map.set(key, gabarito)
      }
    }
    return map
  }, [
    activeTrails,
    questionsByTrail,
    stageByKey,
    questionByKey,
    questionsDataEnabled,
  ])

  const pillRows = useMemo<PillRow[]>(() => {
    if (!questionsDataEnabled) return []

    const byKey = new Map<string, { correct: number; wrong: number }>()

    for (const [answerKey, answer] of studentAnswerMap) {
      if (!answer.trim()) continue

      const parts = answerKey.split('|')
      if (parts.length !== 4) continue

      const qKey = `${parts[1]}|${parts[2]}|${parts[3]}`
      const gabarito = gradablePillQuestions.get(qKey)
      if (!gabarito) continue

      let agg = byKey.get(qKey)
      if (!agg) {
        agg = { correct: 0, wrong: 0 }
        byKey.set(qKey, agg)
      }

      if (answersMatch(answer, gabarito)) agg.correct += 1
      else agg.wrong += 1
    }

    const rows: PillRow[] = []
    for (const [key, agg] of byKey) {
      const [trailId, stageStr, questionStr] = key.split('|')
      const stageNumber = Number(stageStr)
      const questionNumber = Number(questionStr)
      const trail = trailById.get(trailId)
      const question = questionByKey.get(key)
      const total = agg.correct + agg.wrong
      if (total < 1) continue
      rows.push({
        key,
        trailId,
        trailName: trail?.name || trailId,
        subject: trail?.subject?.trim() || '—',
        stageNumber,
        questionNumber,
        title: question?.title || '—',
        content: question?.content ?? '',
        gabarito: formatGabaritoLetter(
          gradablePillQuestions.get(key) ??
            question?.correct_option ??
            '',
        ),
        total,
        correct: agg.correct,
        wrong: agg.wrong,
        accuracyPct: Math.round((agg.correct / total) * 100),
      })
    }
    return rows
  }, [
    studentAnswerMap,
    gradablePillQuestions,
    trailById,
    questionByKey,
    questionsDataEnabled,
  ])

  const filteredPillRows = useMemo(() => {
    const query = pillSearch.trim().toLowerCase()
    const lo = Math.min(pillAccMin, pillAccMax)
    const hi = Math.max(pillAccMin, pillAccMax)
    return pillRows.filter((row) => {
      if (row.total < pillMinResponses) return false
      if (pillTrailFilter && row.trailId !== pillTrailFilter) return false
      if (row.accuracyPct < lo || row.accuracyPct > hi) return false
      if (query) {
        const code = `t${row.stageNumber} a${row.questionNumber}`
        const haystack = [
          row.title,
          row.content,
          row.trailName,
          row.subject,
          row.gabarito,
          code,
          `t${row.stageNumber}`,
          `a${row.questionNumber}`,
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [
    pillRows,
    pillSearch,
    pillTrailFilter,
    pillMinResponses,
    pillAccMin,
    pillAccMax,
  ])

  const sortedPillRows = useMemo(() => {
    const rows = [...filteredPillRows]
    const { key, dir } = pillSort
    const mult = dir === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      let cmp = 0
      switch (key) {
        case 'trail':
          cmp = a.trailName.localeCompare(b.trailName, 'pt-BR', {
            sensitivity: 'base',
          })
          break
        case 'position':
          cmp =
            a.stageNumber !== b.stageNumber
              ? a.stageNumber - b.stageNumber
              : a.questionNumber - b.questionNumber
          break
        case 'total':
          cmp = a.total - b.total
          break
        case 'correct':
          cmp = a.correct - b.correct
          break
        case 'wrong':
          cmp = a.wrong - b.wrong
          break
        case 'accuracyPct':
          cmp = a.accuracyPct - b.accuracyPct
          break
      }
      return cmp * mult
    })
    return rows
  }, [filteredPillRows, pillSort])

  const worstPills = useMemo(
    () =>
      [...filteredPillRows]
        .sort((a, b) => a.accuracyPct - b.accuracyPct)
        .slice(0, 5),
    [filteredPillRows],
  )
  const bestPills = useMemo(
    () =>
      [...filteredPillRows]
        .sort((a, b) => b.accuracyPct - a.accuracyPct)
        .slice(0, 5),
    [filteredPillRows],
  )

  const questionsCharts = useMemo(() => {
    let correctTotal = 0
    let wrongTotal = 0
    const filteredQuestionKeys = new Set(
      filteredPillRows.map((row) => row.key),
    )
    const studentIds = new Set<string>()
    const buckets = [
      { label: '0–20%', count: 0 },
      { label: '21–40%', count: 0 },
      { label: '41–60%', count: 0 },
      { label: '61–80%', count: 0 },
      { label: '81–100%', count: 0 },
    ]
    const byTrail = new Map<
      string,
      { label: string; responses: number; weightedAcc: number }
    >()

    for (const row of filteredPillRows) {
      correctTotal += row.correct
      wrongTotal += row.wrong
      if (row.accuracyPct <= 20) buckets[0].count += 1
      else if (row.accuracyPct <= 40) buckets[1].count += 1
      else if (row.accuracyPct <= 60) buckets[2].count += 1
      else if (row.accuracyPct <= 80) buckets[3].count += 1
      else buckets[4].count += 1

      const trail = byTrail.get(row.trailId)
      if (trail) {
        trail.responses += row.total
        trail.weightedAcc += row.accuracyPct * row.total
      } else {
        byTrail.set(row.trailId, {
          label: row.trailName,
          responses: row.total,
          weightedAcc: row.accuracyPct * row.total,
        })
      }
    }

    for (const [answerKey, answer] of studentAnswerMap) {
      if (!answer.trim()) continue
      const parts = answerKey.split('|')
      if (parts.length !== 4) continue
      const studentId = parts[0]
      const questionKey = `${parts[1]}|${parts[2]}|${parts[3]}`
      if (filteredQuestionKeys.has(questionKey)) studentIds.add(studentId)
    }

    const responseCount = correctTotal + wrongTotal
    const trailBars = [...byTrail.entries()]
      .map(([id, t]) => ({
        id,
        label: t.label,
        responses: t.responses,
        avgAccuracy:
          t.responses > 0 ? Math.round(t.weightedAcc / t.responses) : 0,
      }))
      .sort((a, b) => b.responses - a.responses)
      .slice(0, 8)

    return {
      studentCount: studentIds.size,
      questionCount: filteredPillRows.length,
      responseCount,
      avgAccuracy: pct(correctTotal, responseCount),
      correctTotal,
      wrongTotal,
      accuracyBuckets: buckets,
      trailBars,
    }
  }, [filteredPillRows, studentAnswerMap])

  const pillPageCount = useMemo(
    () => Math.max(1, Math.ceil(sortedPillRows.length / PILLS_PAGE_SIZE)),
    [sortedPillRows.length],
  )

  const paginatedPillRows = useMemo(() => {
    const start = (pillPage - 1) * PILLS_PAGE_SIZE
    return sortedPillRows.slice(start, start + PILLS_PAGE_SIZE)
  }, [sortedPillRows, pillPage])

  const pillPageRange = useMemo(() => {
    if (sortedPillRows.length === 0) return { start: 0, end: 0 }
    const start = (pillPage - 1) * PILLS_PAGE_SIZE + 1
    const end = Math.min(pillPage * PILLS_PAGE_SIZE, sortedPillRows.length)
    return { start, end }
  }, [sortedPillRows.length, pillPage])

  useEffect(() => {
    setPillPage(1)
  }, [
    selectedId,
    pillSearch,
    pillTrailFilter,
    pillMinResponses,
    pillAccMin,
    pillAccMax,
  ])

  useEffect(() => {
    if (pillPage > pillPageCount) setPillPage(pillPageCount)
  }, [pillPage, pillPageCount])

  const pillExportTrails = useMemo(() => {
    if (!pillTrailFilter) return activeTrails
    return activeTrails.filter((t) => t.id === pillTrailFilter)
  }, [activeTrails, pillTrailFilter])

  const pillTrailOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const row of pillRows) {
      byId.set(row.trailId, row.trailName)
    }
    return [...byId.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }),
      )
  }, [pillRows])

  function togglePillSort(key: PillSortKey) {
    setPillSort((curr) =>
      curr.key === key
        ? { key, dir: curr.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'accuracyPct' ? 'asc' : 'desc' },
    )
  }

  function toggleStudentSort(key: StudentSortKey) {
    setStudentSort((curr) =>
      curr.key === key
        ? { key, dir: curr.dir === 'asc' ? 'desc' : 'asc' }
        : {
            key,
            dir: key === 'name' || key === 'phone' ? 'asc' : 'desc',
          },
    )
  }

  function pillSortIndicator(key: PillSortKey): string {
    if (pillSort.key !== key) return ''
    return pillSort.dir === 'asc' ? ' ↑' : ' ↓'
  }

  function studentSortIndicator(key: StudentSortKey): string {
    if (studentSort.key !== key) return ''
    return studentSort.dir === 'asc' ? ' ↑' : ' ↓'
  }

  function computeTrailMetrics(
    studentId: string,
    trailId: string,
    doneOverride?: Map<string, Set<string>>,
  ): { released: number; done: number; completionPct: number | null } {
    const enrolled = studentTrails.some(
      (st) => st.student_id === studentId && st.trail_id === trailId,
    )
    if (!enrolled) {
      return { released: 0, done: 0, completionPct: null }
    }

    const positions = questionsByTrail.get(trailId) ?? []
    const selected = positions.filter(
      (p) =>
        !deselectedStages.has(`${trailId}|${p.stage}`) &&
        !deselectedQuestions.has(p.question),
    )
    const studentDone =
      doneOverride?.get(studentId) ??
      enrichedDoneByStudent.get(studentId) ??
      new Set()
    let done = 0
    for (const p of selected) {
      const key = `${trailId}|${p.stage}|${p.question}`
      if (studentDone.has(key)) done += 1
    }
    const released = selected.length
    return { released, done, completionPct: pct(done, released) }
  }

  async function exportTrailHistoryXlsx(trailId: string) {
    const trail = trailById.get(trailId)
    if (!db || !trail || exportingTrailId) return
    setExportError(null)
    setExportingTrailId(trail.id)
    try {
      const xlsx = await loadXlsx()

      // Dá tempo para o navegador renderizar o estado "Gerando…" antes do
      // processamento síncrono do XLSX bloquear a thread principal.
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve())
        })
      })

      // Reutiliza os agregados já carregados no dashboard (mesmos alunos e
      // trilhas da instituição), sem refazer o download de logs.
      const answersByKey = studentAnswerMap
      const exportDoneByStudent = enrichedDoneByStudent
      const forcedLookup = forcedCompletionLookup

      const answerColumns = (
        allQuestionColumnsByTrail.get(trail.id) ?? []
      ).filter(
        (p) =>
          !deselectedStages.has(`${trail.id}|${p.stage}`) &&
          !deselectedQuestions.has(p.question),
      )
      const fixedHeaders = [
        'Nome',
        'Telefone',
        'Tópicos liberados',
        'Tópicos feitos',
        '% conclusão',
      ]
      const headers = [
        ...fixedHeaders,
        ...answerColumns.map((p) =>
          lessonTopicColumnLabel(trail.id, p.stage, p.question, stageByKey),
        ),
      ]

      // Exporta todas as linhas que correspondem aos filtros atuais, não
      // apenas os 20 alunos da página visível.
      const sortedStudents = sortedFilteredStudentRows.map((row) => row.student)

      const rows = sortedStudents.map((student) => {
        const metrics = computeTrailMetrics(
          student.id,
          trail.id,
          exportDoneByStudent,
        )
        const row: (string | number)[] = [
          student.name || student.id,
          student.phone_number || '',
          metrics.released,
          metrics.done,
          formatPctExport(metrics.completionPct),
        ]
        for (const p of answerColumns) {
          const answerKey = `${student.id}|${trail.id}|${p.stage}|${p.question}`
          const answer = answersByKey.get(answerKey)
          if (answer?.trim()) {
            row.push(answer)
          } else if (
            forcedLookup.has(
              `${student.id}|${trail.id}|${p.stage}|${p.question}`,
            )
          ) {
            row.push(FORCED_COMPLETION_EXPORT_TOPIC_LABEL)
          } else {
            row.push('')
          }
        }
        return row
      })

      const worksheet = xlsx.utils.aoa_to_sheet([headers, ...rows])
      const fixedColCount = fixedHeaders.length

      headers.forEach((header, colIndex) => {
        forceWorksheetCellString(xlsx, worksheet, 0, colIndex, header)
      })

      rows.forEach((row, rowIndex) => {
        for (let colIndex = fixedColCount; colIndex < headers.length; colIndex++) {
          const value = row[colIndex]
          if (typeof value === 'string' && value.length > 0) {
            forceWorksheetCellString(xlsx, worksheet, rowIndex + 1, colIndex, value)
          }
        }
      })

      const workbook = xlsx.utils.book_new()
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Histórico')
      appendCorrespondenceSheet(
        xlsx,
        workbook,
        trail.id,
        answerColumns,
        stageByKey,
        questionByKey,
      )
      appendLessonsProgressSheet(
        xlsx,
        workbook,
        trail,
        sortedStudents,
        questionsByTrail,
        exportDoneByStudent,
        deselectedStages,
        deselectedQuestions,
        forcedLookup,
      )
      const trailSlug = slugFileName(trail.name || trail.id)
      xlsx.writeFile(workbook, `historico-alunos-${trailSlug}.xlsx`)
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Erro ao gerar planilha.',
      )
    } finally {
      setExportingTrailId(null)
    }
  }

  async function exportPillTrailXlsx(trailId: string) {
    const trail = trailById.get(trailId)
    if (!trail || exportingPillTrailId) return
    setExportError(null)
    setExportingPillTrailId(trail.id)
    try {
      const xlsx = await loadXlsx()
      const rows = sortedPillRows.filter((p) => p.trailId === trail.id)
      const headers = [
        'Trilha',
        'Matéria',
        'Tópico / Aula',
        'Título',
        'Enunciado',
        'Gabarito',
        'Respostas',
        'Acertos',
        'Erros',
        '% acerto',
      ]
      const data = rows.map((p) => [
        p.trailName,
        p.subject,
        lessonTopicColumnLabel(
          p.trailId,
          p.stageNumber,
          p.questionNumber,
          stageByKey,
        ),
        p.title,
        p.content.trim() || p.title.trim(),
        p.gabarito,
        p.total,
        p.correct,
        p.wrong,
        `${p.accuracyPct}%`,
      ])

      const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data])
      headers.forEach((header, colIndex) => {
        forceWorksheetCellString(xlsx, worksheet, 0, colIndex, header)
      })
      data.forEach((row, rowIndex) => {
        const enunciado = row[4]
        if (typeof enunciado === 'string' && enunciado.length > 0) {
          forceWorksheetCellString(xlsx, worksheet, rowIndex + 1, 4, enunciado)
        }
        const gabarito = row[5]
        if (typeof gabarito === 'string' && gabarito.length > 0) {
          forceWorksheetCellString(xlsx, worksheet, rowIndex + 1, 5, gabarito)
        }
      })

      const workbook = xlsx.utils.book_new()
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Aulas')
      const correspondencePositions =
        allQuestionColumnsByTrail.get(trail.id) ?? []
      if (correspondencePositions.length > 0) {
        appendCorrespondenceSheet(
          xlsx,
          workbook,
          trail.id,
          correspondencePositions,
          stageByKey,
          questionByKey,
        )
      }
      const trailSlug = slugFileName(trail.name || trail.id)
      xlsx.writeFile(workbook, `aulas-acertos-erros-${trailSlug}.xlsx`)
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Erro ao gerar planilha.',
      )
    } finally {
      setExportingPillTrailId(null)
    }
  }

  const visibleColumns = ALL_STUDENT_COLUMNS.filter(
    (c) => !hiddenColumns.has(c.key),
  )

  const hasActiveStudentExportFilters =
    nameFilter.trim().length > 0 ||
    studentChartFilter !== null ||
    pctMin !== 0 ||
    pctMax !== 100 ||
    selectedQuestionCount < availableQuestions.length ||
    selectedStageCount < availableStages.length

  const isDashboardLoading =
    Boolean(selectedId) && (loadingData || !initialKpisLoaded)

  const progressionKpisLoading =
    detailRequested && (fullDetailLoading || loadingMeta || !fullDetailLoaded)

  useEffect(() => {
    if (isDashboardLoading) return
    loadTargetPercentRef.current = 0
    if (selectedId && dashboardLoadStartedAtRef.current > 0) {
      const ms = Math.round(performance.now() - dashboardLoadStartedAtRef.current)
      dashboardLoadStartedAtRef.current = 0
      // Telemetria leve local (útil em staging / DevTools).
      console.info(
        `[dashboard] pronto em ${ms}ms (institution_id=${selectedId})`,
      )
    }
  }, [isDashboardLoading, selectedId])

  useEffect(() => {
    if (!isDashboardLoading) return

    const id = window.setInterval(() => {
      const target = loadTargetPercentRef.current
      setLoadPercent((current) => {
        if (current === target) return current
        if (current < target) return Math.min(current + 1, target)
        return Math.max(current - 1, target)
      })
    }, 40)

    return () => window.clearInterval(id)
  }, [isDashboardLoading, loadStepsDone, loadStepsTotal])

  const institutionOptions = sortedInstitutions.map((inst) => ({
    id: inst.id,
    label: inst.name || inst.id,
  }))

  const questionPickerItems = availableQuestions.map((n) => ({
    id: String(n),
    label: `Aula ${n}`,
  }))
  const questionPickerSelectedIds = availableQuestions
    .filter((n) => !deselectedQuestions.has(n))
    .map(String)
  const questionPickerLabel =
    availableQuestions.length > 0
      ? ` (${selectedQuestionCount}/${availableQuestions.length})`
      : ''

  const stagePickerItems = availableStages.map((s) => ({
    id: s.key,
    label: `${s.trailName} · Tópico ${s.stageNumber}${
      s.title ? ` — ${s.title}` : ''
    } (${s.stageType})`,
  }))
  const stagePickerSelectedIds = availableStages
    .map((s) => s.key)
    .filter((k) => !deselectedStages.has(k))
  const stagePickerLabel =
    availableStages.length > 0
      ? ` (${selectedStageCount}/${availableStages.length})`
      : ''

  const columnPickerItems = ALL_STUDENT_COLUMNS.map((c) => ({
    id: c.key,
    label: c.label,
  }))
  const columnPickerSelectedIds = ALL_STUDENT_COLUMNS.map((c) => c.key).filter(
    (k) => !hiddenColumns.has(k),
  )

  const studentExportTrails = relevantTrails.map((trail) => ({
    id: trail.id,
    label: trail.name || trail.id,
  }))

  const pillExportTrailOptions = pillExportTrails.map((trail) => ({
    id: trail.id,
    label: trail.name || trail.id,
  }))

  const toPillView = (p: PillRow): DashboardPillRowView => ({
    ...p,
    trailHref: trailPath(p.trailId),
  })

  const activityMatrix = useMemo(() => {
    if (!questionsDataEnabled || filteredPillRows.length === 0) return null
    const stages = [
      ...new Set(filteredPillRows.map((r) => r.stageNumber)),
    ].sort((a, b) => a - b)
    const questionsNums = [
      ...new Set(filteredPillRows.map((r) => r.questionNumber)),
    ].sort((a, b) => a - b)
    const agg = new Map<
      string,
      { stageNumber: number; questionNumber: number; correct: number; total: number }
    >()
    for (const row of filteredPillRows) {
      const key = `${row.stageNumber}|${row.questionNumber}`
      const cur = agg.get(key) ?? {
        stageNumber: row.stageNumber,
        questionNumber: row.questionNumber,
        correct: 0,
        total: 0,
      }
      cur.correct += row.correct
      cur.total += row.total
      agg.set(key, cur)
    }
    const cells = [...agg.values()].map((c) => ({
      stageNumber: c.stageNumber,
      questionNumber: c.questionNumber,
      key: `${c.stageNumber}|${c.questionNumber}`,
      total: c.total,
      accuracyPct:
        c.total > 0 ? Math.round((c.correct / c.total) * 100) : null,
    }))
    return { stages, questions: questionsNums, cells }
  }, [filteredPillRows, questionsDataEnabled])

  const optionDistribution = useMemo(() => {
    if (!selectedMatrixCellKey || !questionsDataEnabled) return null
    const [stageStr, qStr] = selectedMatrixCellKey.split('|')
    const stageNumber = Number(stageStr)
    const questionNumber = Number(qStr)
    if (!Number.isFinite(stageNumber) || !Number.isFinite(questionNumber)) {
      return null
    }
    const counts = new Map<string, number>()
    let total = 0
    for (const [answerKey, answer] of studentAnswerMap) {
      const parts = answerKey.split('|')
      if (parts.length < 3) continue
      const s = Number(parts[1])
      const q = Number(parts[2])
      if (s !== stageNumber || q !== questionNumber) continue
      const letter = answer.trim().toUpperCase().charAt(0) || '?'
      if (!/[A-E]/.test(letter)) continue
      counts.set(letter, (counts.get(letter) ?? 0) + 1)
      total += 1
    }
    if (total === 0) return null
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([option, count]) => ({
        option,
        count,
        pct: Math.round((count / total) * 100),
      }))
  }, [selectedMatrixCellKey, studentAnswerMap, questionsDataEnabled])

  const trailFilterOptions = useMemo(
    () =>
      scopedTrails.map((t) => ({
        id: t.id,
        label: t.name || t.id,
      })),
    [scopedTrails],
  )

  const scopeSummary = useMemo(() => {
    const subjectLabel = selectedSubject ?? 'Instituição'
    const trailLabel = scopedTrail?.name || scopedTrail?.id || '—'
    let accuracySum = 0
    let accuracyCount = 0
    for (const row of scopedStudentRows) {
      if (row.accuracyPct == null) continue
      accuracySum += row.accuracyPct
      accuracyCount += 1
    }
    return {
      studentCount: scopedStudentRows.length,
      trailCount: scopedTrails.length,
      accuracyPct:
        accuracyCount > 0 ? Math.round(accuracySum / accuracyCount) : null,
      scopeLabel: `${subjectLabel} · ${trailLabel}`,
    }
  }, [selectedSubject, scopedTrail, scopedStudentRows, scopedTrails])

  const contentBarsAndSummary = useMemo(() => {
    if (!scopedTrail) {
      return {
        bars: [] as Array<{
          key: string
          num: string
          title: string
          subtitle?: string
          completionPct: number | null
          accuracyPct: number | null
          completedCount: number
          enrolledCount: number
          released: boolean
          exercises: Array<{
            key: string
            label: string
            prompt: string
            accuracyPct: number | null
            note: string
            href?: string
          }>
          trailHref?: string
        }>,
        summary: null,
      }
    }
    const trailId = scopedTrail.id
    const trailHref = trailPath(trailId)
    const lessonNumbers = trailLessonNumbers(
      trailId,
      questionsByTrail,
      deselectedStages,
      deselectedQuestions,
    )
    const byLesson = groupTopicsByLesson(
      filterTrailTopicPositions(
        trailId,
        questionsByTrail.get(trailId) ?? [],
        deselectedStages,
        deselectedQuestions,
      ),
    )

    const pillByPos = new Map<string, PillRow>()
    const pillsByLesson = new Map<number, PillRow[]>()
    if (questionsDataEnabled) {
      for (const row of pillRows) {
        if (row.trailId !== trailId) continue
        pillByPos.set(`${row.stageNumber}|${row.questionNumber}`, row)
        const arr = pillsByLesson.get(row.questionNumber) ?? []
        arr.push(row)
        pillsByLesson.set(row.questionNumber, arr)
      }
    }

    const bars = lessonNumbers.map((lessonNumber) => {
      const topics = [...(byLesson.get(lessonNumber) ?? [])].sort(
        (a, b) => a.stage - b.stage,
      )

      const released = topics.some((p) => {
        const q = questionByKey.get(`${trailId}|${p.stage}|${p.question}`)
        return q?.is_released === true
      })

      let enrolledCount = 0
      let completedCount = 0
      let progressSum = 0
      for (const row of scopedStudentRows) {
        const enrolled = trailsByStudentIds.get(row.student.id)
        if (!enrolled?.has(trailId)) continue
        enrolledCount += 1
        const studentDone =
          enrichedDoneByStudent.get(row.student.id) ?? new Set()
        if (topics.length === 0) continue
        let doneTopics = 0
        for (const p of topics) {
          if (studentDone.has(`${trailId}|${p.stage}|${p.question}`)) {
            doneTopics += 1
          }
        }
        progressSum += doneTopics / topics.length
        if (doneTopics === topics.length) completedCount += 1
      }

      // % médio de tópicos concluídos na aula (visível no gráfico).
      const completionPct =
        released && enrolledCount > 0
          ? Math.round((progressSum / enrolledCount) * 100)
          : null

      let title = `Aula ${lessonNumber}`
      for (const p of topics) {
        const st = stageByKey.get(`${trailId}|${p.stage}`)
        if (st && st.stage_type !== 'exercise' && st.title?.trim()) {
          title = st.title.trim()
          break
        }
      }
      if (title === `Aula ${lessonNumber}`) {
        for (const p of topics) {
          const q = questionByKey.get(`${trailId}|${p.stage}|${p.question}`)
          if (q?.title?.trim()) {
            title = q.title.trim()
            break
          }
        }
      }

      // Tópicos “exercício”: stage exercise, gabarito, opções ou resposta agregada.
      let exerciseTopics = topics.filter((p) => {
        const st = stageByKey.get(`${trailId}|${p.stage}`)
        const q = questionByKey.get(`${trailId}|${p.stage}|${p.question}`)
        const hasGab = !!(q?.correct_option ?? '').trim()
        const hasOpts = (q?.options?.length ?? 0) > 0
        const hasPill = pillByPos.has(`${p.stage}|${p.question}`)
        return (
          st?.stage_type === 'exercise' || hasGab || hasOpts || hasPill
        )
      })
      if (exerciseTopics.length === 0) exerciseTopics = topics

      let missingGabarito = 0
      const exercises = exerciseTopics.map((p, idx) => {
        const q = questionByKey.get(`${trailId}|${p.stage}|${p.question}`)
        const pill = pillByPos.get(`${p.stage}|${p.question}`)
        const gabarito = (q?.correct_option ?? '').trim()
        const annulled = q?.annulled === true
        if (!annulled && !gabarito) missingGabarito += 1
        const prompt =
          (q?.content ?? '').trim() ||
          (q?.title ?? '').trim() ||
          `Exercício ${idx + 1}`
        let note = 'acertaram'
        let accuracyPct: number | null = pill?.accuracyPct ?? null
        if (annulled) {
          note = 'fora do cálculo'
          accuracyPct = null
        } else if (!gabarito && !pill) {
          note = 'sem gabarito'
          accuracyPct = null
        } else if (pill == null || pill.total < 1) {
          note = 'sem respostas'
          accuracyPct = null
        }
        return {
          key: `${trailId}|${p.stage}|${p.question}`,
          label: `Exercício ${idx + 1}`,
          prompt,
          accuracyPct,
          note,
          href: trailHref,
        }
      })

      // Acerto da aula = soma de todas as pílulas desta aula (question_number).
      const lessonPills = pillsByLesson.get(lessonNumber) ?? []
      let accCorrect = 0
      let accTotal = 0
      for (const pill of lessonPills) {
        accCorrect += pill.correct
        accTotal += pill.total
      }
      const accuracyPct =
        accTotal > 0 ? Math.round((accCorrect / accTotal) * 100) : null

      const subtitleParts: string[] = []
      if (exercises.length > 0) {
        subtitleParts.push(
          `${exercises.length} exercício${exercises.length === 1 ? '' : 's'}`,
        )
      }
      if (missingGabarito > 0) {
        subtitleParts.push(`${missingGabarito} sem gabarito`)
      }

      return {
        key: `${trailId}|${lessonNumber}`,
        num: String(lessonNumber).padStart(2, '0'),
        title,
        subtitle: released
          ? subtitleParts.join(' · ') || undefined
          : 'ainda não liberado',
        completionPct,
        accuracyPct,
        completedCount,
        enrolledCount,
        released,
        exercises,
        trailHref,
      }
    })

    const releasedBars = bars.filter((b) => b.released)

    let progressSum = 0
    let progressN = 0
    for (const row of scopedStudentRows) {
      if (row.completionPct == null) continue
      progressSum += row.completionPct
      progressN += 1
    }
    const progressAvg =
      progressN > 0 ? Math.round(progressSum / progressN) : null

    const withAcc = releasedBars
      .filter((b) => b.accuracyPct != null)
      .slice()
      .sort((a, b) => (a.accuracyPct ?? 0) - (b.accuracyPct ?? 0))

    // Min/máx por EXERCÍCIO (não por aula) — evita o mesmo "Conteúdo 86" nos dois cards.
    const exercisePool: ContentExercisePick[] = []
    for (const bar of releasedBars) {
      bar.exercises.forEach((ex, idx) => {
        if (ex.accuracyPct == null) return
        const short =
          ex.prompt.length > 72 ? `${ex.prompt.slice(0, 69)}…` : ex.prompt
        exercisePool.push({
          label: short,
          pct: ex.accuracyPct,
          note: `Conteúdo ${bar.num} · Ex. ${idx + 1}`,
          contentKey: bar.key,
          exKey: ex.key,
        })
      })
    }
    const { lowest: lowestEx, highest: highestEx } =
      pickContentExerciseExtrema(exercisePool)

    const accuracyVals = withAcc.map((b) => b.accuracyPct as number)
    const accuracyAvg =
      accuracyVals.length === 0
        ? null
        : Math.round(
            accuracyVals.reduce((a, b) => a + b, 0) / accuracyVals.length,
          )

    const below60Count = bars.reduce(
      (n, bar) =>
        n +
        bar.exercises.filter(
          (ex) => ex.accuracyPct != null && ex.accuracyPct < 60,
        ).length,
      0,
    )

    return {
      bars,
      summary: {
        progressAvg,
        accuracyAvg,
        lowest: lowestEx
          ? {
              label: lowestEx.label,
              pct: lowestEx.pct,
              note: lowestEx.note,
              contentKey: lowestEx.contentKey,
            }
          : null,
        highest: highestEx
          ? {
              label: highestEx.label,
              pct: highestEx.pct,
              note: highestEx.note,
              contentKey: highestEx.contentKey,
            }
          : null,
        releasedCount: releasedBars.length,
        totalCount: bars.length,
        below60Count,
      },
    }
  }, [
    scopedTrail,
    questionsByTrail,
    deselectedStages,
    deselectedQuestions,
    scopedStudentRows,
    trailsByStudentIds,
    enrichedDoneByStudent,
    stageByKey,
    questionByKey,
    pillRows,
    questionsDataEnabled,
  ])

  // Painel de exercícios só abre no clique (não auto-abre).
  useEffect(() => {
    setSelectedContentKey(null)
  }, [selectedTrailId, selectedSubject])

  const crossOpportunityCards = useMemo(() => {
    if (!questionsDataEnabled || !scopedTrail) return []
    // Conteúdos com acerto < 65% — sem inventar dúvidas (sem metadata.topic).
    return contentBarsAndSummary.bars
      .filter(
        (b) =>
          b.released &&
          b.accuracyPct != null &&
          b.accuracyPct < 65 &&
          b.exercises.length > 0,
      )
      .slice()
      .sort((a, b) => (a.accuracyPct ?? 0) - (b.accuracyPct ?? 0))
      .slice(0, 4)
      .map((b) => ({
        key: b.key,
        aula: `Conteúdo ${b.num} · ${b.title}`,
        tema: b.title,
        accuracyPct: b.accuracyPct as number,
        doubtsLabel: '—',
      }))
  }, [contentBarsAndSummary.bars, questionsDataEnabled, scopedTrail])

  const opportunityRows = useMemo(() => {
    if (opportunityTab === 'duv') return []
    if (!questionsDataEnabled || !scopedTrail) return []
    const trailId = scopedTrail.id

    const rows = pillRows
      .filter((r) => r.trailId === trailId && r.total >= 1)
      .slice()
    rows.sort((a, b) =>
      opportunityTab === 'err'
        ? a.accuracyPct - b.accuracyPct || b.total - a.total
        : b.accuracyPct - a.accuracyPct || b.total - a.total,
    )

    const lessonTitle = (lessonNumber: number) => {
      const bar = contentBarsAndSummary.bars.find(
        (b) => b.key === `${trailId}|${lessonNumber}`,
      )
      return bar?.title || `Aula ${lessonNumber}`
    }

    const mostWrongDetail = (
      stageNumber: number,
      questionNumber: number,
    ): string | null => {
      const q = questionByKey.get(
        `${trailId}|${stageNumber}|${questionNumber}`,
      )
      const counts = new Map<string, number>()
      const suffix = `|${trailId}|${stageNumber}|${questionNumber}`
      for (const [answerKey, answer] of studentAnswerMap) {
        if (!answerKey.endsWith(suffix) || !answer.trim()) continue
        if (answersMatch(answer, q?.correct_option ?? '')) continue
        const letter = formatGabaritoLetter(answer)
        if (!letter || letter === '—') continue
        counts.set(letter, (counts.get(letter) ?? 0) + 1)
      }
      let best: string | null = null
      let bestN = 0
      for (const [letter, n] of counts) {
        if (n > bestN) {
          best = letter
          bestN = n
        }
      }
      if (!best) return null
      const opt = q?.options?.find(
        (o) => formatGabaritoLetter(o.key) === best,
      )
      const optText = (opt?.text ?? '').trim()
      return optText
        ? `Mais marcada entre as erradas: ${best} (${optText})`
        : `Mais marcada entre as erradas: ${best}`
    }

    // Índice do exercício dentro da aula (só stages exercise).
    const exIndexInLesson = (stageNumber: number, questionNumber: number) => {
      const topics = (
        groupTopicsByLesson(
          filterTrailTopicPositions(
            trailId,
            questionsByTrail.get(trailId) ?? [],
            deselectedStages,
            deselectedQuestions,
          ),
        ).get(questionNumber) ?? []
      )
        .filter((p) => {
          const st = stageByKey.get(`${trailId}|${p.stage}`)
          return st?.stage_type === 'exercise'
        })
        .sort((a, b) => a.stage - b.stage)
      const idx = topics.findIndex((p) => p.stage === stageNumber)
      return idx >= 0 ? idx + 1 : 1
    }

    return rows.slice(0, 5).map((row, idx) => {
      const wrongPct = Math.max(0, 100 - row.accuracyPct)
      const hit = opportunityTab === 'hit'
      const detail = hit
        ? undefined
        : mostWrongDetail(row.stageNumber, row.questionNumber) ??
          undefined
      const prompt =
        (row.content || '').trim() || row.title || 'Exercício'
      const exN = exIndexInLesson(row.stageNumber, row.questionNumber)
      return {
        rank: String(idx + 1).padStart(2, '0'),
        tag: lessonTitle(row.questionNumber),
        tag2: `Conteúdo ${String(row.questionNumber).padStart(2, '0')} · Ex. ${exN}`,
        title: prompt,
        detail,
        value: hit ? `${row.accuracyPct}%` : `${wrongPct}%`,
        valueSub: hit ? 'acertaram' : 'erraram',
        tone: (hit ? 'hit' : 'err') as 'err' | 'hit',
        href: trailPath(row.trailId),
      }
    })
  }, [
    opportunityTab,
    questionsDataEnabled,
    scopedTrail,
    pillRows,
    contentBarsAndSummary.bars,
    questionByKey,
    studentAnswerMap,
    questionsByTrail,
    deselectedStages,
    deselectedQuestions,
    stageByKey,
  ])

  const opportunityNote = useMemo(() => {
    if (opportunityTab === 'duv') {
      return 'Dúvidas por tema ainda não estão disponíveis — o banco atual não grava tópico da conversa.'
    }
    if (opportunityTab === 'err') {
      return 'Exercícios desta trilha com mais alunos errando. Clique para ver as respostas.'
    }
    return 'Exercícios desta trilha que a turma já domina.'
  }, [opportunityTab])

  const messagesByStudent = useMemo(() => {
    const map = new Map<string, number>()
    for (const agent of agentUsage.agents) {
      if (agent.studentStats?.length) {
        for (const st of agent.studentStats) {
          map.set(
            st.studentId,
            (map.get(st.studentId) ?? 0) + st.messages,
          )
        }
      } else {
        // API antiga: sem stats por aluno — não inventa mensagens.
        for (const id of agent.studentIds) {
          if (!map.has(id)) map.set(id, 0)
        }
      }
    }
    return map
  }, [agentUsage])

  const rankingRows = useMemo(() => {
    const rows = scopedStudentRows
    if (rows.length === 0) return []
    const msgs = rows.map(
      (r) => messagesByStudent.get(r.student.id) ?? 0,
    )
    const avgMsgs =
      msgs.reduce((a, b) => a + b, 0) / Math.max(1, msgs.length)

    const scored = rows.map((row) => {
      const progressPct = row.completionPct
      const accuracyPct = row.accuracyPct
      const messages = messagesByStudent.get(row.student.id) ?? 0
      const interactNorm = Math.min(
        100,
        avgMsgs > 0 ? (50 * messages) / avgMsgs : 0,
      )
      const p = progressPct ?? 0
      const a = accuracyPct ?? 0
      const wp = rankingWeights.progress / 100
      const wi = rankingWeights.interact / 100
      const wa = rankingWeights.accuracy / 100
      const score = Math.round(wp * p + wi * interactNorm + wa * a)
      const rawP = wp * p
      const rawI = wi * interactNorm
      const rawA = wa * a
      const rawSum = rawP + rawI + rawA || 1
      const delta = messages - avgMsgs
      const deltaPct =
        avgMsgs > 0 ? Math.round((delta / avgMsgs) * 100) : 0
      return {
        studentId: row.student.id,
        name: row.student.name || row.student.id,
        href: studentPath(row.student.id),
        meta: [
          row.student.school_grade?.trim() || null,
          scopedTrail?.name || null,
        ]
          .filter(Boolean)
          .join(' · '),
        progressPct,
        accuracyPct,
        messages,
        messagesVsAvgLabel:
          delta >= 0
            ? `+${deltaPct}% vs média`
            : `${deltaPct}% vs média`,
        messagesPositive: delta >= 0,
        score,
        segProgress: Math.round((rawP / rawSum) * 100),
        segInteract: Math.round((rawI / rawSum) * 100),
        segAccuracy: Math.round((rawA / rawSum) * 100),
      }
    })
    scored.sort((a, b) => b.score - a.score || b.messages - a.messages)
    return scored
  }, [
    scopedStudentRows,
    messagesByStudent,
    rankingWeights,
    scopedTrail,
  ])

  const rankingScopeLabel = useMemo(() => {
    const parts = [
      selectedSubject ?? 'todas as matérias',
      scopedTrail?.name || 'todas as trilhas',
      selectedGrade ? `série ${selectedGrade}` : 'todas as séries',
    ]
    return parts.join(' · ')
  }, [selectedSubject, scopedTrail, selectedGrade])

  const paginatedStudentRowsView = paginatedStudentRows.map((row) => {
    const situation = situationFromProgress({
      status: statusByStudent.get(row.student.id),
      completionPct: row.completionPct,
      lastInteractionAtMs:
        lastInteractionByStudent.get(row.student.id) ?? null,
    })
    return {
      id: row.student.id,
      name: row.student.name,
      href: studentPath(row.student.id),
      phone: row.student.phone_number || '',
      released: row.released,
      done: row.done,
      completionPct: row.completionPct,
      lessonsReleased: row.lessonsReleased,
      lessonsDone: row.lessonsDone,
      lessonsCompletionPct: row.lessonsCompletionPct,
      correct: row.correct,
      wrong: row.wrong,
      accuracyPct: row.accuracyPct,
      schoolGrade: row.student.school_grade || null,
      situationLabel: situation.label,
      situationTone: situation.tone,
    }
  })

  const registeredStudentCount = students.length
  const activeStudentCount = summary.activeStudents

  const visibleColumnsView = visibleColumns.map((c) => ({
    key: c.key,
    label: c.label,
    sortIndicator: studentSortIndicator(c.key),
  }))

  const agentUsageView = (() => {
    const agents = agentUsage.agents.map((agent) => ({
      trailId: agent.trailId,
      trailIds: agent.trailIds?.length ? agent.trailIds : [agent.trailId],
      label: agent.label,
      messages: agent.messages,
      uniqueStudents: agent.uniqueStudents,
      pctOfTotal: agent.pctOfTotal,
      lastActivityLabel: formatAgentLastActivity(agent.lastActivity),
      studentIds: agent.studentIds,
    }))
    const uniqueStudents = new Set(agents.flatMap((a) => a.studentIds)).size
    const activeTutorCount = agents.filter((a) => a.messages > 0).length
    const activeDayCount = new Set(agentUsage.series.map((p) => p.date)).size
    const coveragePct =
      studentRows.length > 0
        ? Math.round((uniqueStudents / studentRows.length) * 1000) / 10
        : 0
    return {
      totalMessages: agentUsage.totalMessages,
      uniqueStudents,
      coveragePct,
      msgsPerTutorPerDay: messagesPerTutorPerDay({
        totalMessages: agentUsage.totalMessages,
        activeTutorCount,
        periodDays: agentPeriodDays,
        activeDayCount,
      }),
      agents,
      series: agentUsage.series.map((point) => {
        const agent = agents.find((a) => a.trailId === point.trailId)
        return {
          date: point.date,
          trailId: point.trailId,
          label: agent?.label ?? point.trailId,
          messages: point.messages,
        }
      }),
    }
  })()

  const agentCoverageFinal =
    activeStudentCount > 0
      ? Math.round(
          (agentUsageView.uniqueStudents / activeStudentCount) * 1000,
        ) / 10
      : null

  const selectedAgentStudents = (() => {
    if (!selectedAgentTrailId) return []
    const row = agentUsage.agents.find((a) => a.trailId === selectedAgentTrailId)
    if (!row) return []
    const byId = new Map(students.map((s) => [s.id, s]))
    const trailIds = row.trailIds?.length ? row.trailIds : [row.trailId]
    const statsById = new Map(
      (row.studentStats ?? []).map((st) => [st.studentId, st]),
    )
    const ids =
      row.studentStats?.length > 0
        ? row.studentStats.map((st) => st.studentId)
        : row.studentIds
    return ids.map((id) => {
      const student = byId.get(id)
      const st = statsById.get(id)
      return {
        id,
        name: student?.name?.trim() || id,
        href: studentPath(id, {
          agentTrailId: row.trailId,
          agentTrailIds: trailIds,
        }),
        messages: st?.messages ?? 0,
        lastActivityLabel: formatAgentLastActivity(st?.lastActivity ?? null),
      }
    })
  })()

  const tutorSubject = (() => {
    const subj = selectedSubject?.trim()
    if (!subj) return null
    const agent = agentUsage.agents.find(
      (a) =>
        a.label.trim().toLowerCase() === subj.toLowerCase() ||
        a.trailId.toLowerCase().includes(subj.toLowerCase()),
    )
    if (!agent || agent.messages <= 0) return null

    const days =
      agentPeriodDays === 7 ? 7 : agentPeriodDays === 30 ? 30 : 120
    const poolSize = Math.max(1, scopedStudentRows.length)
    const coveragePct =
      Math.round((agent.uniqueStudents / poolSize) * 1000) / 10
    const messagesPerDay = agent.messages / days
    const perStudentPerDay =
      agent.uniqueStudents > 0
        ? agent.messages / agent.uniqueStudents / days
        : 0
    const perStudentPeriod =
      agent.uniqueStudents > 0
        ? agent.messages / agent.uniqueStudents
        : 0

    const byId = new Map(students.map((s) => [s.id, s]))
    const trailIds = agent.trailIds?.length ? agent.trailIds : [agent.trailId]
    const statsById = new Map(
      (agent.studentStats ?? []).map((st) => [st.studentId, st]),
    )
    const ids =
      agent.studentStats && agent.studentStats.length > 0
        ? agent.studentStats.map((st) => st.studentId)
        : agent.studentIds
    const topStudents = ids
      .map((id) => {
        const student = byId.get(id)
        const st = statsById.get(id)
        const grade = student?.school_grade?.trim()
        return {
          id,
          name: student?.name?.trim() || id,
          href: studentPath(id, {
            agentTrailId: agent.trailId,
            agentTrailIds: trailIds,
          }),
          messages: st?.messages ?? 0,
          lastActivityLabel: [
            grade || null,
            st?.lastActivity
              ? `última conversa ${formatAgentLastActivity(st.lastActivity)}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ') || formatAgentLastActivity(st?.lastActivity ?? null),
        }
      })
      .sort((a, b) => b.messages - a.messages || a.name.localeCompare(b.name, 'pt-BR'))

    const periodLabel =
      agentPeriodDays === 7
        ? 'últimos 7 dias'
        : agentPeriodDays === 30
          ? 'últimos 30 dias'
          : 'todo o período'

    return {
      subjectLabel: subj,
      periodLabel,
      messages: agent.messages,
      students: agent.uniqueStudents,
      coveragePct,
      messagesPerDay,
      perStudentPerDay,
      perStudentPeriod,
      topStudents,
    }
  })()

  return (
    <DashboardPageView
      loadingInst={loadingInst}
      institutionOptions={institutionOptions}
      selectedId={selectedId}
      onSelectInstitution={(id) => {
        setSelectedId(id)
        setStudentChartFilter(null)
        setActiveTab('students')
        setQuestionsDataEnabled(false)
        setAgentPeriodDays(0)
        setSelectedAgentTrailId(null)
        setSelectedGrade(null)
        setSelectedSubject(null)
        setSelectedTrailId(null)
        setSelectedContentKey(null)
        setOpportunityTab('err')
        setShowAllRanking(false)
        setSelectedMatrixCellKey(null)
        setPillSearch('')
        setPillTrailFilter('')
        setPillMinResponses(1)
        setPillAccMin(0)
        setPillAccMax(100)
        setPillPage(1)
      }}
      activeTab={activeTab}
      onActiveTabChange={(tab) => {
        setActiveTab(tab)
        if (tab === 'questions' && !questionsDataEnabled) {
          startQuestionsTransition(() => {
            setQuestionsDataEnabled(true)
          })
        }
      }}
      isQuestionsTabLoading={
        activeTab === 'questions' &&
        (!questionsDataEnabled || isQuestionsPending)
      }
      instError={instError}
      dataError={dataError}
      exportError={exportError}
      isDashboardLoading={isDashboardLoading}
      loadLabel={loadLabel}
      loadPercent={loadPercent}
      logsError={logsError}
      onRetryLogs={() => {
        // Reabre o gate no retry após falha de first-load (banner acessível).
        initialKpisLoadedRef.current = false
        setInitialKpisLoaded(false)
        fullDetailLoadedRef.current = false
        setFullDetailLoaded(false)
        setLogsError(null)
        setLogsRetryKey((k) => k + 1)
      }}
      onRequestKpiDetail={() => {
        if (!detailRequested) setDetailRequested(true)
      }}
      progressionKpisLoading={progressionKpisLoading}
      detailLoading={
        detailRequested &&
        (fullDetailLoading || loadingMeta || !fullDetailLoaded)
      }
      summary={summary}
      missingGabaritoCount={missingGabaritoCount}
      annulledGabaritoCount={annulledGabaritoCount}
      annulledAnswersExcluded={annulledAnswersExcluded}
      filteredStudentCount={chartFilteredStudentRows.length}
      totalStudentCount={studentRows.length}
      questionPickerLabel={questionPickerLabel}
      showQuestionPicker={showQuestionPicker}
      onToggleQuestionPicker={() => {
        setShowQuestionPicker((v) => !v)
        setShowStagePicker(false)
        setShowColumnPicker(false)
      }}
      questionPickerItems={questionPickerItems}
      questionPickerSelectedIds={questionPickerSelectedIds}
      onApplyQuestionPicker={(next) => {
        setDeselectedQuestions(
          new Set(availableQuestions.filter((n) => !next.has(String(n)))),
        )
        setShowQuestionPicker(false)
      }}
      onCloseQuestionPicker={() => setShowQuestionPicker(false)}
      stagePickerLabel={stagePickerLabel}
      showStagePicker={showStagePicker}
      onToggleStagePicker={() => {
        setShowStagePicker((v) => !v)
        setShowQuestionPicker(false)
        setShowColumnPicker(false)
      }}
      stagePickerItems={stagePickerItems}
      stagePickerSelectedIds={stagePickerSelectedIds}
      onApplyStagePicker={(next) => {
        setDeselectedStages(
          new Set(
            availableStages.map((s) => s.key).filter((k) => !next.has(k)),
          ),
        )
        setShowStagePicker(false)
      }}
      onCloseStagePicker={() => setShowStagePicker(false)}
      showColumnPicker={showColumnPicker}
      onToggleColumnPicker={() => {
        setShowColumnPicker((v) => !v)
        setShowStagePicker(false)
        setShowQuestionPicker(false)
      }}
      columnPickerItems={columnPickerItems}
      columnPickerSelectedIds={columnPickerSelectedIds}
      onApplyColumnPicker={(next) => {
        setHiddenColumns(
          new Set(
            ALL_STUDENT_COLUMNS.map((c) => c.key).filter((k) => !next.has(k)),
          ),
        )
        setShowColumnPicker(false)
      }}
      onCloseColumnPicker={() => setShowColumnPicker(false)}
      studentExportTrails={studentExportTrails}
      exportingTrailId={exportingTrailId}
      onExportTrailHistory={(trailId) => {
        void exportTrailHistoryXlsx(trailId)
      }}
      hasActiveStudentExportFilters={hasActiveStudentExportFilters}
      nameFilter={nameFilter}
      onNameFilterChange={setNameFilter}
      pctMin={pctMin}
      pctMax={pctMax}
      onPctMinChange={setPctMin}
      onPctMaxChange={setPctMax}
      nameSortIndicator={studentSortIndicator('name')}
      onToggleStudentSort={toggleStudentSort}
      visibleColumns={visibleColumnsView}
      studentRowsEmpty={studentRows.length === 0}
      paginatedStudentRows={paginatedStudentRowsView}
      showStudentPagination={
        sortedFilteredStudentRows.length > STUDENTS_PAGE_SIZE
      }
      studentPageRange={studentPageRange}
      sortedFilteredStudentCount={sortedFilteredStudentRows.length}
      studentPage={studentPage}
      studentPageCount={studentPageCount}
      onStudentPagePrev={() => setStudentPage((p) => Math.max(1, p - 1))}
      onStudentPageNext={() =>
        setStudentPage((p) => Math.min(studentPageCount, p + 1))
      }
      studentsCharts={studentsCharts}
      studentChartFilter={studentChartFilter}
      onStudentChartFilterChange={setStudentChartFilter}
      sortedPillCount={sortedPillRows.length}
      totalPillCount={pillRows.length}
      pillExportTrails={pillExportTrailOptions}
      exportingPillTrailId={exportingPillTrailId}
      onExportPillTrail={(trailId) => {
        void exportPillTrailXlsx(trailId)
      }}
      pillSearch={pillSearch}
      onPillSearchChange={setPillSearch}
      pillTrailFilter={pillTrailFilter}
      onPillTrailFilterChange={setPillTrailFilter}
      pillTrailOptions={pillTrailOptions}
      pillMinResponses={pillMinResponses}
      onPillMinResponsesChange={setPillMinResponses}
      pillAccMin={pillAccMin}
      pillAccMax={pillAccMax}
      onPillAccMinChange={setPillAccMin}
      onPillAccMaxChange={setPillAccMax}
      questionsCharts={questionsCharts}
      worstPills={worstPills.map(toPillView)}
      bestPills={bestPills.map(toPillView)}
      onTogglePillSort={togglePillSort}
      pillSortIndicator={pillSortIndicator}
      paginatedPillRows={paginatedPillRows.map(toPillView)}
      showPillPagination={sortedPillRows.length > PILLS_PAGE_SIZE}
      pillPageRange={pillPageRange}
      pillPage={pillPage}
      pillPageCount={pillPageCount}
      onPillPagePrev={() => setPillPage((p) => Math.max(1, p - 1))}
      onPillPageNext={() =>
        setPillPage((p) => Math.min(pillPageCount, p + 1))
      }
      agentUsage={agentUsageView}
      agentPeriodDays={agentPeriodDays}
      onAgentPeriodDaysChange={(days) => {
        if (days === agentPeriodDays) return
        setAgentPeriodDays(days)
        setSelectedAgentTrailId(null)
        // Troca de período: zera o snapshot antigo para o KPI/seção
        // refletirem o chip na hora (evita 16k com “30 dias” selecionado).
        setAgentUsageLoading(true)
        setAgentUsage({ ...EMPTY_AGENT_USAGE, periodDays: days })
      }}
      agentUsageLoading={agentUsageLoading}
      agentUsageUnavailable={!agentUsagePresent}
      selectedAgentTrailId={selectedAgentTrailId}
      onSelectAgentTrailId={setSelectedAgentTrailId}
      selectedAgentStudents={selectedAgentStudents}
      journeyBands={journeyBands}
      journeyStalledLinkLabel={
        journeyBands.find((b) => b.key === 'stalled')?.count
          ? `${journeyBands.find((b) => b.key === 'stalled')!.count} alunos parados há 7 dias ou mais`
          : null
      }
      journeyStalledHref="/alunos"
      registeredStudentCount={registeredStudentCount}
      agentCoverageOfActivePct={agentCoverageFinal}
      gradeOptions={gradeOptions}
      selectedGrade={selectedGrade}
      onSelectGrade={setSelectedGrade}
      subjectTabs={subjectTabs}
      selectedSubject={selectedSubject}
      onSelectSubject={(subject) => {
        setSelectedSubject(subject)
        setSelectedContentKey(null)
        setSelectedTrailId(null)
      }}
      trailFilterOptions={trailFilterOptions}
      selectedTrailId={selectedTrailId}
      onSelectTrailId={(trailId) => {
        setSelectedTrailId(trailId)
        setSelectedContentKey(null)
      }}
      scopeSummary={scopeSummary}
      contentSummary={contentBarsAndSummary.summary}
      contentBars={[...contentBarsAndSummary.bars]}
      selectedContentKey={selectedContentKey}
      onSelectContentKey={setSelectedContentKey}
      activityMatrix={activityMatrix}
      selectedMatrixCellKey={selectedMatrixCellKey}
      onSelectMatrixCell={setSelectedMatrixCellKey}
      optionDistribution={optionDistribution}
      opportunityTab={opportunityTab}
      onOpportunityTabChange={setOpportunityTab}
      opportunityRows={opportunityRows}
      opportunityNote={opportunityNote}
      crossOpportunityCards={crossOpportunityCards}
      crossOpportunityNote="Dúvidas por tema ainda não vêm do banco (sem metadata.topic). Cards listam conteúdos com acerto abaixo de 65%."
      onOpenCrossContent={(key) => {
        setSelectedContentKey(key)
        const el = document.querySelector('.crias-content')
        if (el instanceof HTMLElement) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }}
      tutorSubject={tutorSubject}
      ranking={rankingRows}
      rankingScopeLabel={rankingScopeLabel}
      rankingWeights={rankingWeights}
      onRankingWeightsChange={setRankingWeights}
      showAllRanking={showAllRanking}
      onToggleShowAllRanking={() => setShowAllRanking((v) => !v)}
    />
  )
}
