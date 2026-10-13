import type { TrailPathNode } from '../../../lib/trilha/trailPath'

export type TrailPathMapProps = {
  nodes: TrailPathNode[]
  /** Quando true, o total veio do motor; senão é janela relativa. */
  hasFullTrail: boolean
  /** id do nó atual para scrollIntoView (Ciclo 1 âncora). */
  currentAnchorId?: string
}

const STATE_LABEL: Record<TrailPathNode['state'], string> = {
  done: 'concluída',
  current: 'atual',
  upcoming: 'a seguir',
  paused: 'pausada',
}

export function TrailPathMap({
  nodes,
  hasFullTrail,
  currentAnchorId = 'trilha-path-current',
}: TrailPathMapProps) {
  if (nodes.length === 0) return null

  return (
    <section className="trilha-path" aria-labelledby="trilha-path-heading">
      <h2 id="trilha-path-heading" className="trilha-path__heading">
        Mapa da trilha
      </h2>
      <p className="trilha-path__lead muted">
        {hasFullTrail
          ? 'O que já fez, onde está e o que vem depois.'
          : 'Posição atual e etapas próximas.'}
      </p>
      <ol className="trilha-path__list" aria-label={
        hasFullTrail ? 'Mapa de etapas da trilha' : 'Mapa das etapas próximas'
      }>
        {nodes.map((node, index) => {
          const isFocus =
            node.state === 'current' || node.state === 'paused'
          return (
            <li
              key={node.stageNumber}
              id={isFocus ? currentAnchorId : undefined}
              className={`trilha-path__node trilha-path__node--${node.state}`}
              aria-current={isFocus ? 'step' : undefined}
            >
              {index > 0 ? (
                <span className="trilha-path__connector" aria-hidden="true" />
              ) : null}
              <span
                className="trilha-path__dot"
                aria-hidden="true"
                data-state={node.state}
              />
              <span className="trilha-path__label">
                Etapa {node.stageNumber}
                <span className="visually-hidden">
                  {' '}
                  — {STATE_LABEL[node.state]}
                </span>
                <span className="trilha-path__state" aria-hidden="true">
                  {STATE_LABEL[node.state]}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
