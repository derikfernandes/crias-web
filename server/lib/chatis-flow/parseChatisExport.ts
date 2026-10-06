import type {
  ChatisFlowVersion,
  ChatisRawExport,
  CriasTrailFlow,
  DeliverySpec,
  EndpointSpec,
  ErrorRoute,
  FlowNodeRef,
  HttpMethod,
  TutorKey,
} from './types'

const BASE_URL = 'https://crias-trilhas.vercel.app'

const HTTP_TYPE_MAP: Record<string, HttpMethod> = {
  GE: 'GET',
  PO: 'POST',
  PU: 'PUT',
  DE: 'DELETE',
  PA: 'PATCH',
}

const TUTOR_TABLE: Array<{
  key: TutorKey
  agentId: number
  blockNameIncludes: string
  systemTrailId: string
  studentTrailId: string
}> = [
  {
    key: 'linguagens',
    agentId: 82,
    blockNameIncludes: 'Linguagens',
    systemTrailId: 'Trilha - Linguagens',
    studentTrailId: 'Tutor - Linguagens',
  },
  {
    key: 'natureza',
    agentId: 83,
    blockNameIncludes: 'Natureza',
    systemTrailId: 'Trilha - Natureza',
    studentTrailId: 'Tutor - Natureza',
  },
  {
    key: 'humanas',
    agentId: 84,
    blockNameIncludes: 'Humanas',
    systemTrailId: 'Trilha - Humanas',
    studentTrailId: 'Tutor - Humanas',
  },
  {
    key: 'matematica',
    agentId: 85,
    blockNameIncludes: 'Matemática',
    systemTrailId: 'Trilha - Matemática',
    studentTrailId: 'Tutor - Matemática',
  },
  {
    key: 'geral',
    agentId: 86,
    blockNameIncludes: 'Geral',
    systemTrailId: 'Trilha - Geral',
    studentTrailId: 'Tutor - Geral',
  },
]

const SUPERVISOR_ROUTES: Record<string, TutorKey> = {
  português: 'linguagens',
  natureza: 'natureza',
  humanas: 'humanas',
  matemática: 'matematica',
  geral: 'geral',
}

const ENTRY_BLOCK_IDS = new Set([
  8221, 8222, 8217, 8223, 8211, 8212, 8213, 8186, 8153, 8145, 8216, 8220, 8152,
])
const ONBOARDING_BLOCK_IDS = new Set([8167, 8168, 8143, 8202, 8169])

const KNOWN_TOP_LEVEL = new Set([
  'builder',
  'scripts',
  'variables',
  'blocks',
  'connections',
])

const trailVarLog = {
  system: {
    trailId: { mode: 'var' as const, name: 'TRAIL_ID' as const },
    messageText: '${CONTENT|IA_ANSWER}',
    sender: 'system' as const,
  },
  student: {
    trailId: { mode: 'var' as const, name: 'TRAIL_ID' as const },
    messageText: '${wait.text}',
    sender: 'student' as const,
  },
}

function delivery(onFreeText?: 'supervisor'): DeliverySpec {
  return {
    present: 'wait_or_content',
    log: trailVarLog,
    onContinue: 'advance',
    ...(onFreeText ? { onFreeText } : {}),
  }
}

/**
 * Extrai versão semântica do nome do builder, ex. `[ONLINE] Crias 2.4` → `2.4`.
 */
export function detectVersionFromBuilderName(
  name: string | undefined | null,
): ChatisFlowVersion | null {
  if (!name || typeof name !== 'string') return null
  const m = name.match(/(\d+\.\d+(?:\.\d+)?)/)
  return m ? m[1] : null
}

function mapHttpMethod(httpType: unknown): HttpMethod {
  if (typeof httpType !== 'string') return 'GET'
  return HTTP_TYPE_MAP[httpType] ?? (httpType as HttpMethod)
}

function pathFromUrl(url: string): string {
  if (url.startsWith(BASE_URL)) return url.slice(BASE_URL.length) || '/'
  try {
    const u = new URL(url)
    return `${u.pathname}${u.search}`
  } catch {
    return url
  }
}

function inferEndpointRole(method: HttpMethod, path: string): string | undefined {
  if (path.includes('phone_number=') && method === 'GET') return 'lookup_student'
  if (path.includes('action=advance_stage')) return 'advance_stage'
  if (path.includes('action=advance_question')) return 'advance_question'
  if (path.includes('action=update_position')) return 'update_position'
  if (path.includes('action=max')) return 'max_question'
  if (path.startsWith('/student_trails/') && method === 'GET') return 'get_enrollment'
  if (path.startsWith('/student_trails/') && method === 'POST') return 'create_enrollment'
  if (path.startsWith('/trail_stage_questions/')) return 'get_question'
  if (path.startsWith('/trail_stages/')) return 'get_stage'
  if (path.startsWith('/trails/?') || path.startsWith('/trails?')) return 'list_trails'
  if (path.startsWith('/trails/')) return 'get_trail'
  if (path.startsWith('/institution')) return 'get_institution'
  if (path.startsWith('/student/') && method === 'POST') return 'create_student'
  if (path.startsWith('/conversation_logs')) return 'conversation_log'
  if (path.startsWith('/student')) return 'get_student'
  return undefined
}

function nodeRef(
  block: NonNullable<ChatisRawExport['blocks']>[number],
): FlowNodeRef {
  const type = block.type
  const kind: FlowNodeRef['kind'] =
    type === 'S' ? 'start' : type === 'E' ? 'end' : 'dialogue'
  return {
    blockId: Number(block.id),
    variable: typeof block.variable === 'string' ? block.variable : null,
    name: String(block.name ?? ''),
    kind,
  }
}

function collectUnknownTopLevel(raw: ChatisRawExport): string[] {
  return Object.keys(raw).filter((k) => !KNOWN_TOP_LEVEL.has(k))
}

function buildEndpoints(raw: ChatisRawExport): EndpointSpec[] {
  const endpoints: EndpointSpec[] = []
  for (const block of raw.blocks ?? []) {
    const blockId = Number(block.id)
    for (const action of block.actions ?? []) {
      if (action.type !== 'H' && action.tool !== 'action.http') continue
      const cfg = (action.config ?? {}) as Record<string, unknown>
      const url = typeof cfg.url === 'string' ? cfg.url : ''
      if (!url) continue
      const method = mapHttpMethod(cfg.httpType)
      const pathTemplate = pathFromUrl(url)
      endpoints.push({
        id: `b${blockId}.a${action.id}`,
        blockId,
        actionId: Number(action.id),
        method,
        pathTemplate,
        fullUrlTemplate: url,
        role: inferEndpointRole(method, pathTemplate),
        bodyTemplate: typeof cfg.body === 'string' ? cfg.body : undefined,
      })
    }
  }
  return endpoints
}

function buildErrorRoutes(raw: ChatisRawExport): ErrorRoute[] {
  const routes: ErrorRoute[] = []
  for (const block of raw.blocks ?? []) {
    const name = String(block.name ?? '')
    const isError =
      /erro/i.test(name) ||
      /^E\d/i.test(name) ||
      /email/i.test(name) ||
      /guardrail/i.test(name) ||
      /sem cadastro.*email/i.test(name)
    if (!isError) continue
    let emailTo: string | undefined
    let trigger: ErrorRoute['trigger'] = 'unknown'
    for (const action of block.actions ?? []) {
      if (action.type === 'E' || action.tool === 'action.email') {
        const cfg = (action.config ?? {}) as Record<string, unknown>
        const to = cfg.to ?? cfg.email ?? cfg.recipient
        if (typeof to === 'string') emailTo = to
        if (/guardrail/i.test(name)) trigger = 'guardrail'
        else if (/sem cadastro/i.test(name)) trigger = 'alert'
        else trigger = 'http_error'
      }
    }
    if (/sem cadastro/i.test(name)) trigger = 'alert'
    routes.push({
      blockId: Number(block.id),
      name,
      emailTo,
      trigger,
    })
  }
  return routes
}

function buildTutoring(raw: ChatisRawExport): CriasTrailFlow['phases']['tutoring'] {
  const tutors = {} as CriasTrailFlow['phases']['tutoring']['tutors']
  for (const row of TUTOR_TABLE) {
    const block = (raw.blocks ?? []).find((b) =>
      String(b.name ?? '').includes(row.blockNameIncludes),
    )
    tutors[row.key] = {
      agentId: row.agentId,
      blockId: block?.id != null ? Number(block.id) : -1,
      labels: {
        systemTrailId: row.systemTrailId,
        studentTrailId: row.studentTrailId,
      },
    }
  }
  return {
    supervisorAgentId: 87,
    routes: { ...SUPERVISOR_ROUTES },
    tutors,
  }
}

function buildProgression(version: ChatisFlowVersion): CriasTrailFlow['phases']['progression'] {
  const httpMode = version === '2.4' ? 'legacy_primitives' : 'facade'
  return {
    resolveTrail: 'first_by_institution',
    skipOnboardingIf: "STATUS == in_progress",
    load: [
      'TOTAL_STAGE',
      'CURRENT_STAGE_NUMBER',
      'CURRENT_QUESTION_NUMBER',
      'MAX_QUESTION_NUMBER',
      'STAGE_TYPE',
      'PROMPT',
      'TRAIL_TITLE',
      'CONTENT',
      'IS_RELEASED',
    ],
    gateReleased: { ifNotReleased: 'offer_tutors_or_wait' },
    byStageType: {
      fixed: delivery('supervisor'),
      exercise: delivery(),
      ai: delivery('supervisor'),
    },
    advance: {
      ifLastStageOfQuestion: ['update_position(stage=1)', 'advance_question'],
      else: ['advance_stage'],
      then: 'reenter_entry',
      httpMode,
    },
    exhausted: 'content_finished_offer_tutors',
  }
}

/**
 * Converte export Chatis (builder JSON) → IR `CriasTrailFlow`.
 * Não muta runtime WhatsApp; só discovery/IR.
 */
export function parseChatisExport(raw: ChatisRawExport): CriasTrailFlow {
  const builder = raw.builder ?? {}
  const version =
    detectVersionFromBuilderName(
      typeof builder.name === 'string' ? builder.name : undefined,
    ) ?? '2.4'

  const blocks = raw.blocks ?? []
  const connections = raw.connections ?? []
  const endpoints = buildEndpoints(raw)
  const tutoring = buildTutoring(raw)

  const entry: FlowNodeRef[] = []
  const onboarding: FlowNodeRef[] = []
  for (const block of blocks) {
    const id = Number(block.id)
    if (ENTRY_BLOCK_IDS.has(id)) entry.push(nodeRef(block))
    if (ONBOARDING_BLOCK_IDS.has(id)) onboarding.push(nodeRef(block))
  }

  return {
    version,
    source: {
      builderId: Number(builder.id ?? 0),
      name: String(builder.name ?? ''),
      timeoutMinutes: Number(builder.timeout ?? 0),
      blockCount: blocks.length,
      connectionCount: connections.length,
      httpActionCount: endpoints.length,
    },
    identity: {
      phonePath: 'contact.phone',
      studentIdVar: 'STUDENT_ID',
    },
    agents: {
      trailAI: { id: 81, role: 'stage_ai' },
      supervisor: { id: 87, routes: { ...SUPERVISOR_ROUTES } },
      tutors: tutoring.tutors,
    },
    variables: (raw.variables ?? []).map((v) => ({
      id: Number(v.id ?? 0),
      name: String(v.variable ?? ''),
      initialValue: String(v.value ?? '0'),
      externalEdit: Boolean(v.externalEdit),
    })),
    scripts: (raw.scripts ?? []).map((s) => ({
      id: Number(s.id ?? 0),
      name: String(s.name ?? ''),
      params: Array.isArray(s.parameters) ? s.parameters.map(String) : [],
      body: String(s.body ?? ''),
    })),
    http: {
      baseUrl: BASE_URL,
      endpoints,
    },
    phases: {
      entry,
      onboarding,
      progression: buildProgression(version),
      tutoring,
      errors: buildErrorRoutes(raw),
    },
    blockIndex: blocks.map((b) => ({
      id: Number(b.id),
      name: String(b.name ?? ''),
      variable: typeof b.variable === 'string' ? b.variable : null,
    })),
    validatorSemantics: 'chatis_false_port_is_on_match',
    rawUnknownFields: collectUnknownTopLevel(raw),
  }
}

/**
 * Parse a partir de string JSON (falha com erro tipado se JSON inválido).
 */
export function parseChatisExportJson(text: string): CriasTrailFlow {
  let raw: unknown
  try {
    raw = JSON.parse(text) as unknown
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new ChatisParseError('invalid_json', `JSON inválido: ${message}`)
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ChatisParseError(
      'schema',
      'Export Chatis deve ser um objeto top-level',
    )
  }
  return parseChatisExport(raw as ChatisRawExport)
}

export class ChatisParseError extends Error {
  readonly code: 'invalid_json' | 'schema'

  constructor(code: 'invalid_json' | 'schema', message: string) {
    super(message)
    this.name = 'ChatisParseError'
    this.code = code
  }
}
