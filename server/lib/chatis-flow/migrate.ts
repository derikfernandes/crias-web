import type { CriasTrailFlow, EndpointSpec } from './types'

const FACADE_ENDPOINTS: EndpointSpec[] = [
  {
    id: 'facade.next-content',
    blockId: -1,
    actionId: -1,
    method: 'GET',
    pathTemplate:
      '/student/trails/${TRAIL_ID}/next-content?student_id=${STUDENT_ID}',
    fullUrlTemplate:
      'https://crias-trilhas.vercel.app/student/trails/${TRAIL_ID}/next-content?student_id=${STUDENT_ID}',
    role: 'next_content',
  },
  {
    id: 'facade.advance',
    blockId: -1,
    actionId: -1,
    method: 'POST',
    pathTemplate: '/student/trails/${TRAIL_ID}/advance',
    fullUrlTemplate:
      'https://crias-trilhas.vercel.app/student/trails/${TRAIL_ID}/advance',
    role: 'advance',
    bodyTemplate:
      '{"student_id":"${STUDENT_ID}","idempotency_key":"${IDEMPOTENCY_KEY}","channel":"whatsapp"}',
  },
]

const LEGACY_PROGRESSION_ROLES = new Set([
  'get_enrollment',
  'get_trail',
  'max_question',
  'get_stage',
  'get_question',
  'advance_stage',
  'advance_question',
  'update_position',
  'list_trails',
])

/**
 * Migra IR 2.4 → 2.5: progression passa a facade HTTP (next-content / advance).
 * Mantém lookup/cadastro/logs/tutores (strangler — não quebra runtime 2.4).
 * Não toca em `student_trails` Firebase.
 */
export function migrateFlow24To25(flow: CriasTrailFlow): CriasTrailFlow {
  if (flow.version !== '2.4' && !String(flow.version).startsWith('2.4')) {
    // Já ≥ 2.5: clone defensivo com version stamp
    return {
      ...flow,
      version: flow.version === '2.5' ? '2.5' : flow.version,
      phases: {
        ...flow.phases,
        progression: {
          ...flow.phases.progression,
          advance: {
            ...flow.phases.progression.advance,
            httpMode: 'facade',
          },
        },
      },
    }
  }

  const kept = flow.http.endpoints.filter(
    (e) => !e.role || !LEGACY_PROGRESSION_ROLES.has(e.role),
  )

  return {
    ...flow,
    version: '2.5',
    source: {
      ...flow.source,
      name: flow.source.name.replace(/2\.4\b/, '2.5'),
    },
    http: {
      ...flow.http,
      endpoints: [...kept, ...FACADE_ENDPOINTS],
    },
    phases: {
      ...flow.phases,
      progression: {
        ...flow.phases.progression,
        // Em 2.5 o load é colapsado na fachada next-content
        load: ['NEXT_CONTENT_BUNDLE'],
        advance: {
          ifLastStageOfQuestion: ['update_position(stage=1)', 'advance_question'],
          else: ['advance_stage'],
          then: 'reenter_entry',
          httpMode: 'facade',
        },
      },
    },
  }
}

/**
 * Stub: documenta que a migração de aluno NÃO é feita por este módulo.
 * Cursor Firebase permanece; só o IR/cliente muda.
 */
export const MIGRATE_STUDENT_CURSOR_POLICY = {
  touchesFirebaseCursor: false as const,
  requiresExplicitOpsTool: true as const,
  silentWipeForbidden: true as const,
}
