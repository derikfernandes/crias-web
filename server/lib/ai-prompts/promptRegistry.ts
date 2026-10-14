/**
 * Fonte de verdade dos prompts de IA: Firestore `ai_prompts`.
 * Fallbacks em código só se o documento estiver ausente.
 * Versões anteriores em `ai_prompts/{id}/versions`.
 */
import { FieldValue, type Firestore } from 'firebase-admin/firestore'

import { getFallbackPromptBody } from './fallbacks.js'
import {
  AI_PROMPT_IDS,
  AI_PROMPT_META,
  isAiPromptId,
  type AiPromptId,
} from './ids.js'

export type AiPromptRecord = {
  id: AiPromptId
  title: string
  description: string
  body: string
  version: number
  source: 'firestore' | 'fallback'
  updated_at: string | null
  updated_by_email: string | null
  updated_by_uid: string | null
}

export type SeedAiPromptsResult = {
  seeded: AiPromptId[]
  skipped: AiPromptId[]
  forced: AiPromptId[]
}

export type AiPromptVersion = {
  version: number
  body: string
  updated_at: string | null
  updated_by_email: string | null
  updated_by_uid: string | null
  note: string | null
}

export type PromptActor = {
  email: string
  uid: string
}

const memoryCache = new Map<
  string,
  { body: string; version: number; expiresAt: number }
>()

function collectionName(env: NodeJS.ProcessEnv = process.env): string {
  return env.AI_PROMPTS_COLLECTION?.trim() || 'ai_prompts'
}

function cacheTtlMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.AI_PROMPTS_CACHE_MS?.trim()
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n >= 0 ? n : 30_000
}

function tsToIso(value: unknown): string | null {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString()
    } catch {
      return null
    }
  }
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function cacheKey(id: AiPromptId, env: NodeJS.ProcessEnv): string {
  return `${collectionName(env)}:${id}`
}

export function clearAiPromptCache(): void {
  memoryCache.clear()
}

function readBodyFromSnap(data: Record<string, unknown> | undefined): string | null {
  const body = typeof data?.body === 'string' ? data.body.trim() : ''
  return body.length > 0 ? body : null
}

/**
 * Seed automático (só docs ausentes) na primeira leitura de prompts neste
 * processo. Não sobrescreve edits do Master. Garante que produção não fica
 * sem docs no Firestore após deploy (fallback de código cobre o intervalo).
 */
let ensureSeedOnce: Promise<SeedAiPromptsResult | null> | null = null

export async function ensureAiPromptsSeededOnce(
  db: Firestore,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SeedAiPromptsResult | null> {
  if (!ensureSeedOnce) {
    ensureSeedOnce = seedAiPrompts(
      db,
      { email: 'auto-seed@deploy', uid: 'auto-seed' },
      { force: false, env },
    ).catch(() => null)
  }
  return ensureSeedOnce
}

/**
 * Carrega o corpo do prompt (Firestore → fallback). Cache curto em memória.
 */
export async function getPromptBody(
  db: Firestore,
  id: AiPromptId,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ body: string; source: 'firestore' | 'fallback'; version: number }> {
  const ttl = cacheTtlMs(env)
  const key = cacheKey(id, env)
  if (ttl > 0) {
    const hit = memoryCache.get(key)
    if (hit && hit.expiresAt > Date.now()) {
      return {
        body: hit.body,
        source: 'firestore',
        version: hit.version,
      }
    }
  }

  // Best-effort: popula docs ausentes uma vez por cold start.
  await ensureAiPromptsSeededOnce(db, env)

  try {
    const snap = await db.collection(collectionName(env)).doc(id).get()
    if (snap.exists) {
      const data = (snap.data() ?? {}) as Record<string, unknown>
      const body = readBodyFromSnap(data)
      if (body) {
        const version =
          typeof data.version === 'number' && data.version >= 1
            ? data.version
            : 1
        if (ttl > 0) {
          memoryCache.set(key, {
            body,
            version,
            expiresAt: Date.now() + ttl,
          })
        }
        return { body, source: 'firestore', version }
      }
    }
  } catch {
    // Fall through to code fallback.
  }

  return { body: getFallbackPromptBody(id), source: 'fallback', version: 0 }
}

export async function listAiPrompts(
  db: Firestore,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AiPromptRecord[]> {
  await ensureAiPromptsSeededOnce(db, env)
  const col = db.collection(collectionName(env))
  const out: AiPromptRecord[] = []

  for (const id of AI_PROMPT_IDS) {
    const meta = AI_PROMPT_META[id]
    try {
      const snap = await col.doc(id).get()
      if (snap.exists) {
        const data = snap.data() ?? {}
        const body =
          typeof data.body === 'string' && data.body.trim()
            ? data.body
            : getFallbackPromptBody(id)
        out.push({
          id,
          title:
            typeof data.title === 'string' && data.title.trim()
              ? data.title
              : meta.title,
          description:
            typeof data.description === 'string' && data.description.trim()
              ? data.description
              : meta.description,
          body,
          version:
            typeof data.version === 'number' && data.version >= 1
              ? data.version
              : 1,
          source: 'firestore',
          updated_at: tsToIso(data.updated_at),
          updated_by_email:
            typeof data.updated_by_email === 'string'
              ? data.updated_by_email
              : null,
          updated_by_uid:
            typeof data.updated_by_uid === 'string'
              ? data.updated_by_uid
              : null,
        })
        continue
      }
    } catch {
      // fallback row below
    }

    out.push({
      id,
      title: meta.title,
      description: meta.description,
      body: getFallbackPromptBody(id),
      version: 0,
      source: 'fallback',
      updated_at: null,
      updated_by_email: null,
      updated_by_uid: null,
    })
  }

  return out
}

export async function getAiPrompt(
  db: Firestore,
  id: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AiPromptRecord | null> {
  if (!isAiPromptId(id)) return null
  const rows = await listAiPrompts(db, env)
  return rows.find((r) => r.id === id) ?? null
}

export async function listAiPromptVersions(
  db: Firestore,
  id: string,
  env: NodeJS.ProcessEnv = process.env,
  limit = 20,
): Promise<AiPromptVersion[]> {
  if (!isAiPromptId(id)) return []
  const snap = await db
    .collection(collectionName(env))
    .doc(id)
    .collection('versions')
    .orderBy('version', 'desc')
    .limit(Math.min(50, Math.max(1, limit)))
    .get()

  return snap.docs.map((doc) => {
    const data = doc.data() ?? {}
    return {
      version: typeof data.version === 'number' ? data.version : 0,
      body: typeof data.body === 'string' ? data.body : '',
      updated_at: tsToIso(data.updated_at),
      updated_by_email:
        typeof data.updated_by_email === 'string'
          ? data.updated_by_email
          : null,
      updated_by_uid:
        typeof data.updated_by_uid === 'string' ? data.updated_by_uid : null,
      note: typeof data.note === 'string' ? data.note : null,
    }
  })
}

export async function updateAiPrompt(
  db: Firestore,
  id: string,
  body: string,
  actor: PromptActor,
  env: NodeJS.ProcessEnv = process.env,
  note?: string,
): Promise<AiPromptRecord> {
  if (!isAiPromptId(id)) {
    throw new Error(`Prompt id inválido: ${id}`)
  }
  const trimmed = body.trim()
  if (!trimmed) {
    throw new Error('Corpo do prompt não pode ser vazio.')
  }

  const meta = AI_PROMPT_META[id]
  const ref = db.collection(collectionName(env)).doc(id)
  const existing = await ref.get()
  const prev = existing.exists ? existing.data() ?? {} : {}
  const prevVersion =
    typeof prev.version === 'number' && prev.version >= 1 ? prev.version : 0
  const nextVersion = prevVersion + 1

  // Arquiva versão anterior (se havia corpo).
  if (existing.exists && typeof prev.body === 'string' && prev.body.trim()) {
    await ref.collection('versions').doc(String(prevVersion || 1)).set({
      version: prevVersion || 1,
      body: prev.body,
      updated_at: prev.updated_at ?? FieldValue.serverTimestamp(),
      updated_by_email: prev.updated_by_email ?? null,
      updated_by_uid: prev.updated_by_uid ?? null,
      note: prev.note ?? 'versão anterior',
    })
  }

  await ref.set(
    {
      id,
      title: meta.title,
      description: meta.description,
      body: trimmed,
      version: nextVersion,
      updated_at: FieldValue.serverTimestamp(),
      updated_by_email: actor.email.trim().toLowerCase(),
      updated_by_uid: actor.uid,
      note: note?.trim() || null,
    },
    { merge: true },
  )

  // Auditoria leve (quem/quando).
  await db.collection(collectionName(env) + '_audit').add({
    prompt_id: id,
    action: 'update',
    version: nextVersion,
    actor_email: actor.email.trim().toLowerCase(),
    actor_uid: actor.uid,
    created_at: FieldValue.serverTimestamp(),
    note: note?.trim() || null,
    body_length: trimmed.length,
  })

  memoryCache.delete(cacheKey(id, env))

  return {
    id,
    title: meta.title,
    description: meta.description,
    body: trimmed,
    version: nextVersion,
    source: 'firestore',
    updated_at: new Date().toISOString(),
    updated_by_email: actor.email.trim().toLowerCase(),
    updated_by_uid: actor.uid,
  }
}

/**
 * Popula Firestore com os textos corrigidos (fallback atual).
 * Por padrão não sobrescreve docs existentes; use force=true para substituir.
 */
export async function seedAiPrompts(
  db: Firestore,
  actor: PromptActor,
  opts: { force?: boolean; env?: NodeJS.ProcessEnv } = {},
): Promise<SeedAiPromptsResult> {
  const env = opts.env ?? process.env
  const force = Boolean(opts.force)
  const seeded: AiPromptId[] = []
  const skipped: AiPromptId[] = []
  const forced: AiPromptId[] = []

  for (const id of AI_PROMPT_IDS) {
    const ref = db.collection(collectionName(env)).doc(id)
    const snap = await ref.get()
    if (snap.exists && !force) {
      skipped.push(id)
      continue
    }
    const body = getFallbackPromptBody(id)
    await updateAiPrompt(db, id, body, actor, env, force ? 'seed:force' : 'seed')
    if (snap.exists && force) forced.push(id)
    else seeded.push(id)
  }

  clearAiPromptCache()
  return { seeded, skipped, forced }
}
