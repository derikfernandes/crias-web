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
  /** Progresso % liberado quando o container calcular. */
  progressPct?: number | null
  accuracyPct?: number | null
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

export type StudentDetailLinkableTrail = {
  id: string
  label: string
}

/** Bloco “aprendizagem” — só renderiza se o container passar. */
export type StudentDetailLearningStat = {
  subject: string
  label: string
  valueLabel: string
}

export type StudentDetailPageViewOkProps = {
  status: 'ok'
  error: string | null
  loading: boolean
  notFound: boolean
  formSlot?: ReactNode
  hasStudent: boolean
  /** Cabeçalho do perfil (Fase A). */
  studentName?: string | null
  schoolGrade?: string | null
  schoolLevel?: string | null
  studentLevelLabel?: string | null
  lastInteractionLabel?: string | null
  activeLabel?: string | null
  backHref?: string
  onDeactivate?: (() => void) | null
  deactivateBusy?: boolean
  learningStats?: StudentDetailLearningStat[]
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
  chatFilterLabel?: string | null
  onChatFilterChange?: ((filter: 'all' | 'trail' | 'tutors') => void) | null
  chatFilter?: 'all' | 'trail' | 'tutors' | null
}

export type StudentDetailPageViewProps =
  | { status: 'missing-id' }
  | StudentDetailPageViewOkProps
