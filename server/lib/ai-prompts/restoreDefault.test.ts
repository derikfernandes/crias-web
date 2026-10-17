import { describe, expect, it, vi } from 'vitest'

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'ts' },
}))

import { getFallbackPromptBody } from './fallbacks'
import { RESTORE_DEFAULT_NOTE, restoreAiPromptDefault } from './promptRegistry'

/** Firestore em memória mínimo: doc().get/set, collection().add e subcoleções. */
function fakeDb() {
  const docs = new Map<string, Record<string, unknown>>()
  const added: { path: string; data: Record<string, unknown> }[] = []
  const col = (path: string): any => ({
    doc: (id: string) => {
      const p = `${path}/${id}`
      return {
        get: async () => ({ exists: docs.has(p), data: () => docs.get(p) }),
        set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
          docs.set(p, opts?.merge ? { ...(docs.get(p) ?? {}), ...data } : data)
        },
        collection: (sub: string) => col(`${p}/${sub}`),
      }
    },
    add: async (data: Record<string, unknown>) => {
      added.push({ path, data })
    },
  })
  return { db: { collection: col } as any, docs, added }
}

describe('restoreAiPromptDefault', () => {
  it('aplica o padrão do código, arquiva a versão anterior e audita com o Master', async () => {
    const { db, docs, added } = fakeDb()
    docs.set('ai_prompts/criar_trilha_ia', { body: 'texto antigo', version: 2 })
    const env = {} as NodeJS.ProcessEnv
    const out = await restoreAiPromptDefault(
      db,
      'criar_trilha_ia',
      { email: 'Derik@crias.ai', uid: 'u1' },
      env,
    )
    expect(out.version).toBe(3)
    expect(out.is_default).toBe(true)
    const saved = docs.get('ai_prompts/criar_trilha_ia')!
    expect(saved.body).toBe(getFallbackPromptBody('criar_trilha_ia').trim())
    expect(String(saved.body)).toMatch(/\[nome\]/)
    expect(saved.updated_by_email).toBe('derik@crias.ai')
    expect(saved.note).toBe(RESTORE_DEFAULT_NOTE)
    expect(docs.get('ai_prompts/criar_trilha_ia/versions/2')?.body).toBe('texto antigo')
    expect(added).toHaveLength(1)
    expect(added[0].path).toBe('ai_prompts_audit')
    expect(added[0].data.actor_email).toBe('derik@crias.ai')
  })

  it('recusa id desconhecido', async () => {
    const { db } = fakeDb()
    await expect(
      restoreAiPromptDefault(db, 'spacing_rules', { email: 'a@b', uid: 'u' }, {} as NodeJS.ProcessEnv),
    ).rejects.toThrow(/inválido/)
  })
})
