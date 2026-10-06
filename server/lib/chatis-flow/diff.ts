import type {
  ChatisFlowVersion,
  CriasTrailFlow,
  DiffChange,
  DiffReport,
} from './types'

function push(
  changes: DiffChange[],
  change: DiffChange,
): void {
  changes.push(change)
}

/**
 * Relatório de diff entre dois IRs (ex.: 2.4 → 2.5 simulado).
 * Cobre Cases A–C (texto / add / remove activity) e G (id change) a nível de IR.
 */
export function diffCriasTrailFlows(
  from: CriasTrailFlow,
  to: CriasTrailFlow,
): DiffReport {
  const changes: DiffChange[] = []

  if (from.version !== to.version) {
    push(changes, {
      kind: 'version_bump',
      path: 'version',
      before: from.version,
      after: to.version,
      message: `Versão ${from.version} → ${to.version}`,
    })
  }

  if (from.source.name !== to.source.name) {
    push(changes, {
      kind: 'text_change',
      path: 'source.name',
      before: from.source.name,
      after: to.source.name,
      message: 'Nome do builder alterado',
    })
  }

  const fromBlocks = new Map(from.blockIndex.map((b) => [b.id, b]))
  const toBlocks = new Map(to.blockIndex.map((b) => [b.id, b]))
  const fromByVar = new Map(
    from.blockIndex
      .filter((b) => b.variable)
      .map((b) => [b.variable as string, b]),
  )

  for (const [id, block] of toBlocks) {
    if (!fromBlocks.has(id)) {
      push(changes, {
        kind: 'activity_added',
        path: `blockIndex[${id}]`,
        after: block,
        message: `Atividade/bloco adicionado: ${block.name}`,
      })
    } else {
      const prev = fromBlocks.get(id)!
      if (prev.name !== block.name) {
        push(changes, {
          kind: 'text_change',
          path: `blockIndex[${id}].name`,
          before: prev.name,
          after: block.name,
          message: `Texto/nome do bloco ${id} alterado`,
        })
      }
    }
  }

  for (const [id, block] of fromBlocks) {
    if (!toBlocks.has(id)) {
      push(changes, {
        kind: 'activity_removed',
        path: `blockIndex[${id}]`,
        before: block,
        message: `Atividade/bloco removido: ${block.name}`,
      })
    }
  }

  for (const [variable, afterBlock] of to.blockIndex
    .filter((b) => b.variable)
    .map((b) => [b.variable as string, b] as const)) {
    const beforeBlock = fromByVar.get(variable)
    if (beforeBlock && beforeBlock.id !== afterBlock.id) {
      push(changes, {
        kind: 'id_change',
        path: `blockIndex[variable=${variable}].id`,
        before: beforeBlock.id,
        after: afterBlock.id,
        message: `ID do bloco ${variable} mudou`,
      })
    }
  }

  const fromEps = new Map(from.http.endpoints.map((e) => [e.id, e]))
  const toEps = new Map(to.http.endpoints.map((e) => [e.id, e]))

  for (const [id, ep] of toEps) {
    if (!fromEps.has(id)) {
      push(changes, {
        kind: 'endpoint_change',
        path: `http.endpoints[${id}]`,
        after: ep.pathTemplate,
        message: `Endpoint adicionado: ${ep.method} ${ep.pathTemplate}`,
      })
    } else {
      const prev = fromEps.get(id)!
      if (
        prev.pathTemplate !== ep.pathTemplate ||
        prev.method !== ep.method
      ) {
        push(changes, {
          kind: 'endpoint_change',
          path: `http.endpoints[${id}]`,
          before: `${prev.method} ${prev.pathTemplate}`,
          after: `${ep.method} ${ep.pathTemplate}`,
          message: 'Endpoint alterado',
        })
      }
    }
  }

  for (const [id, ep] of fromEps) {
    if (!toEps.has(id)) {
      push(changes, {
        kind: 'endpoint_change',
        path: `http.endpoints[${id}]`,
        before: ep.pathTemplate,
        message: `Endpoint removido: ${ep.method} ${ep.pathTemplate}`,
      })
    }
  }

  if (from.phases.progression.advance.httpMode !== to.phases.progression.advance.httpMode) {
    push(changes, {
      kind: 'other',
      path: 'phases.progression.advance.httpMode',
      before: from.phases.progression.advance.httpMode,
      after: to.phases.progression.advance.httpMode,
      message: 'Modo HTTP de progressão alterado',
    })
  }

  for (const field of to.rawUnknownFields) {
    if (!from.rawUnknownFields.includes(field)) {
      push(changes, {
        kind: 'unknown_field',
        path: field,
        after: field,
        message: `Campo desconhecido introduzido: ${field}`,
      })
    }
  }

  const summary = {
    textChanges: changes.filter((c) => c.kind === 'text_change').length,
    activitiesAdded: changes.filter((c) => c.kind === 'activity_added').length,
    activitiesRemoved: changes.filter((c) => c.kind === 'activity_removed')
      .length,
    idChanges: changes.filter((c) => c.kind === 'id_change').length,
    endpointChanges: changes.filter((c) => c.kind === 'endpoint_change').length,
  }

  return {
    fromVersion: from.version as ChatisFlowVersion,
    toVersion: to.version as ChatisFlowVersion,
    changes,
    summary,
  }
}

