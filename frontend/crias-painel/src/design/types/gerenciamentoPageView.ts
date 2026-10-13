export type GerenciamentoInstitutionOption = {
  id: string
  label: string
}

export type GerenciamentoTrailOption = {
  id: string
  label: string
}

export type GerenciamentoTrailRow = {
  id: string
  name: string
  subject: string
  activeLabel: string
  updatedAtLabel: string
  detailHref: string
  deleting: boolean
}

export type GerenciamentoStudentRow = {
  id: string
  name: string
  trailLabel: string
  stageLabel: string
  questionLabel: string
  statusLabel: string
  phone: string
  schoolLabel: string
  studentLevel: string
  activeLabel: string
  createdAtLabel: string
  updatedAtLabel: string
  detailHref: string
}

export type GerenciamentoPageViewProps = {
  loadingInst: boolean
  institutionOptions: GerenciamentoInstitutionOption[]
  selectedId: string | null
  onSelectInstitution: (id: string | null) => void
  trailOptions: GerenciamentoTrailOption[]
  selectedTrailId: string | null
  onSelectTrail: (id: string | null) => void
  loadingTrails: boolean
  instError: string | null
  selectedInstitutionName: string
  selectedInstitutionType: string
  selectedInstitutionActiveLabel: string
  selectedInstitutionCreatedAtLabel: string
  selectedInstitutionUpdatedAtLabel: string
  institutionDetailHref: string
  newTrailHref: string
  trailsError: string | null
  trailRows: GerenciamentoTrailRow[]
  onDeleteTrail: (trailId: string) => void
  loadingStudents: boolean
  loadingStudentTrails: boolean
  studentsError: string | null
  studentTrailsError: string | null
  studentRows: GerenciamentoStudentRow[]
  studentsEmptyMessage: string
  studentSearch: string
  onStudentSearchChange: (value: string) => void
  filteredStudentsCount: number
  totalStudentsCount: number
  studentsPage: number
  studentsTotalPages: number
  studentsPageStart: number
  studentsPageEnd: number
  onPreviousStudentsPage: () => void
  onNextStudentsPage: () => void
}
