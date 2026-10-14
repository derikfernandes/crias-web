export type StudentPasswordsInstitutionOption = {
  id: string
  label: string
}

export type StudentPasswordsRow = {
  id: string
  name: string
  phone_number: string
  password: string | null
  has_password_hash: boolean
  has_password_encrypted: boolean
  regenerating?: boolean
}

export type StudentPasswordsImportError = {
  line: number
  nome?: string
  celular?: string
  error: string
}

export type StudentPasswordsPageViewProps = {
  isMaster: boolean
  institutionOptions: StudentPasswordsInstitutionOption[]
  selectedInstitutionId: string
  onSelectInstitution: (id: string) => void
  rows: StudentPasswordsRow[]
  loading: boolean
  error: string | null
  busy: boolean
  onExportCsv: () => void
  onBulkGenerateMissing: () => void
  bulkGenerateLabel?: string
  bulkResultMessage: string | null
  onRegenerate: (studentId: string) => void
  /** Paginação (~50/página) com números clicáveis. */
  page: number
  totalPages: number
  totalRows: number
  pageStart: number
  pageEnd: number
  onPageChange: (page: number) => void
  importCsvText: string
  onImportCsvTextChange: (value: string) => void
  onImportFile: (file: File | null) => void
  onSubmitImport: () => void
  importResultMessage: string | null
  importErrors: StudentPasswordsImportError[]
  onDownloadGeneratedCsv: (() => void) | null
}
