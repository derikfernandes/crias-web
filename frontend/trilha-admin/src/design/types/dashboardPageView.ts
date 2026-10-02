export const DASHBOARD_STUDENT_COLUMNS = [
  { key: 'phone', label: 'Telefone' },
  { key: 'released', label: 'Tópicos liberados' },
  { key: 'done', label: 'Tópicos feitos' },
  { key: 'completionPct', label: '% conclusão (tópicos)' },
  { key: 'lessonsReleased', label: 'Aulas liberadas' },
  { key: 'lessonsDone', label: 'Aulas realizadas' },
  { key: 'lessonsCompletionPct', label: '% conclusão (aulas)' },
  { key: 'correct', label: 'Acertos' },
  { key: 'wrong', label: 'Erros' },
  { key: 'accuracyPct', label: '% de acerto' },
] as const

export type DashboardStudentColumnKey =
  (typeof DASHBOARD_STUDENT_COLUMNS)[number]['key']

export type DashboardStudentSortKey = 'name' | DashboardStudentColumnKey

export type DashboardPillSortKey =
  | 'trail'
  | 'position'
  | 'total'
  | 'correct'
  | 'wrong'
  | 'accuracyPct'

export type DashboardTab = 'students' | 'questions'

export type DashboardInstitutionOption = {
  id: string
  label: string
}

export type DashboardStudentRowView = {
  id: string
  name: string
  href: string
  phone: string
  released: number
  done: number
  completionPct: number | null
  lessonsReleased: number
  lessonsDone: number
  lessonsCompletionPct: number | null
  correct: number
  wrong: number
  accuracyPct: number | null
  /** Fase B: série/ano quando já existe no aluno. */
  schoolGrade?: string | null
  /** Situação calculada no container. */
  situationLabel?: string | null
  situationTone?:
    | 'concluiu'
    | 'final'
    | 'meio'
    | 'inicio'
    | 'parado'
    | 'nao-iniciou'
    | null
}

export type DashboardStudentColumnView = {
  key: DashboardStudentColumnKey
  label: string
  sortIndicator: string
}

export type DashboardTrailExportOption = {
  id: string
  label: string
}

export type DashboardPickerItem = {
  id: string
  label: string
}

export type DashboardSummaryView = {
  activeStudents: number
  activeTrails: number
  avgCompletion: number | null
  avgLessonCompletion: number | null
  avgAccuracy: number | null
}

export type DashboardStudentsChartBucket = {
  key: string
  label: string
  count: number
}

export type DashboardStudentsStatus = {
  key: 'notStarted' | 'inProgress' | 'completed'
  label: string
  count: number
}

export type DashboardStudentChartFilter =
  | { kind: 'completion'; key: string; label: string }
  | {
      kind: 'status'
      key: DashboardStudentsStatus['key']
      label: string
    }
  | { kind: 'lessons'; keys: string[]; labels: string[] }

export type DashboardStudentsLessonBar = {
  key: string
  label: string
  lessonNumber: number
  count: number
  enrolledCount: number
}

export type DashboardStudentsChartsView = {
  studentCount: number
  completionBuckets: DashboardStudentsChartBucket[]
  statuses: DashboardStudentsStatus[]
  lessonBars: DashboardStudentsLessonBar[]
}

export type DashboardPillRowView = {
  key: string
  trailId: string
  trailHref: string
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

export type DashboardPageRange = {
  start: number
  end: number
}

export type DashboardQuestionsChartBucket = {
  label: string
  count: number
}

export type DashboardQuestionsChartTrailBar = {
  id: string
  label: string
  responses: number
  avgAccuracy: number
}

export type DashboardQuestionsChartsView = {
  studentCount: number
  questionCount: number
  responseCount: number
  avgAccuracy: number | null
  correctTotal: number
  wrongTotal: number
  accuracyBuckets: DashboardQuestionsChartBucket[]
  trailBars: DashboardQuestionsChartTrailBar[]
}

export type DashboardAgentPeriodDays = 0 | 7 | 30

export type DashboardAgentStudentStatView = {
  id: string
  name: string
  href: string
  messages: number
  lastActivityLabel: string
}

export type DashboardAgentUsageRowView = {
  trailId: string
  trailIds: string[]
  label: string
  messages: number
  uniqueStudents: number
  pctOfTotal: number
  lastActivityLabel: string
  studentIds: string[]
}

export type DashboardAgentSeriesPointView = {
  date: string
  trailId: string
  label: string
  messages: number
}

export type DashboardAgentUsageView = {
  totalMessages: number
  uniqueStudents: number
  coveragePct: number
  msgsPerTutorPerDay: number
  agents: DashboardAgentUsageRowView[]
  series: DashboardAgentSeriesPointView[]
}

export type DashboardAgentStudentLink = {
  id: string
  name: string
  href: string
  messages: number
  lastActivityLabel: string
}

export type DashboardActivityMatrixCell = {
  stageNumber: number
  questionNumber: number
  accuracyPct: number | null
  total: number
  key: string
}

export type DashboardActivityMatrixView = {
  stages: number[]
  questions: number[]
  cells: DashboardActivityMatrixCell[]
}

export type DashboardOptionDistributionItem = {
  option: string
  count: number
  pct: number
}

/** Faixas de percurso (Início/Meio/Final/Parado/…). */
export type DashboardJourneyBandView = {
  key: 'completed' | 'final' | 'mid' | 'start' | 'stalled' | 'notStarted'
  label: string
  count: number
  /** Critério textual (ex.: "1% a 33% dos conteúdos liberados"). */
  criterion?: string
  /** Cor CSS da faixa (opcional; view tem default por key). */
  color?: string
  href?: string
}

export type DashboardSubjectTabView = {
  id: string
  label: string
}

export type DashboardContentExerciseView = {
  key: string
  label: string
  prompt: string
  accuracyPct: number | null
  note: string
  href?: string
}

export type DashboardContentBarView = {
  key: string
  num: string
  title: string
  /** Ex.: "3 exercícios · 1 sem gabarito" */
  subtitle?: string
  completionPct: number | null
  accuracyPct: number | null
  completedCount: number
  enrolledCount: number
  released: boolean
  exercises: DashboardContentExerciseView[]
  trailHref?: string
}

export type DashboardContentSummaryView = {
  progressAvg: number | null
  accuracyAvg: number | null
  /** Exercício (não aula) com menor/maior acerto. */
  lowest: {
    label: string
    pct: number
    note?: string
    contentKey?: string
  } | null
  highest: {
    label: string
    pct: number
    note?: string
    contentKey?: string
  } | null
  releasedCount: number
  totalCount: number
  below60Count: number
}

export type DashboardOpportunityRowView = {
  rank: string
  tag: string
  tag2?: string
  title: string
  detail?: string
  value: string
  valueSub: string
  tone: 'err' | 'hit' | 'duv'
  href?: string
}

export type DashboardOpportunityTab = 'err' | 'duv' | 'hit'

export type DashboardRankingRowView = {
  studentId: string
  name: string
  href: string
  meta: string
  progressPct: number | null
  accuracyPct: number | null
  messages: number
  messagesVsAvgLabel: string
  messagesPositive: boolean
  score: number
  segProgress: number
  segInteract: number
  segAccuracy: number
}

/** Opcional — dúvidas por tema (sem metadata.topic = lista vazia). */
export type DashboardTopicDoubtView = {
  topic: string
  count: number
}

export type DashboardPageViewProps = {
  loadingInst: boolean
  institutionOptions: DashboardInstitutionOption[]
  selectedId: string | null
  onSelectInstitution: (id: string | null) => void
  activeTab: DashboardTab
  onActiveTabChange: (tab: DashboardTab) => void
  isQuestionsTabLoading: boolean
  instError: string | null
  dataError: string | null
  exportError: string | null
  isDashboardLoading: boolean
  loadLabel: string
  loadPercent: number
  logsError: string | null
  onRetryLogs: () => void
  summary: DashboardSummaryView
  missingGabaritoCount: number
  annulledGabaritoCount: number
  annulledAnswersExcluded: number
  filteredStudentCount: number
  totalStudentCount: number
  questionPickerLabel: string
  showQuestionPicker: boolean
  onToggleQuestionPicker: () => void
  questionPickerItems: DashboardPickerItem[]
  questionPickerSelectedIds: string[]
  onApplyQuestionPicker: (selectedIds: Set<string>) => void
  onCloseQuestionPicker: () => void
  stagePickerLabel: string
  showStagePicker: boolean
  onToggleStagePicker: () => void
  stagePickerItems: DashboardPickerItem[]
  stagePickerSelectedIds: string[]
  onApplyStagePicker: (selectedIds: Set<string>) => void
  onCloseStagePicker: () => void
  showColumnPicker: boolean
  onToggleColumnPicker: () => void
  columnPickerItems: DashboardPickerItem[]
  columnPickerSelectedIds: string[]
  onApplyColumnPicker: (selectedIds: Set<string>) => void
  onCloseColumnPicker: () => void
  studentExportTrails: DashboardTrailExportOption[]
  exportingTrailId: string | null
  onExportTrailHistory: (trailId: string) => void
  hasActiveStudentExportFilters: boolean
  nameFilter: string
  onNameFilterChange: (value: string) => void
  pctMin: number
  pctMax: number
  onPctMinChange: (value: number) => void
  onPctMaxChange: (value: number) => void
  nameSortIndicator: string
  onToggleStudentSort: (key: DashboardStudentSortKey) => void
  visibleColumns: DashboardStudentColumnView[]
  studentRowsEmpty: boolean
  paginatedStudentRows: DashboardStudentRowView[]
  showStudentPagination: boolean
  studentPageRange: DashboardPageRange
  sortedFilteredStudentCount: number
  studentPage: number
  studentPageCount: number
  onStudentPagePrev: () => void
  onStudentPageNext: () => void
  studentsCharts: DashboardStudentsChartsView
  studentChartFilter: DashboardStudentChartFilter | null
  onStudentChartFilterChange: (
    filter: DashboardStudentChartFilter | null,
  ) => void
  sortedPillCount: number
  totalPillCount: number
  pillExportTrails: DashboardTrailExportOption[]
  exportingPillTrailId: string | null
  onExportPillTrail: (trailId: string) => void
  pillSearch: string
  onPillSearchChange: (value: string) => void
  pillTrailFilter: string
  onPillTrailFilterChange: (value: string) => void
  pillTrailOptions: DashboardTrailExportOption[]
  pillMinResponses: number
  onPillMinResponsesChange: (value: number) => void
  pillAccMin: number
  pillAccMax: number
  onPillAccMinChange: (value: number) => void
  onPillAccMaxChange: (value: number) => void
  questionsCharts: DashboardQuestionsChartsView
  worstPills: DashboardPillRowView[]
  bestPills: DashboardPillRowView[]
  onTogglePillSort: (key: DashboardPillSortKey) => void
  pillSortIndicator: (key: DashboardPillSortKey) => string
  paginatedPillRows: DashboardPillRowView[]
  showPillPagination: boolean
  pillPageRange: DashboardPageRange
  pillPage: number
  pillPageCount: number
  onPillPagePrev: () => void
  onPillPageNext: () => void
  agentUsage: DashboardAgentUsageView
  agentPeriodDays: DashboardAgentPeriodDays
  onAgentPeriodDaysChange: (days: DashboardAgentPeriodDays) => void
  agentUsageLoading: boolean
  /** Resposta OK sem campo agent_usage (não confundir com empty real). */
  agentUsageUnavailable?: boolean
  /**
   * Dispara carga sob demanda (meta + mode=full) no primeiro clique num KPI.
   * Aditivo — omitir mantém comportamento só de UI.
   */
  onRequestKpiDetail?: () => void
  /** Progresso/acerto ainda calculando após pedir detalhe. */
  progressionKpisLoading?: boolean
  /** Painel de detalhe aguardando meta/full. */
  detailLoading?: boolean
  selectedAgentTrailId: string | null
  onSelectAgentTrailId: (trailId: string | null) => void
  selectedAgentStudents: DashboardAgentStudentLink[]
  /** Fase B — faixas Início/Meio/Final + Parado 7+. */
  journeyBands?: DashboardJourneyBandView[]
  journeyStalledLinkLabel?: string | null
  journeyStalledHref?: string | null
  registeredStudentCount?: number | null
  agentCoverageOfActivePct?: number | null
  gradeOptions?: DashboardPickerItem[]
  selectedGrade?: string | null
  onSelectGrade?: (grade: string | null) => void
  subjectTabs?: DashboardSubjectTabView[]
  selectedSubject?: string | null
  onSelectSubject?: (subject: string | null) => void
  trailFilterOptions?: DashboardPickerItem[]
  selectedTrailId?: string | null
  onSelectTrailId?: (trailId: string | null) => void
  scopeSummary?: {
    studentCount: number
    trailCount: number
    accuracyPct: number | null
    scopeLabel: string
  } | null
  contentSummary?: DashboardContentSummaryView | null
  contentBars?: DashboardContentBarView[]
  selectedContentKey?: string | null
  onSelectContentKey?: (key: string | null) => void
  activityMatrix?: DashboardActivityMatrixView | null
  selectedMatrixCellKey?: string | null
  onSelectMatrixCell?: (key: string | null) => void
  optionDistribution?: DashboardOptionDistributionItem[] | null
  opportunityTab?: DashboardOpportunityTab
  onOpportunityTabChange?: (tab: DashboardOpportunityTab) => void
  opportunityRows?: DashboardOpportunityRowView[]
  opportunityNote?: string | null
  crossOpportunityCards?: Array<{
    key: string
    aula: string
    tema: string
    accuracyPct: number
    doubtsLabel: string
  }>
  crossOpportunityNote?: string | null
  onOpenCrossContent?: (key: string) => void
  tutorSubject?: {
    subjectLabel: string
    periodLabel: string
    messages: number
    students: number
    coveragePct: number | null
    messagesPerDay: number
    perStudentPerDay: number
    perStudentPeriod: number
    topStudents: DashboardAgentStudentLink[]
  } | null
  ranking?: DashboardRankingRowView[]
  rankingScopeLabel?: string | null
  rankingWeights?: { progress: number; interact: number; accuracy: number }
  onRankingWeightsChange?: (next: {
    progress: number
    interact: number
    accuracy: number
  }) => void
  showAllRanking?: boolean
  onToggleShowAllRanking?: () => void
  topicDoubts?: DashboardTopicDoubtView[]
}
