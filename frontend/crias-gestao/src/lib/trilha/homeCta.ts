/**
 * Regras de CTA da home aluno — alinhado a next_action (brief §7.2 / UX P0).
 */

export type HomeNextAction =
  | 'deliver_content'
  | 'await_answer'
  | 'await_release'
  | 'blocked'
  | 'completed'

/** Continuar só quando o motor permite ação no player. */
export function homeCanContinue(nextAction: HomeNextAction | null | undefined): boolean {
  return nextAction === 'deliver_content' || nextAction === 'await_answer'
}

export function homeStatusLabel(
  progressStatus: 'in_progress' | 'completed' | 'blocked' | 'not_started',
  nextAction: HomeNextAction | null | undefined,
): string {
  if (nextAction === 'await_release') return 'Aguardando liberação'
  if (nextAction === 'blocked') return 'Bloqueada'
  if (nextAction === 'completed' || progressStatus === 'completed') {
    return 'Concluída'
  }
  if (progressStatus === 'blocked') return 'Bloqueada'
  if (progressStatus === 'not_started') return 'Não iniciada'
  return 'Em andamento'
}

/** CTA amarelo do card: Começar (não iniciada) ou Continuar. */
export function homePrimaryCtaLabel(
  progressStatus: 'in_progress' | 'completed' | 'blocked' | 'not_started',
  nextAction: HomeNextAction | null | undefined,
): string {
  if (progressStatus === 'not_started' && nextAction !== 'completed') {
    return 'Começar'
  }
  return 'Continuar'
}
