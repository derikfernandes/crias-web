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
import { fetchDashboardLogSummary } from '../lib/dashboardSummaryApi'
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
/** Stages e questões (carregados por trilha) também entram no gate de loading. */
const META_SOURCES = 2
/** Passos de progresso: fontes de dados + metadados + 1 passo de métricas (logs). */
const TOTAL_LOAD_STEPS = DATA_SOURCES + META_SOURCES + 1

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
  const [loadStepsTotal, setLoadStepsTotal] = useState(TOTAL_LOAD_STEPS)
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
  const [initialLogsLoaded, setInitialLogsLoaded] = useState(false)
  const initialLogsLoadedRef = useRef(false)
  const dashboardLoadStartedAtRef = useRef(0)
  const loadProgressRef = useRef({ done: 0, total: TOTAL_LOAD_STEPS })
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
        setInitialLogsLoaded(false)
        initialLogsLoadedRef.current = false
        setAgentUsageLoading(false)
        setSelectedAgentTrailId(null)
        setLoadStepsDone(0)
        setLoadStepsTotal(TOTAL_LOAD_STEPS)
        loadProgressRef.current = { done: 0, total: TOTAL_LOAD_STEPS }
        loadTargetPercentRef.current = 0
        setLoadPercent(0)
        setLoadLabel('')
        return
      }

      loadProgressRef.current = { done: 0, total: TOTAL_LOAD_STEPS }
      loadTargetPercentRef.current = 0
      dashboardLoadStartedAtRef.current = performance.now()
      setLoadingData(true)
      // Evita frame com dashboard zerado entre o fim do loadingData e o início
      // dos efeitos de metadados/logs.
      setLoadingMeta(true)
      setLoadingLogs(true)
      setInitialLogsLoaded(false)
      initialLogsLoadedRef.current = false
      setAgentUsageLoading(false)
      setSelectedAgentTrailId(null)
      setLogsError(null)
      setLoadStepsDone(0)
      setLoadStepsTotal(TOTAL_LOAD_STEPS)
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

  // Stages e questões filtrados pelas trilhas da instituição (em chunks de 30
  // IDs por limitação do operador "in"), em vez de baixar as coleções inteiras.
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
      if (loadingData) return

      const dbOk = db
      const trailIds = trailIdsKey ? trailIdsKey.split('\0') : []

      loadProgressRef.current.done = Math.min(
        loadProgressRef.current.done,
        DATA_SOURCES,
      )

      const metaDone = (source: 'stages' | 'questions') => {
        loadProgressRef.current.done += 1
        syncLoadProgress('Carregando conteúdo das trilhas…')
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
  }, [selectedId, trailIdsKey, loadingData])

  // Métricas dos alunos + uso de agentes: somente /api/dashboard_summary.
  // Sem fallback que baixa conversation_logs no browser.
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
      setLogAggregates(EMPTY_LOG_AGGREGATES)
      setAgentUsage({ ...EMPTY_AGENT_USAGE, periodDays: agentPeriodDays })
      setAgentUsagePresent(true)
      setLogsError(null)
      setLoadingLogs(false)
      setAgentUsageLoading(false)
      setInitialLogsLoaded(true)
      initialLogsLoadedRef.current = true
      loadProgressRef.current.done = loadProgressRef.current.total
      syncLoadProgress('', { complete: true })
      return () => {
        cancelled = true
      }
    }

    const refreshingAgentsOnly = initialLogsLoadedRef.current
    setLoadingLogs(true)
    if (refreshingAgentsOnly) setAgentUsageLoading(true)
    setLogsError(null)
    loadProgressRef.current.done = Math.min(
      loadProgressRef.current.done,
      DATA_SOURCES + META_SOURCES,
    )
    if (!refreshingAgentsOnly) {
      syncLoadProgress('Calculando métricas dos alunos…')
    }

    const finishProgress = () => {
      loadProgressRef.current.done = Math.min(
        loadProgressRef.current.done + 1,
        loadProgressRef.current.total,
      )
      const complete =
        loadProgressRef.current.done >= loadProgressRef.current.total
      syncLoadProgress(complete ? '' : 'Calculando métricas dos alunos…', {
        complete,
      })
    }

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
        setAgentUsage(summary.agentUsage)
        setAgentUsagePresent(summary.agentUsagePresent)
        setLoadingLogs(false)
        setAgentUsageLoading(false)
        setInitialLogsLoaded(true)
        initialLogsLoadedRef.current = true
        if (!refreshingAgentsOnly) finishProgress()
      } catch (err) {
        if (cancelled) return
        setLogsError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar métricas dos alunos.',
        )
        if (!refreshingAgentsOnly) {
          setLogAggregates(EMPTY_LOG_AGGREGATES)
          setAgentUsage({ ...EMPTY_AGENT_USAGE, periodDays: agentPeriodDays })
          // Libera o gate para o banner de erro + retry ficarem acessíveis.
          setInitialLogsLoaded(true)
          initialLogsLoadedRef.current = true
          loadProgressRef.current.done = loadProgressRef.current.total
          syncLoadProgress('', { complete: true })
        }
        // Refetch de período: mantém último snapshot (keep-previous).
        setLoadingLogs(false)
        setAgentUsageLoading(false)
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
      if (query) {
        const nameMatch = row.student.name.toLowerCase().includes(query)
        const phone = (row.student.phone_number ?? '').toLowerCase()
        const phoneDigits = phone.replace(/\D/g, '')
        const phoneMatch =
          phone.includes(query) ||
          (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
        if (!nameMatch && !phoneMatch) return false
      }
      const p = row.completionPct ?? 0
      if (p < lo || p > hi) return false
      return true
    })
  }, [studentRows, nameFilter, pctMin, pctMax])

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
    Boolean(selectedId) &&
    (loadingData || loadingMeta || !initialLogsLoaded)

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

  const paginatedStudentRowsView = paginatedStudentRows.map((row) => ({
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
  }))

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
        setAgentPeriodDays(30)
        setSelectedAgentTrailId(null)
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
        initialLogsLoadedRef.current = false
        setInitialLogsLoaded(false)
        setLogsError(null)
        setLogsRetryKey((k) => k + 1)
      }}
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
        setAgentPeriodDays(days)
        setSelectedAgentTrailId(null)
      }}
      agentUsageLoading={agentUsageLoading}
      agentUsageUnavailable={!agentUsagePresent}
      selectedAgentTrailId={selectedAgentTrailId}
      onSelectAgentTrailId={setSelectedAgentTrailId}
      selectedAgentStudents={selectedAgentStudents}
    />
  )
}
