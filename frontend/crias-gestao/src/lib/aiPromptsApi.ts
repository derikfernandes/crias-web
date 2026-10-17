import { auth } from './firebase'

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return window.location.origin
}

async function masterAuthHeaders(): Promise<HeadersInit> {
  if (!auth?.currentUser) {
    throw new Error('Faça login como Master para continuar.')
  }
  const token = await auth.currentUser.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export type AiPromptRecord = {
  id: string
  title: string
  description: string
  body: string
  version: number
  source: 'firestore' | 'fallback'
  updated_at: string | null
  updated_by_email: string | null
  updated_by_uid: string | null
  /** true quando o texto salvo é igual ao padrão do sistema. */
  is_default?: boolean
}

export type AiPromptVersion = {
  version: number
  body: string
  updated_at: string | null
  updated_by_email: string | null
  updated_by_uid: string | null
  note: string | null
}

export async function fetchAiPrompts(): Promise<AiPromptRecord[]> {
  const url = new URL('/api/ai_prompts', resolveApiBaseUrl())
  const res = await fetch(url.toString(), {
    headers: await masterAuthHeaders(),
  })
  if (!res.ok) {
    let message = `Falha ao listar prompts (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  const body = (await res.json()) as { prompts?: AiPromptRecord[] }
  return Array.isArray(body.prompts) ? body.prompts : []
}

export async function fetchAiPromptVersions(
  id: string,
): Promise<AiPromptVersion[]> {
  const url = new URL('/api/ai_prompts', resolveApiBaseUrl())
  url.searchParams.set('action', 'versions')
  url.searchParams.set('id', id)
  const res = await fetch(url.toString(), {
    headers: await masterAuthHeaders(),
  })
  if (!res.ok) {
    throw new Error(`Falha ao listar versões (HTTP ${res.status}).`)
  }
  const body = (await res.json()) as { versions?: AiPromptVersion[] }
  return Array.isArray(body.versions) ? body.versions : []
}

export async function updateAiPrompt(input: {
  id: string
  body: string
  note?: string
}): Promise<AiPromptRecord> {
  const url = new URL('/api/ai_prompts', resolveApiBaseUrl())
  url.searchParams.set('action', 'update')
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: await masterAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    let message = `Falha ao salvar prompt (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  const body = (await res.json()) as { prompt?: AiPromptRecord }
  if (!body.prompt) throw new Error('Resposta sem prompt.')
  return body.prompt
}

export async function seedAiPrompts(force = false): Promise<{
  seeded: string[]
  skipped: string[]
  forced: string[]
}> {
  const url = new URL('/api/ai_prompts', resolveApiBaseUrl())
  url.searchParams.set('action', 'seed')
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: await masterAuthHeaders(),
    body: JSON.stringify({ force }),
  })
  if (!res.ok) {
    let message = `Falha no seed (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return (await res.json()) as {
    seeded: string[]
    skipped: string[]
    forced: string[]
  }
}

/** Master: aplica o padrão do sistema (v1.1) num prompt. Cria versão nova e auditoria. */
export async function restoreAiPromptDefault(id: string): Promise<AiPromptRecord> {
  const url = new URL('/api/ai_prompts', resolveApiBaseUrl())
  url.searchParams.set('action', 'restore_default')
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: await masterAuthHeaders(),
    body: JSON.stringify({ id }),
  })
  if (!res.ok) {
    let message = `Falha ao aplicar o padrão (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  const body = (await res.json()) as { prompt?: AiPromptRecord }
  if (!body.prompt) throw new Error('Resposta sem prompt.')
  return body.prompt
}
