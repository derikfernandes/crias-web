import { useState, type ReactNode } from 'react'
import { Icon } from '../../design/gx/ui'
import type { ActivityDraft } from '../../lib/trailActivities'
import { BLOCK_LABEL, optionLine, previewBlocks, previewSummary, type PreviewOptions } from '../../lib/trailPreview'

const MAX_VISIBLE = 6

/**
 * Prévia em lista com Resumo (1.1.1.b.41 e 1.1.1.b.42): atividades recolhidas com seta; ao abrir, blocos B1, B2...
 * por tipo e o conteúdo de cada etapa. Até 6 atividades; "+ N atividades" mostra o restante. Resumo à direita.
 */
export function PreviewPanel({
  activities,
  opts,
  options,
  name,
  sub,
  title,
  lede,
}: {
  activities: ActivityDraft[]
  opts: PreviewOptions
  /** Alternativas por exercício. */
  options: number
  name: string
  sub: string
  title?: string
  lede?: ReactNode
}) {
  const [openIdx, setOpenIdx] = useState<number>(-1)
  const [all, setAll] = useState(false)
  const sum = previewSummary(activities, opts)
  const rows = all ? activities : activities.slice(0, MAX_VISIBLE)
  const hidden = activities.length - MAX_VISIBLE
  const yn = (v: boolean) => (v ? 'Sim' : 'Não')

  return (
    <section className="gx-pv" aria-label="Prévia">
      <div className="gx-pv__list gx-card">
        {title ? (
          <div className="gx-pv__head">
            <h2>{title}</h2>
            {lede ? <span className="gx-muted">{lede}</span> : null}
          </div>
        ) : null}
        <ol className="gx-pv__rows">
          {rows.map((a, i) => {
            const open = openIdx === i
            const blocks = previewBlocks(a, opts)
            return (
              <li key={a.number}>
                <button type="button" className="gx-pv__row" aria-expanded={open} onClick={() => setOpenIdx(open ? -1 : i)}>
                  <span className="gx-pv__n">{String(i + 1).padStart(2, '0')}</span>
                  <strong data-fade="1" className="gx-pv__name">
                    {a.title || `Atividade ${a.number}`}
                  </strong>
                  <span className={open ? 'gx-pv__chev is-open' : 'gx-pv__chev'}>
                    <Icon name="chev-down" size={18} />
                  </span>
                </button>
                {open ? (
                  <>
                    <div className="gx-pv__chips">
                      {blocks.map((b) => (
                        <span key={b.id} className={`gx-pv__chip gx-pv__chip--${b.kind}`}>
                          <strong>{b.id}</strong>
                          <span>{BLOCK_LABEL[b.kind]}</span>
                        </span>
                      ))}
                    </div>
                    <div className="gx-pv__steps">
                      {blocks.map((b, k) => (
                        <div key={b.id} className={`gx-pv__step gx-pv__step--${b.kind}`}>
                          <div className="gx-pv__steptop">
                            <span>Etapa {k + 1}</span>
                            <span className={`gx-pv__kind gx-pv__kind--${b.kind}`}>{BLOCK_LABEL[b.kind]}</span>
                          </div>
                          <strong>{b.title}</strong>
                          <p>{b.body || 'N/A'}</p>
                          {b.options.map((_, oi) => (
                            <p key={oi}>{optionLine(b, oi)}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </li>
            )
          })}
        </ol>
        {hidden > 0 ? (
          <button type="button" className="gx-pv__more" onClick={() => setAll((v) => !v)}>
            {all ? 'Mostrar menos' : `+ ${hidden} ${hidden === 1 ? 'atividade' : 'atividades'}`}
          </button>
        ) : null}
      </div>

      <aside className="gx-pv__sum" aria-label="Resumo">
        <span className="gx-pv__lab">Resumo</span>
        <div className="gx-pv__who">
          <h3 data-fade="1">{name || 'N/A'}</h3>
          <span data-fade="1" className="gx-muted">
            {sub || 'N/A'}
          </span>
        </div>
        <div className="gx-pv__nums">
          <div>
            <strong>{sum.activities}</strong>
            <span>atividades</span>
          </div>
          <div>
            <strong>{sum.exercises}</strong>
            <span>exercícios</span>
          </div>
          <div>
            <strong>≈ {sum.minutes}</strong>
            <span>min por atividade</span>
          </div>
        </div>
        <dl className="gx-pv__dl">
          <div>
            <dt>Conteúdos</dt>
            <dd>{sum.contents}</dd>
          </div>
          <div>
            <dt>Exercícios</dt>
            <dd>{sum.exercisesPerActivity}</dd>
          </div>
          <div>
            <dt>Alternativas por exercício</dt>
            <dd>{options}</dd>
          </div>
          <div>
            <dt>Feedback instantâneo</dt>
            <dd>{yn(sum.feedback)}</dd>
          </div>
          <div>
            <dt>Bloco conclusivo</dt>
            <dd>{yn(sum.conclusive)}</dd>
          </div>
        </dl>
        <p className="gx-muted">Tempo aproximado: 1 min por bloco de conteúdo, feedback ou conclusão e 2 min por exercício.</p>
      </aside>
    </section>
  )
}
