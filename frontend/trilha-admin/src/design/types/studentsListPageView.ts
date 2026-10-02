export type StudentsListInstitutionOption = {
  id: string
  label: string
}

export type StudentsListTrailOption = {
  id: string
  label: string
}

export type StudentsListRow = {
  id: string
  name: string
  institutionName: string
  phone: string
  schoolLevel: string
  schoolGrade: string
  studentLevel: string
  activeLabel: string
  createdAtLabel: string
  detailHref: string
  /** Situação calculada no container (Fase B). */
  situationLabel: string
  situationTone:
    | 'concluiu'
    | 'final'
    | 'meio'
    | 'inicio'
    | 'parado'
    | 'nao-iniciou'
  lastInteractionLabel?: string | null
  selected?: boolean
}

export type StudentsListPageViewProps = {
  canCreate: boolean
  institutionOptions: StudentsListInstitutionOption[]
  selectedInstitutionId: string
  onSelectInstitution: (institutionId: string) => void
  search: string
  onSearchChange: (value: string) => void
  rows: StudentsListRow[]
  loading: boolean
  error: string | null
  filteredCount: number
  page: number
  totalPages: number
  pageStart: number
  pageEnd: number
  onPreviousPage: () => void
  onNextPage: () => void
  /** Filtros opcionais Fase B */
  trailOptions?: StudentsListTrailOption[]
  selectedTrailId?: string
  onSelectTrail?: (trailId: string) => void
  gradeOptions?: string[]
  selectedGrade?: string
  onSelectGrade?: (grade: string) => void
  situationFilterOptions?: { id: string; label: string }[]
  selectedSituation?: string
  onSelectSituation?: (situation: string) => void
  /** Bulk: só renderiza se callbacks existirem */
  selectedCount?: number
  onToggleRowSelected?: (id: string) => void
  onToggleSelectAll?: () => void
  allPageSelected?: boolean
  onBulkDeactivate?: () => void
  onBulkExport?: () => void
  onBulkLink?: () => void
  bulkLinkTrailOptions?: { id: string; label: string }[]
  bulkLinkTrailId?: string
  onBulkLinkTrailIdChange?: (trailId: string) => void
  bulkBusy?: boolean
  canImport?: boolean
  onImportClick?: () => void
}
