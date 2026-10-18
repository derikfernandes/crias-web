import type {
  StudentMigrationContext,
  StudentMigrationDecision,
} from './types'
import { MIGRATE_STUDENT_CURSOR_POLICY } from './migrate'

/**
 * Política de migração para alunos in-progress no upgrade Chatis 2.4 → 2.5+.
 *
 * Regras (I5 / plano §6):
 * - Firebase `student_trails` **não** é zerado pelo upgrade de JSON.
 * - Cliente 2.5 re-hidrata via resolveStudentByPhone + getStatus / getNextContent.
 * - Pedido explícito de reset **não** autoriza wipe silencioso neste módulo.
 */
export function decideStudentMigration(
  ctx: StudentMigrationContext,
): StudentMigrationDecision {
  void MIGRATE_STUDENT_CURSOR_POLICY

  if (ctx.explicitResetRequested) {
    return {
      action: 'blocked_requires_manual',
      reason:
        'Reset explícito de progresso exige ferramenta ops/admin auditada; parser Chatis nunca wipea student_trails',
      wipeAllowed: false,
    }
  }

  if (ctx.status === 'in_progress') {
    return {
      action: 'rehydrate_via_engine',
      reason:
        'Aluno in-progress: cursor Firebase preservado; sessão Chatis re-hidrata pelo motor (sem confiar em CURRENT_* stale)',
      wipeAllowed: false,
      steps: ['resolveStudentByPhone', 'getStatus', 'getNextContent'],
    }
  }

  if (ctx.status === 'completed' || ctx.status === 'blocked') {
    return {
      action: 'preserve_cursor',
      reason: `Status ${ctx.status}: cursor intocado; apenas o cliente JSON muda`,
      wipeAllowed: false,
    }
  }

  // not_started / outros
  return {
    action: 'preserve_cursor',
    reason:
      'Upgrade de JSON Chatis não muta student_trails; enrollments not_started permanecem',
    wipeAllowed: false,
  }
}

/**
 * Stub documentado: qualquer tentativa de “wipe on migrate” deve falhar closed.
 */
export function assertNoSilentWipe(decision: StudentMigrationDecision): void {
  if (decision.wipeAllowed !== false) {
    throw new Error('Política violada: wipeAllowed deve ser false')
  }
  if (
    decision.action !== 'preserve_cursor' &&
    decision.action !== 'rehydrate_via_engine' &&
    decision.action !== 'blocked_requires_manual'
  ) {
    throw new Error(`Ação de migração desconhecida: ${(decision as { action: string }).action}`)
  }
}

export const STUDENT_MIGRATION_POLICY_DOC = `
# Política de migração — alunos in-progress (Chatis 2.4 → 2.5+)

1. **Estado Firebase intocado** — só muda o cliente (JSON Chatis / app).
2. **Re-hidratação** — 2.5 começa por resolveStudentByPhone + getStatus / getNextContent.
3. **Sem reset** — proibido zerar current_stage_number / current_question_number por upgrade.
4. **Feature flag** — builder 2.4 vs 2.5 pode coexistir por ambiente/instituição.
5. **Tutores** — permanecem no Chatis; IR 2.5 documenta o grafo sem portar ao app v1.
6. **Wipe** — nunca silencioso; reset só via ops/admin auditado (fora deste módulo).
`.trim()
