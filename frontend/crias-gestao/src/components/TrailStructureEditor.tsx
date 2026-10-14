import { Fragment, useMemo } from 'react'
import type { TrailStageType } from '../types/trailStage'
import type { StructurePhase } from '../lib/trailEditor'

const MENTOR_IMAGE_URL =
  'https://i.ibb.co/Q3Cb3SYm/Chat-GPT-Image-21-de-abr-de-2026-11-28-13-removebg-preview.png'

const PHASE_TYPE_LABELS: Record<TrailStageType, string> = {
  ai: 'IA (conteúdo gerado)',
  fixed: 'Texto fixo',
  exercise: 'Exercício',
}

const PHASE_TYPE_META: Record<TrailStageType, { icon: string; desc: string }> = {
  ai: { icon: '🧠', desc: 'A IA gera o conteúdo automaticamente' },
  fixed: { icon: '📄', desc: 'Você escreve o conteúdo manualmente' },
  exercise: { icon: '✏️', desc: 'Alunos respondem exercícios' },
}

const FLOW_TYPE_SHORT: Record<TrailStageType, string> = {
  ai: 'IA gera conteúdo',
  fixed: 'Texto fixo',
  exercise: 'Exercício',
}

const FLOW_DEMO_ETAPA_COUNT = 4

type Props = {
  structurePhases: StructurePhase[]
  active: boolean
  onToggleActive: (next: boolean) => void
  onAddPhase: () => void
  onRemovePhase: (id: string) => void
  onUpdatePhase: (
    id: string,
    patch: Partial<Pick<StructurePhase, 'title' | 'stage_type' | 'prompt'>>,
  ) => void
  onSubmit?: () => void
  submitLabel: string
  submitting: boolean
  footerPrompt?: string
  submitButtonType?: 'button' | 'submit'
}

export function TrailStructureEditor({
  structurePhases,
  active,
  onToggleActive,
  onAddPhase,
  onRemovePhase,
  onUpdatePhase,
  onSubmit,
  submitLabel,
  submitting,
  footerPrompt = 'Salvar trilha e seguir para a definição de conteúdos?',
  submitButtonType = 'button',
}: Props) {
  const structurePhaseRows = useMemo(() => {
    const rows: StructurePhase[][] = []
    for (let i = 0; i < structurePhases.length; i += 3) {
      rows.push(structurePhases.slice(i, i + 3))
    }
    return rows
  }, [structurePhases])

  return (
    <div className="trail-structure">
      <header className="trail-structure__hero">
        <div>
          <h3>Como funciona o CRIAS ✨</h3>
          <p className="muted">
            Você define a estrutura da sua trilha do seu jeito. Essa estrutura será usada
            em todas as etapas, sendo repetida com novos conteúdos.
          </p>
        </div>
        <div className="trail-structure__hero-aside">
          <img src={MENTOR_IMAGE_URL} alt="Mentor CRIAS" />
          <div className="trail-structure__hero-note">
            Você tem total liberdade para criar a estrutura que fizer mais sentido para o
            seu conteúdo!
          </div>
        </div>
      </header>

      <section className="trail-structure__panel">
        <h4>
          <span>1</span> Você monta a estrutura da trilha
        </h4>
        <p className="muted">
          Defina quantas fases vão ter dentro de cada etapa da trilha e escolha o tipo de
          cada uma.
        </p>
        <div className="trail-structure__controls">
          <label className="field field--inline">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => onToggleActive(e.target.checked)}
            />
            <span>Trilha ativa desde o início</span>
          </label>
        </div>
        <div className="trail-structure__builder">
          <div className="trail-structure__cards">
            {structurePhaseRows.map((row, rowIndex) => (
              <div className="trail-structure__cards-row" key={row.map((p) => p.id).join('-')}>
                {row.map((phase, colIndex) => {
                  const index = rowIndex * 3 + colIndex
                  return (
                    <Fragment key={phase.id}>
                      {colIndex > 0 ? (
                        <span className="trail-structure__cards-chevron" aria-hidden>
                          ›
                        </span>
                      ) : null}
                      <article
                        className={`trail-structure__phase-card trail-structure__phase-card--i${index % 3}`}
                      >
                        <div className="trail-structure__phase-card-head">
                          <div className="trail-structure__phase-head-main">
                            <span className="trail-structure__phase-index" aria-hidden>
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              className="trail-structure__phase-title"
                              value={phase.title}
                              onChange={(e) =>
                                onUpdatePhase(phase.id, {
                                  title: e.target.value,
                                })
                              }
                              placeholder={`Fase ${index + 1}`}
                              autoComplete="off"
                              aria-label={`Nome da fase ${index + 1}`}
                            />
                          </div>
                          {structurePhases.length > 1 ? (
                            <button
                              type="button"
                              className="trail-structure__phase-remove"
                              onClick={() => {
                                const label = phase.title.trim() || `Fase ${index + 1}`
                                const confirmed = window.confirm(
                                  `Excluir a fase "${label}"? Esta ação não pode ser desfeita.`,
                                )
                                if (confirmed) onRemovePhase(phase.id)
                              }}
                              aria-label={`Remover fase ${index + 1}`}
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                        <div className="trail-structure__phase-type-box">
                          <span className="trail-structure__phase-type-icon" aria-hidden>
                            {PHASE_TYPE_META[phase.stage_type].icon}
                          </span>
                          <select
                            className="trail-structure__phase-type-select"
                            value={phase.stage_type}
                            onChange={(e) => {
                              const next = e.target.value as TrailStageType
                              onUpdatePhase(phase.id, {
                                stage_type: next,
                                prompt: next === 'ai' ? phase.prompt : '',
                              })
                            }}
                            aria-label={`Tipo da fase ${index + 1}`}
                          >
                            {(Object.keys(PHASE_TYPE_LABELS) as TrailStageType[]).map((t) => (
                              <option key={t} value={t}>
                                {PHASE_TYPE_LABELS[t]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="trail-structure__phase-desc">
                          {PHASE_TYPE_META[phase.stage_type].desc}
                        </p>
                        {phase.stage_type === 'ai' ? (
                          <label className="trail-structure__phase-prompt">
                            <span className="trail-structure__phase-prompt-label">
                              Comando da IA
                            </span>
                            <textarea
                              className="trail-structure__phase-prompt-input"
                              value={phase.prompt}
                              onChange={(e) =>
                                onUpdatePhase(phase.id, {
                                  prompt: e.target.value,
                                })
                              }
                              rows={3}
                              placeholder="Descreva o que a IA deve gerar nesta fase…"
                              aria-label={`Comando da IA da fase ${index + 1}`}
                            />
                          </label>
                        ) : null}
                      </article>
                    </Fragment>
                  )
                })}
                {rowIndex === structurePhaseRows.length - 1 ? (
                  <>
                    <span className="trail-structure__cards-chevron" aria-hidden>
                      ›
                    </span>
                    <button
                      type="button"
                      className="trail-structure__add-card"
                      onClick={onAddPhase}
                    >
                      <strong aria-hidden>+</strong>
                      <span className="muted">Adicionar fase</span>
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
          <aside className="trail-structure__decision-box">
            <h5>Você decide:</h5>
            <ul>
              <li>Quantas fases terá cada etapa</li>
              <li>Qual o nome de cada fase</li>
              <li>Qual o tipo de cada fase</li>
              <li>O comando da IA nas fases com IA</li>
            </ul>
          </aside>
        </div>

        <div
          className="trail-structure__flow"
          aria-label="Visualização: sua estrutura fixa repetida em cada etapa"
        >
          <p className="trail-structure__flow-intro muted">
            Assim sua estrutura se aplica a cada etapa da trilha:
          </p>
          <div className="trail-structure__flow-main">
            <div className="trail-structure__flow-base">
              <div className="trail-structure__flow-base-head">
                <span className="trail-structure__flow-lock" aria-hidden>
                  🔒
                </span>
                <strong>Sua estrutura (fixa)</strong>
              </div>
              <ul className="trail-structure__flow-base-list">
                {structurePhases.map((phase, i) => (
                  <li
                    key={phase.id}
                    className={`trail-structure__flow-line trail-structure__flow-line--i${i % 3}`}
                  >
                    <span className="trail-structure__flow-badge">{i + 1}</span>
                    <span className="trail-structure__flow-phase-title">
                      {phase.title.trim() || `Fase ${i + 1}`}
                    </span>
                    <span className="trail-structure__flow-mini-type">
                      <span aria-hidden>{PHASE_TYPE_META[phase.stage_type].icon}</span>
                      <span>
                        {phase.stage_type === 'ai'
                          ? 'IA'
                          : phase.stage_type === 'fixed'
                            ? 'Texto'
                            : 'Exercício'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <span className="trail-structure__flow-arrow" aria-hidden>
              →
            </span>

            <div className="trail-structure__flow-etapas">
              <div className="trail-structure__flow-ribbon">
                <span className="trail-structure__flow-ribbon-line" aria-hidden />
                <span className="trail-structure__flow-ribbon-text">
                  Repetido quantas vezes você quiser
                </span>
                <span className="trail-structure__flow-ribbon-line" aria-hidden />
              </div>
              <div className="trail-structure__flow-etapas-row">
                {Array.from({ length: FLOW_DEMO_ETAPA_COUNT }, (_, ei) => (
                  <Fragment key={`flow-etapa-${ei}`}>
                    {ei > 0 ? (
                      <span
                        className="trail-structure__flow-arrow trail-structure__flow-arrow--sm"
                        aria-hidden
                      >
                        →
                      </span>
                    ) : null}
                    <div className="trail-structure__flow-etapa-card">
                      <div className="trail-structure__flow-etapa-head">
                        <strong>Etapa {ei + 1}</strong>
                        <span className="muted">Conteúdo {ei + 1}*</span>
                      </div>
                      <ul className="trail-structure__flow-etapa-list">
                        {structurePhases.map((phase, i) => (
                          <li
                            key={`${phase.id}-${ei}`}
                            className={`trail-structure__flow-mini-line trail-structure__flow-line--i${i % 3}`}
                          >
                            <span className="trail-structure__flow-badge trail-structure__flow-badge--sm">
                              {i + 1}
                            </span>
                            <span aria-hidden>{PHASE_TYPE_META[phase.stage_type].icon}</span>
                            <span className="trail-structure__flow-short">
                              {FLOW_TYPE_SHORT[phase.stage_type]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Fragment>
                ))}
                <span
                  className="trail-structure__flow-arrow trail-structure__flow-arrow--sm"
                  aria-hidden
                >
                  →
                </span>
                <div className="trail-structure__flow-more">
                  <span aria-hidden>…</span>
                  <span>E assim sucessivamente!</span>
                </div>
              </div>
            </div>
          </div>
          <p className="trail-structure__flow-footnote muted">
            *Os conteúdos serão definidos no próximo passo
          </p>
        </div>
      </section>

      <footer className="trail-structure__footer">
        <p className="muted">✨ {footerPrompt}</p>
        <button
          type={submitButtonType}
          className="btn btn--primary trail-structure__cta"
          disabled={submitting}
          onClick={onSubmit}
        >
          {submitting ? 'Salvando…' : submitLabel}
        </button>
      </footer>
    </div>
  )
}
