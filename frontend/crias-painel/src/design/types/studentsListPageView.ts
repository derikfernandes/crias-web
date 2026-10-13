export type StudentsListInstitutionOption = {
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
}
