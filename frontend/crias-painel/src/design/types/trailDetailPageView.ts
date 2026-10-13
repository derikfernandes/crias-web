import type { ReactNode } from 'react'

export type TrailDetailCadastroSummary = {
  name: string
  id: string
  subject: string
  description: string
  activeLabel: string
  createdAtLabel: string
  updatedAtLabel: string
}

export type TrailDetailEligibleStudent = {
  id: string
  name: string
  isAdding: boolean
}

export type TrailDetailStudentTrailRow = {
  id: string
  studentHref: string
  /** Quando null, a view renderiza o `studentId` como `<code>`. */
  studentName: string | null
  studentId: string
  phoneLabel: string | null
  stageDisplay: number
  questionDisplay: number
  status: string
  startedAtLabel: string
  lastInteractionAtLabel: string
  selected: boolean
  selectAriaLabel: string
}

export type TrailDetailPageViewOkProps = {
  status: 'ok'
  error: string | null
  loading: boolean
  notFound: boolean

  activeTab: 'structure' | 'content' | 'students'
  onActiveTabChange: (tab: 'structure' | 'content' | 'students') => void
  institutionLabel: string
  showTrailForm: boolean
  onToggleTrailForm: () => void
  cadastro: TrailDetailCadastroSummary | null
  editFormSlot?: ReactNode

  loadingStages: boolean
  stagesError: string | null
  structureError: string | null
  structureEditorSlot?: ReactNode

  loadingStageQuestions: boolean
  stageQuestionsError: string | null
  contentEditorSlot?: ReactNode

  loadingStudentTrails: boolean
  canExportXlsx: boolean
  onExportXlsx: () => void
  showBulkEditor: boolean
  canToggleBulkEditor: boolean
  onToggleBulkEditor: () => void
  showAddStudentPicker: boolean
  canAddStudent: boolean
  onToggleAddStudentPicker: () => void

  missingInstitution: boolean
  institutionStudentsError: string | null
  loadingInstitutionStudents: boolean
  studentPickerFilter: string
  onStudentPickerFilterChange: (value: string) => void
  addStudentError: string | null
  institutionStudentsCount: number
  eligibleStudentsCount: number
  filteredEligibleStudents: TrailDetailEligibleStudent[]
  canMutateStudents: boolean
  addingStudentId: string | null
  onAddStudent: (studentId: string) => void

  bulkStage: string
  onBulkStageChange: (value: string) => void
  bulkQuestion: string
  onBulkQuestionChange: (value: string) => void
  stageOptions: number[]
  questionOptions: number[]
  bulkBusy: boolean
  selectedCount: number
  canApplyBulk: boolean
  onApplyBulk: () => void
  bulkError: string | null
  bulkSuccess: string | null

  studentTrailsError: string | null
  hasStudentTrails: boolean
  totalStudentTrailsCount: number
  studentSearch: string
  onStudentSearchChange: (value: string) => void
  filterStage: string
  onFilterStageChange: (value: string) => void
  filterQuestion: string
  onFilterQuestionChange: (value: string) => void
  onClearFilters: () => void
  filteredStudentTrailsCount: number
  studentTrailRows: TrailDetailStudentTrailRow[]
  studentTrailsPage: number
  studentTrailsTotalPages: number
  studentTrailsPageStart: number
  studentTrailsPageEnd: number
  onPreviousStudentTrailsPage: () => void
  onNextStudentTrailsPage: () => void
  allStudentTrailsSelected: boolean
  onToggleSelectAllStudentTrails: () => void
  onToggleStudentTrailSelection: (rowId: string) => void
}

export type TrailDetailPageViewProps =
  | { status: 'missing-id' }
  | TrailDetailPageViewOkProps
