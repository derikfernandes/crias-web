/**
 * Cliente Gemini via Generative Language API ou Vertex AI `generateContent`.
 * Credenciais só via env Vercel — nunca hardcoded.
 *
 * Rotas:
 * - VERTEX_PROJECT_ID (+ VERTEX_LOCATION / VERTEX_MODEL opcionais) + OAuth → Vertex AI
 * - OAuth sem VERTEX_* → Generative Language (scope generative-language ou cloud-platform)
 * - GEMINI_API_KEY → Generative Language `?key=` (sem OAuth)
 *
 * Vertex (preferir env 100%): defaults recomendados `global` + `gemini-3.7-flash`.
 * URL: `https://aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent`
 * (host regional `{location}-aiplatform.googleapis.com` quando location ≠ `global`).
 */

export type GeminiGenerateInput = {
  systemInstruction: string
  userText: string
}

export type GeminiGenerateResult = {
  text: string
  model: string
}

/** Scopes mínimos documentados para o refresh token OAuth. */
export const GOOGLE_OAUTH_SCOPES = {
  /** Vertex AI / AI Platform generateContent */
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  /** Generative Language API (AI Studio / generativelanguage.googleapis.com) */
  generativeLanguage: 'https://www.googleapis.com/auth/generative-language',
} as const

/** Default Vertex quando VERTEX_LOCATION omitido — caminho global (Gemini 3.x). */
export const DEFAULT_VERTEX_LOCATION = 'global'

/** Default Vertex quando VERTEX_MODEL omitido. */
export const DEFAULT_VERTEX_MODEL = 'gemini-3.7-flash'

/** Default Generative Language / AI Studio. */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'

function readEnv(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const v = env[name]
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Aliases AI Studio → IDs publisher Vertex (só modelos 1.5/2.0 conhecidos).
 * `gemini-3.7-flash` e outros IDs explícitos passam intactos.
 */
export function normalizeVertexModelId(model: string): string {
  const m = model.trim()
  if (m === 'gemini-2.0-flash') return 'gemini-2.0-flash-001'
  if (m === 'gemini-2.0-flash-lite') return 'gemini-2.0-flash-lite-001'
  if (m === 'gemini-1.5-flash') return 'gemini-1.5-flash-002'
  if (m === 'gemini-1.5-pro') return 'gemini-1.5-pro-002'
  return m
}

/** Família Flash (inclui -001 / -lite / 3.x) — útil para docs/mensagens. */
export function isGeminiFlashFamilyModel(model: string): boolean {
  return /gemini-[\w.-]*flash/i.test(model.trim())
}

export function resolveGeminiModel(env: NodeJS.ProcessEnv = process.env): string {
  return readEnv('GEMINI_MODEL', env) || DEFAULT_GEMINI_MODEL
}

/** Modelo efetivo: VERTEX_MODEL quando no caminho Vertex; senão GEMINI_MODEL. */
export function resolveTrailAiModel(
  env: NodeJS.ProcessEnv = process.env,
  opts: { useVertex: boolean } = { useVertex: false },
): string {
  if (opts.useVertex) {
    const raw =
      readEnv('VERTEX_MODEL', env) ||
      readEnv('GEMINI_MODEL', env) ||
      DEFAULT_VERTEX_MODEL
    return normalizeVertexModelId(raw)
  }
  return resolveGeminiModel(env)
}

export function isTrailAiDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readEnv('TRAIL_AI_DISABLED', env) === '1'
}

export type VertexTarget = {
  projectId: string
  location: string
}

/**
 * Location efetiva: respeita VERTEX_LOCATION (ou default).
 * Não remapeia `global` → região — `global` + `gemini-3.7-flash` é o caminho suportado.
 */
export function resolveEffectiveVertexLocation(
  rawLocation: string,
  _model?: string,
): { location: string; remappedFromGlobal: boolean } {
  const location = rawLocation.trim() || DEFAULT_VERTEX_LOCATION
  return { location, remappedFromGlobal: false }
}

/**
 * VERTEX_* ativos quando project está setado.
 * Location/model: env se setada; senão defaults `global` / `gemini-3.7-flash`.
 */
export function resolveVertexTarget(
  env: NodeJS.ProcessEnv = process.env,
  modelForLocation?: string,
): VertexTarget | null {
  const projectId = readEnv('VERTEX_PROJECT_ID', env)
  if (!projectId) return null

  const rawLocation = readEnv('VERTEX_LOCATION', env) || DEFAULT_VERTEX_LOCATION
  const model =
    modelForLocation || resolveTrailAiModel(env, { useVertex: true })
  const { location } = resolveEffectiveVertexLocation(rawLocation, model)
  return { projectId, location }
}

function generativeLanguageBase(env: NodeJS.ProcessEnv): string {
  return (
    readEnv('GOOGLE_AI_API_BASE', env) ||
    'https://generativelanguage.googleapis.com/v1beta'
  )
}

/**
 * URL Vertex AI generateContent.
 * location=global → host aiplatform.googleapis.com; senão {location}-aiplatform.googleapis.com
 */
export function buildVertexGenerateContentUrl(
  target: VertexTarget,
  model: string,
): string {
  const { projectId, location } = target
  const host =
    location === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${location}-aiplatform.googleapis.com`
  return (
    `${host}/v1/projects/${encodeURIComponent(projectId)}` +
    `/locations/${encodeURIComponent(location)}` +
    `/publishers/google/models/${encodeURIComponent(model)}:generateContent`
  )
}

async function fetchAccessToken(
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const clientId = readEnv('GOOGLE_OAUTH_CLIENT_ID', env)
  const clientSecret = readEnv('GOOGLE_OAUTH_CLIENT_SECRET', env)
  const refreshToken = readEnv('GOOGLE_OAUTH_REFRESH_TOKEN', env)
  if (!clientId || !clientSecret || !refreshToken) return null

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(
      `OAuth refresh falhou (${res.status}): ${errText.slice(0, 200)}`,
    )
  }
  const json = (await res.json()) as { access_token?: unknown }
  return typeof json.access_token === 'string' ? json.access_token : null
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const candidates = (payload as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates) || candidates.length === 0) return ''
  const first = candidates[0] as { content?: { parts?: unknown } }
  const parts = first?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .map((p) =>
      p && typeof p === 'object' && typeof (p as { text?: unknown }).text === 'string'
        ? (p as { text: string }).text
        : '',
    )
    .join('')
    .trim()
}

function isInsufficientScopeError(status: number, errText: string): boolean {
  if (status !== 403) return false
  const lower = errText.toLowerCase()
  return (
    lower.includes('access_token_scope_insufficient') ||
    lower.includes('insufficient authentication scopes') ||
    lower.includes('insufficientpermissions')
  )
}

function isPublisherModelNotFound(status: number, errText: string): boolean {
  if (status !== 404) return false
  const lower = errText.toLowerCase()
  return (
    lower.includes('publisher model') ||
    lower.includes('was not found') ||
    lower.includes('does not have access')
  )
}

function scopeGuidance(useVertex: boolean): string {
  const cloud = GOOGLE_OAUTH_SCOPES.cloudPlatform
  const gen = GOOGLE_OAUTH_SCOPES.generativeLanguage
  if (useVertex) {
    return (
      `OAuth sem scope suficiente para Vertex AI. Renove o refresh token com ` +
      `${cloud} — ou use GEMINI_API_KEY (Generative Language, sem OAuth) em Preview+Production e remova o trio GOOGLE_OAUTH_* se não precisar de Vertex.`
    )
  }
  return (
    `OAuth sem scope suficiente para Generative Language. Renove o refresh token com ` +
    `${gen} e/ou ${cloud}; ou sete VERTEX_PROJECT_ID + VERTEX_LOCATION (com OAuth ${cloud}) para usar Vertex; ` +
    `ou use GEMINI_API_KEY (caminho mais simples, sem OAuth scopes).`
  )
}

function vertex404Guidance(location: string, model: string): string {
  return (
    `Modelo/região Vertex não encontrados (location=${location}, model=${model}). ` +
    `No Vercel (crias-trilhas) defina VERTEX_PROJECT_ID, VERTEX_LOCATION=${DEFAULT_VERTEX_LOCATION} e ` +
    `VERTEX_MODEL=${DEFAULT_VERTEX_MODEL} (ex.: crias-mvp / global / gemini-3.7-flash). ` +
    `Preview+Production → Redeploy.`
  )
}

/**
 * Chama `models/{model}:generateContent` (Generative Language) ou
 * Vertex `publishers/google/models/{model}:generateContent` quando VERTEX_* + OAuth.
 * Preferência auth: OAuth refresh; fallback: `GEMINI_API_KEY` (só Generative Language).
 */
export async function generateContentWithGemini(
  input: GeminiGenerateInput,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<GeminiGenerateResult> {
  if (isTrailAiDisabled(env)) {
    throw new Error('TRAIL_AI_DISABLED=1 — geração desligada.')
  }

  const accessToken = await fetchAccessToken(env, fetchImpl)
  const apiKey = readEnv('GEMINI_API_KEY', env)

  const modelForVertex = resolveTrailAiModel(env, { useVertex: true })
  const vertex = resolveVertexTarget(env, modelForVertex)
  const useVertex = Boolean(vertex && accessToken)
  const model = useVertex
    ? modelForVertex
    : resolveTrailAiModel(env, { useVertex: false })

  let url: URL
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (useVertex && vertex) {
    url = new URL(buildVertexGenerateContentUrl(vertex, model))
    headers.Authorization = `Bearer ${accessToken}`
  } else {
    const base = generativeLanguageBase(env).replace(/\/+$/, '')
    url = new URL(`${base}/models/${encodeURIComponent(model)}:generateContent`)
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    } else if (apiKey) {
      url.searchParams.set('key', apiKey)
    } else {
      throw new Error(
        'Gemini/Vertex não configurado. No projeto Vercel (crias-trilhas): Settings → Environment Variables → ' +
          'defina GEMINI_API_KEY (caminho mais simples) em Preview e Production; ' +
          'ou GOOGLE_OAUTH_* + VERTEX_PROJECT_ID + VERTEX_LOCATION (OAuth com scope cloud-platform); ' +
          'ou só GOOGLE_OAUTH_* com scope generative-language. Redeploy o Preview depois de salvar.',
      )
    }
  }

  const body = {
    systemInstruction: {
      parts: [{ text: input.systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: input.userText }],
      },
    ],
  }

  const res = await fetchImpl(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (isInsufficientScopeError(res.status, errText)) {
      throw new Error(
        `generateContent falhou (403): ${scopeGuidance(useVertex)} Detalhe: ${errText.slice(0, 180)}`,
      )
    }
    if (useVertex && vertex && isPublisherModelNotFound(res.status, errText)) {
      throw new Error(
        `generateContent falhou (404): ${vertex404Guidance(vertex.location, model)} Detalhe: ${errText.slice(0, 180)}`,
      )
    }
    throw new Error(
      `generateContent falhou (${res.status}): ${errText.slice(0, 300)}`,
    )
  }

  const json = (await res.json()) as unknown
  const text = extractText(json)
  if (!text) {
    throw new Error('generateContent devolveu texto vazio.')
  }

  return { text, model }
}
