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
  RETIRED_AI_PROMPT_IDS,
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
  /** true quando o texto salvo é igual ao padrão do sistema (fallback do código). */
  is_default: boolean
}

export type SeedAiPromptsResult = {
  seeded: AiPromptId[]
  skipped: AiPromptId[]
  forced: AiPromptId[]
  retired: string[]
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
 * Aposenta docs legados (ex.: spacing_rules / |||) sem tocar nos prompts ativos.
 * Apaga só o documento raiz; subcoleção versions fica como arquivo inerte.
 */
export async function retireObsoleteAiPrompts(
  db: Firestore,
  actor: PromptActor,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string[]> {
  const retired: string[] = []
  const col = db.collection(collectionName(env))
  for (const id of RETIRED_AI_PROMPT_IDS) {
    try {
      const ref = col.doc(id)
      const snap = await ref.get()
      if (!snap.exists) continue
      await ref.delete()
      await db.collection(collectionName(env) + '_audit').add({
        prompt_id: id,
        action: 'retire',
        actor_email: actor.email.trim().toLowerCase(),
        actor_uid: actor.uid,
        created_at: FieldValue.serverTimestamp(),
        note: 'prompt legado removido do runtime (marcador |||)',
      })
      retired.push(id)
    } catch {
      // Best-effort: não quebra leitura/seed de prompts ativos.
    }
  }
  return retired
}

/**
 * Seed automático (só docs ausentes) na primeira leitura de prompts neste
 * processo. Não sobrescreve edits do Master. Garante que produção não fica
 * sem docs no Firestore após deploy (fallback de código cobre o intervalo).
 * Também tenta aposentar docs RETIRED_AI_PROMPT_IDS (ex.: spacing_rules).
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
          // Título e descrição vêm sempre do código (fonte de verdade do catálogo).
          title: meta.title,
          description: meta.description,
          body,
          is_default: body.trim() === getFallbackPromptBody(id).trim(),
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
      is_default: true,
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
    is_default: trimmed === getFallbackPromptBody(id).trim(),
    version: nextVersion,
    source: 'firestore',
    updated_at: new Date().toISOString(),
    updated_by_email: actor.email.trim().toLowerCase(),
    updated_by_uid: actor.uid,
  }
}

/** Nota gravada na versão quando o Master aplica o padrão do sistema. */
export const RESTORE_DEFAULT_NOTE = 'Padrão do sistema (v1.1)'

/**
 * Master: troca o texto salvo pelo padrão do sistema (fallback do código).
 * Usa o mesmo caminho do Salvar: arquiva a versão anterior, cria versão nova
 * e registra auditoria com o Master como autor. Vale também para prompts
 * somente leitura na tela (ex.: criar_trilha_ia).
 */
export async function restoreAiPromptDefault(
  db: Firestore,
  id: string,
  actor: PromptActor,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AiPromptRecord> {
  if (!isAiPromptId(id)) {
    throw new Error(`Prompt id inválido: ${id}`)
  }
  return updateAiPrompt(db, id, getFallbackPromptBody(id), actor, env, RESTORE_DEFAULT_NOTE)
}

/**
 * Popula Firestore com os textos corrigidos (fallback atual).
 * Por padrão não sobrescreve docs existentes; use force=true para substituir.
 */
/** Sinais de seed antigo (pré-remoção ||| / FORMATO WHATSAPP). */
function bodyLooksStaleForFormatting(body: string): boolean {
  return (
    /FORMATO WHATSAPP/i.test(body) ||
    /negrito com um asterisco de cada lado/i.test(body) ||
    /marcador \|\|\|/i.test(body) ||
    /ESPAÇAMENTO OBRIGATÓRIO[\s\S]{0,80}marcador/i.test(body)
  )
}

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
    const existingBody =
      snap.exists && typeof snap.data()?.body === 'string'
        ? String(snap.data()?.body)
        : ''
    const staleFormatting =
      !force &&
      snap.exists &&
      (id === 'gerador_trilha' || id === 'parceiro_estudo') &&
      bodyLooksStaleForFormatting(existingBody)

    if (snap.exists && !force && !staleFormatting) {
      skipped.push(id)
      continue
    }
    const body = getFallbackPromptBody(id)
    await updateAiPrompt(
      db,
      id,
      body,
      actor,
      env,
      force
        ? 'seed:force'
        : staleFormatting
          ? 'seed:format-refresh'
          : 'seed',
    )
    if (snap.exists && (force || staleFormatting)) forced.push(id)
    else seeded.push(id)
  }

  const retired = await retireObsoleteAiPrompts(db, actor, env)

  clearAiPromptCache()
  return { seeded, skipped, forced, retired }
}
