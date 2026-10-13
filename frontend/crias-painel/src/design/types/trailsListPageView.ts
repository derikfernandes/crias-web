export type TrailsListInstitutionOption = {
  id: string
  label: string
}

export type TrailsListRow = {
  id: string
  name: string
  institutionName: string
  subject: string
  activeLabel: string
  createdAtLabel: string
  detailHref: string
}

export type TrailsListPageViewProps = {
  canCreate: boolean
  institutionOptions: TrailsListInstitutionOption[]
  selectedInstitutionId: string
  onSelectInstitution: (institutionId: string) => void
  search: string
  onSearchChange: (value: string) => void
  rows: TrailsListRow[]
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
