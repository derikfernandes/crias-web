import type { ContentEtapa, StructurePhase } from './trailEditor'

export type AiTrailDraft = {
  name: string
  description: string
  subject: string
  default_total_steps_per_stage: number
  active: boolean
  structurePhases: StructurePhase[]
  contentEtapas: ContentEtapa[]
}

export type AiTrailGenerateResponse = {
  ok: boolean
  error?: string
  issues?: Array<{ code: string; message: string; path?: string }>
  model?: string
  repaired?: boolean
  truncatedSources?: boolean
  totalSourceChars?: number
  trail?: unknown
  draft?: AiTrailDraft
  defaultPrompt?: string
  limits?: {
    maxFiles: number
    maxFileBytes: number
    maxTotalChars: number
    accepted: string[]
  }
}

function apiBase(): string {
  // Mesmo host (Vercel rewrite /ai_trail_generate → /api/ai_trail_generate)
  return ''
}

export async function fetchDefaultAiTrailPrompt(): Promise<string> {
  const res = await fetch(`${apiBase()}/api/ai_trail_generate`, {
    method: 'GET',
  })
  if (!res.ok) {
    throw new Error(`Não foi possível carregar o prompt padrão (${res.status}).`)
  }
  const json = (await res.json()) as AiTrailGenerateResponse
  return json.defaultPrompt ?? ''
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

export async function generateAiTrailFromFiles(input: {
  files: File[]
  prompt: string
  signal?: AbortSignal
}): Promise<AiTrailGenerateResponse> {
  const files = await Promise.all(
    input.files.map(async (f) => ({
      filename: f.name,
      mimeType: f.type || 'application/octet-stream',
      base64: await fileToBase64(f),
    })),
  )

  const res = await fetch(`${apiBase()}/api/ai_trail_generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: input.prompt, files }),
    signal: input.signal,
  })

  let json: AiTrailGenerateResponse
  try {
    json = (await res.json()) as AiTrailGenerateResponse
  } catch {
    throw new Error(`Resposta inválida do servidor (${res.status}).`)
  }

  if (!res.ok && !json.error) {
    json.error = `Erro HTTP ${res.status}`
    json.ok = false
  }
  return json
}
