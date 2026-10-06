/**
 * IR canónico Chatis → CriasTrailFlow (discovery 02 / plano §6).
 * Discovery-only: não altera o runtime WhatsApp strangler.
 */

export type ChatisFlowVersion = '2.4' | '2.5' | string

export type TutorKey =
  | 'linguagens'
  | 'natureza'
  | 'humanas'
  | 'matematica'
  | 'geral'

export type VariableDecl = {
  id: number
  name: string
  initialValue: string
  externalEdit: boolean
}

export type ScriptDecl = {
  id: number
  name: string
  params: string[]
  body: string
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type EndpointSpec = {
  id: string
  blockId: number
  actionId: number
  method: HttpMethod
  pathTemplate: string
  fullUrlTemplate: string
  /** Papel semântico quando reconhecido (lookup, advance_stage, …). */
  role?: string
  bodyTemplate?: string
  responseBindings?: string[]
}

export type LogTrailId =
  | { mode: 'var'; name: 'TRAIL_ID' }
  | { mode: 'literal'; value: string }

export type LogMapping = {
  trailId: LogTrailId
  messageText: string
  sender: 'system' | 'student'
}

export type DeliverySpec = {
  present: string
  log: { system: LogMapping; student: LogMapping }
  onContinue: 'advance'
  onFreeText?: 'supervisor'
}

export type ProgressionLoop = {
  resolveTrail: 'first_by_institution'
  skipOnboardingIf: "STATUS == in_progress"
  load: string[]
  gateReleased: { ifNotReleased: 'offer_tutors_or_wait' }
  byStageType: {
    fixed: DeliverySpec
    exercise: DeliverySpec
    ai: DeliverySpec
  }
  advance: {
    ifLastStageOfQuestion: Array<'update_position(stage=1)' | 'advance_question'>
    else: Array<'advance_stage'>
    then: 'reenter_entry'
    /** Em 2.5: HTTP fachada em vez de N GETs + ?action= */
    httpMode: 'legacy_primitives' | 'facade'
  }
  exhausted: 'content_finished_offer_tutors'
}

export type FlowNodeRef = {
  blockId: number
  variable: string | null
  name: string
  kind: 'start' | 'end' | 'dialogue'
}

export type ErrorRoute = {
  blockId: number
  name: string
  emailTo?: string
  trigger: 'http_error' | 'save_error' | 'alert' | 'guardrail' | 'unknown'
}

export type TutoringGraph = {
  supervisorAgentId: number
  routes: Record<string, TutorKey>
  tutors: Record<
    TutorKey,
    {
      agentId: number
      blockId: number
      labels: { systemTrailId: string; studentTrailId: string }
    }
  >
}

export type CriasTrailFlow = {
  version: ChatisFlowVersion
  source: {
    builderId: number
    name: string
    timeoutMinutes: number
    blockCount: number
    connectionCount: number
    httpActionCount: number
  }
  identity: {
    phonePath: 'contact.phone'
    studentIdVar: 'STUDENT_ID'
  }
  agents: {
    trailAI: { id: number; role: 'stage_ai' }
    supervisor: { id: number; routes: Record<string, TutorKey> }
    tutors: TutoringGraph['tutors']
  }
  variables: VariableDecl[]
  scripts: ScriptDecl[]
  http: {
    baseUrl: string
    endpoints: EndpointSpec[]
  }
  phases: {
    entry: FlowNodeRef[]
    onboarding: FlowNodeRef[]
    progression: ProgressionLoop
    tutoring: TutoringGraph
    errors: ErrorRoute[]
  }
  /** IDs de blocos crús (para diff / migrate). */
  blockIndex: Array<{ id: number; name: string; variable: string | null }>
  /** Porta Chatis `false` em validators → onMatch no IR. */
  validatorSemantics: 'chatis_false_port_is_on_match'
  rawUnknownFields: string[]
}

/** Export Chatis builder (subconjunto tipado). */
export type ChatisRawExport = {
  builder?: {
    id?: number
    name?: string
    type?: string
    timeout?: number
    token?: unknown
    ingoreSequenceMessage?: boolean
    position?: unknown
    zoom?: number
    [key: string]: unknown
  }
  scripts?: Array<{
    id?: number
    name?: string
    parameters?: string[]
    body?: string
    [key: string]: unknown
  }>
  variables?: Array<{
    id?: number
    variable?: string
    value?: string
    externalEdit?: boolean
    [key: string]: unknown
  }>
  blocks?: Array<{
    id?: number
    name?: string
    variable?: string
    type?: string
    actions?: Array<{
      id?: number
      name?: string
      type?: string
      tool?: string
      variable?: string
      config?: Record<string, unknown>
      next?: Record<string, number | undefined>
      [key: string]: unknown
    }>
    [key: string]: unknown
  }>
  connections?: Array<{
    source?: { id?: number; port?: string }
    target?: { id?: number }
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export type ValidationIssue = {
  code:
    | 'invalid_json'
    | 'missing_required'
    | 'unknown_field'
    | 'unsupported_version'
    | 'schema'
    | 'id_change'
  path: string
  message: string
  severity: 'error' | 'warning'
}

export type ValidationResult = {
  ok: boolean
  version: ChatisFlowVersion | null
  issues: ValidationIssue[]
}

export type DiffChangeKind =
  | 'text_change'
  | 'activity_added'
  | 'activity_removed'
  | 'id_change'
  | 'endpoint_change'
  | 'version_bump'
  | 'unknown_field'
  | 'other'

export type DiffChange = {
  kind: DiffChangeKind
  path: string
  before?: unknown
  after?: unknown
  message: string
}

export type DiffReport = {
  fromVersion: ChatisFlowVersion
  toVersion: ChatisFlowVersion
  changes: DiffChange[]
  summary: {
    textChanges: number
    activitiesAdded: number
    activitiesRemoved: number
    idChanges: number
    endpointChanges: number
  }
}

/**
 * Política de migração de alunos in-progress (I5).
 * Nunca silencia wipe de cursor Firebase.
 */
export type StudentMigrationDecision =
  | {
      action: 'preserve_cursor'
      reason: string
      wipeAllowed: false
    }
  | {
      action: 'rehydrate_via_engine'
      reason: string
      wipeAllowed: false
      steps: Array<
        'resolveStudentByPhone' | 'getStatus' | 'getNextContent'
      >
    }
  | {
      action: 'blocked_requires_manual'
      reason: string
      wipeAllowed: false
    }

export type StudentMigrationContext = {
  studentId: string
  trailId: string
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | string
  fromVersion: ChatisFlowVersion
  toVersion: ChatisFlowVersion
  /** Se true, alguém pediu reset explícito — ainda assim a API não wipea sozinha. */
  explicitResetRequested?: boolean
}
