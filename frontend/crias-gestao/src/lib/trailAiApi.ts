import { rolesFromConfig, type GenerationConfig } from './trailConfig'
import { emptyStep, type ActivityDraft, type StepDraft } from './trailActivities'

/**
 * Geração de atividades por IA (INTERFACE.md, orientações 0 a 3).
 * O servidor soma o prompt fixo do sistema ("Criar trilha com IA") à Configuração de
 * geração. Campo vazio vai como "N/A". Nada é gravado aqui: o resultado vira prévia.
 */

export type AiGenerateInput = {
  /** "new": trilha nova (Configuração completa). "append": mais atividades numa trilha existente. */
  mode: 'new' | 'append'
  config: GenerationConfig
  /** Títulos das atividades que já existem (só em "append"). */
  existingTitles?: string[]
  files: File[]
  signal?: AbortSignal
}

type ApiStep = {
  kind?: string
  title?: string
  content?: string
  options?: string[]
  correct?: string | null
}

type ApiActivity = { title?: string; steps?: ApiStep[] }

type ApiResponse = {
  ok?: boolean
  error?: string
  issues?: Array<{ message: string }>
  activities?: ApiActivity[]
}

/** Timeout / detalhes técnicos da IA → mensagem amigável (sem generateContent nem modelo). */
export function friendlyAiGenerateError(message: string): string {
  if (
    /generateContent timeout|timeout após|demorou demais|aborted due to timeout|The operation was aborted/i.test(
      message,
    ) ||
    (/generateContent/i.test(message) && /timeout|tempo|esgotad/i.test(message))
  ) {
    return 'A geração demorou demais. Tente de novo em instantes.'
  }
  return message
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

const ROLE_WORD = { c: 'conteúdo', e: 'exercício', f: 'feedback', k: 'conclusão' } as const

/** Etapas por atividade já com feedback (depois de cada exercício) e conclusão (no fim). */
function generationRoles(cfg: GenerationConfig) {
  return rolesFromConfig({ order: cfg.order, feedback: cfg.feedback, conclusive: cfg.conclusive })
}

/** Variáveis do prompt (INTERFACE.md 1.1.9): chave sem colchetes. */
export function promptVariables(cfg: GenerationConfig): Record<string, string> {
  const na = (v: string | number) => {
    const s = String(v ?? '').trim()
    return s ? s : 'N/A'
  }
  return {
    nome: na(cfg.name),
    materia: na(cfg.subject),
    descricao: na(cfg.description),
    objetivo: na(cfg.objective),
    conteudos: na(cfg.contents),
    exercicios: na(cfg.exercises),
    ordem: na(generationRoles(cfg).map((r) => ROLE_WORD[r]).join(', ')),
    atividades: na(cfg.activities),
    alternativas: na(cfg.options),
    habilidades: na(cfg.skills),
    orientacoes: na(cfg.guidelines),
  }
}

function toStep(raw: ApiStep, stage: number, optionCount: number): StepDraft {
  const kind = raw.kind === 'exercise' || raw.kind === 'e' ? 'e' : 'c'
  if (kind === 'c') {
    return { stage, kind, title: (raw.title ?? '').trim(), content: (raw.content ?? '').trim(), options: [], correct: '' }
  }
  const options = Array.isArray(raw.options) ? raw.options.map((o) => String(o ?? '').trim()) : []
  const padded = options.length > 0 ? options : emptyStep(stage, 'e', optionCount).options
  const letter = (raw.correct ?? '').toString().trim().toUpperCase().slice(0, 1)
  return {
    stage,
    kind,
    title: (raw.title ?? '').trim(),
    content: (raw.content ?? '').trim(),
    options: padded,
    correct: letter,
  }
}

export async function generateActivitiesWithAi(
  input: AiGenerateInput,
): Promise<ActivityDraft[]> {
  const files = await Promise.all(
    input.files.map(async (f) => ({
      filename: f.name,
      mimeType: f.type || 'application/octet-stream',
      base64: await fileToBase64(f),
    })),
  )
  const { gestaoAuthHeaders } = await import('./gestaoAuthHeaders')
  const res = await fetch('/api/ai_trail_generate', {
    method: 'POST',
    headers: await gestaoAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      mode: input.mode,
      variables: promptVariables(input.config),
      // Feedback e conclusão seguem como etapas de conteúdo; o prompt de geração trata a etapa logo após o
      // exercício como feedback e a final como conclusiva.
      structure: generationRoles(input.config).map((r) => (r === 'e' ? 'exercise' : 'content')),
      existing_titles: input.existingTitles ?? [],
      files,
    }),
    signal: input.signal,
  })
  let json: ApiResponse
  try {
    json = (await res.json()) as ApiResponse
  } catch {
    throw new Error(`Resposta inválida do servidor (${res.status}).`)
  }
  if (!res.ok || json.ok === false || !Array.isArray(json.activities)) {
    const issue = json.issues?.[0]?.message
    const raw = json.error ?? issue ?? `Falha na geração (HTTP ${res.status}).`
    throw new Error(friendlyAiGenerateError(raw))
  }
  return json.activities.map((a, i) => ({
    number: i + 1,
    title: (a.title ?? '').trim(),
    released: false,
    steps: (a.steps ?? []).map((s, k) => toStep(s, k + 1, input.config.options)),
  }))
}
