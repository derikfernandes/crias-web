import type { FormEvent, ReactNode } from 'react'

export type StudentDetailTrailRow = {
  id: string
  trailHref: string
  trailLabel: string
  trailIdSecondary: string | null
  inactiveHint: boolean
  isEditing: boolean
  stageDisplay: string | number
  questionDisplay: string | number
  status: string
  startedAtLabel: string
  lastInteractionAtLabel: string
}

export type StudentDetailLinkableTrail = {
  id: string
  label: string
}

export type StudentDetailPageViewOkProps = {
  status: 'ok'
  error: string | null
  loading: boolean
  notFound: boolean
  formSlot?: ReactNode
  hasStudent: boolean
  loadingTrails: boolean
  trailsError: string | null
  editError: string | null
  trailRows: StudentDetailTrailRow[]
  editStage: string
  editQuestion: string
  editStatus: string
  editBusy: boolean
  onEditStageChange: (value: string) => void
  onEditQuestionChange: (value: string) => void
  onEditStatusChange: (value: string) => void
  onStartEditTrail: (rowId: string) => void
  onCancelEditTrail: () => void
  onSaveTrailPosition: (rowId: string) => void
  onUnlinkTrail: (rowId: string) => void
  missingInstitutionId: boolean
  institutionTrailsError: string | null
  linkError: string | null
  linkTrailId: string
  onLinkTrailIdChange: (value: string) => void
  linkStatus: string
  onLinkStatusChange: (value: string) => void
  linkBusy: boolean
  loadingInstitutionTrails: boolean
  linkableTrails: StudentDetailLinkableTrail[]
  onLinkTrailSubmit: (e: FormEvent) => void
  loadingLogs: boolean
  logsError: string | null
  logsEmpty: boolean
  chatSlot?: ReactNode
  /** Filtro vindo do dashboard de agentes (`?agent_trail_id=`). */
  agentHistoryFilterLabel: string | null
  onClearAgentHistoryFilter: (() => void) | null
}

export type StudentDetailPageViewProps =
  | { status: 'missing-id' }
  | StudentDetailPageViewOkProps
