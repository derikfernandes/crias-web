import { PRODUCTION_APP_ORIGIN } from './site'

/**
 * Origem dos links públicos e do campo `public_link`. Sempre o domínio de produção
 * (`crias-trilhas.vercel.app`), salvo override explícito — inclusive em `npm run dev`, para
 * não aparecer `localhost` em URLs compartilháveis.
 * Para links locais raros: `VITE_PUBLIC_APP_ORIGIN=http://localhost:5173` no `.env`.
 */
export function publicAppOrigin(): string {
  const explicit = import.meta.env.VITE_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, '')
  if (explicit) return explicit
  return PRODUCTION_APP_ORIGIN
}

/** Caminho interno da app (respeita `base` do Vite). */
export function institutionPath(id: string): string {
  const base = import.meta.env.BASE_URL
  if (base === '/') return `/instituicoes/${id}`
  return `${base.replace(/\/$/, '')}/instituicoes/${id}`
}

/** URL absoluta (útil no Postman, compartilhar, etc.). */
export function fullInstitutionUrl(id: string): string {
  return `${publicAppOrigin()}${institutionPath(id)}`
}

/** Caminho interno para abrir/editar um aluno no painel. */
export function studentPath(
  id: string,
  options?: { agentTrailId?: string; agentTrailIds?: string[] },
): string {
  const base = import.meta.env.BASE_URL
  const path =
    base === '/'
      ? `/alunos/${id}`
      : `${base.replace(/\/$/, '')}/alunos/${id}`
  const params = new URLSearchParams()
  const agentTrailId = options?.agentTrailId?.trim()
  const aliases = (options?.agentTrailIds ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
  if (aliases.length > 0) {
    params.set('agent_trail_ids', aliases.join(','))
    params.set('agent_trail_id', aliases[0]!)
  } else if (agentTrailId) {
    params.set('agent_trail_id', agentTrailId)
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

/** Caminho interno para abrir/editar uma trilha no painel. */
export function trailPath(id: string): string {
  const base = import.meta.env.BASE_URL
  if (base === '/') return `/trilhas/${id}`
  return `${base.replace(/\/$/, '')}/trilhas/${id}`
}

/** Questões/etapas de um stage específico (collection `trail_stage_questions`). */
export function trailStageQuestionsPath(trailId: string, stageNumber: number): string {
  const base = import.meta.env.BASE_URL
  const sn = String(stageNumber)
  if (base === '/') return `/trilhas/${trailId}/stages/${sn}/questoes`
  return `${base.replace(/\/$/, '')}/trilhas/${trailId}/stages/${sn}/questoes`
}
