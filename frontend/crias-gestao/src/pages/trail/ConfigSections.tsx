import { useState, type ReactNode } from 'react'
import { Icon, Switch } from '../../design/gx/ui'
import {
  DEPTHS,
  MAX_ACTIVITIES,
  MAX_CONTENTS,
  MAX_EXERCISES,
  MAX_OPTIONS,
  MIN_OPTIONS,
  OBJECTIVES,
  counts,
  effectiveOrder,
  moveStep,
  structureTotalLabel,
  withCounts,
  withDepth,
  type DepthId,
  type StructureConfig,
} from '../../lib/trailConfig'

/**
 * Seções da Configuração da trilha (INTERFACE.md 1.1.9 e 1.1.10). As mesmas peças
 * servem à trilha aberta (edição por lápis) e à criação (passos em sequência).
 */

export type CadastroValue = {
  name: string
  subject: string
  description: string
  active: boolean
}

export function Pencil({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="gx-btn gx-btn--icon gx-btn--ghost"
      aria-label={label}
      title="Editar"
      onClick={onClick}
    >
      <Icon name="pencil" size={18} />
    </button>
  )
}

export function ReadOnlyTag() {
  return <span className="gx-tag gx-tag--lg">Somente visualização</span>
}

/** Número do passo, título e etiquetas (só na criação). */
export function StepBar({
  n,
  title,
  small,
  ai,
  open,
  onToggle,
  onUp,
  onDown,
  last,
}: {
  n: number
  title: string
  small?: string
  ai?: boolean
  open: boolean
  onToggle: () => void
  onUp: () => void
  onDown: () => void
  last?: boolean
}) {
  return (
    <div className="gx-stepbar">
      <button type="button" className="gx-stepbar__title" onClick={onToggle} aria-expanded={open}>
        <span className="gx-stepbar__num">{n}</span>
        <strong>{title}</strong>
        {small ? <span className="gx-tag">{small}</span> : null}
      </button>
      {ai ? <span className="gx-tag gx-tag--ai">IA</span> : null}
      <button
        type="button"
        className="gx-btn gx-btn--icon gx-btn--ghost"
        aria-label={`Fechar passo ${n}`}
        disabled={!open}
        onClick={onUp}
      >
        <Icon name="chev-up" />
      </button>
      <button
        type="button"
        className="gx-btn gx-btn--icon gx-btn--ghost"
        aria-label={`Abrir próximo passo depois do passo ${n}`}
        disabled={last}
        onClick={onDown}
      >
        <Icon name="chev-down" />
      </button>
    </div>
  )
}

export function CadastroSection({
  value,
  onChange,
  readOnly,
  editing,
  onEdit,
  onCancel,
  onSave,
  saveDisabled,
  meta,
  bar,
  hideHeader,
  showActive = true,
}: {
  value: CadastroValue
  onChange: (next: CadastroValue) => void
  readOnly: boolean
  editing: boolean
  onEdit?: () => void
  onCancel?: () => void
  onSave?: () => void
  saveDisabled?: boolean
  meta?: ReactNode
  bar?: ReactNode
  hideHeader?: boolean
  /** A chave Trilha ativa fica no topo da trilha aberta; aqui só na criação. */
  showActive?: boolean
}) {
  return (
    <section className="gx-card" aria-label="Cadastro">
      {bar ?? null}
      {hideHeader ? null : (
        <div className="gx-card__head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 240px' }}>
            <h2 data-fade="1">{value.name || 'Cadastro'}</h2>
            {readOnly && onEdit ? <Pencil label="Editar cadastro da trilha" onClick={onEdit} /> : null}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            {showActive ? (
              <Switch
                checked={value.active}
                label="Trilha ativa"
                disabled={readOnly}
                onChange={(active) => onChange({ ...value, active })}
              />
            ) : null}
            {editing ? (
              <>
                <button type="button" className="gx-btn" onClick={onCancel}>
                  Cancelar
                </button>
                <button type="button" className="gx-btn gx-btn--primary" disabled={saveDisabled} onClick={onSave}>
                  Salvar
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
      <div className="gx-grid">
        <label className="gx-field">
          <span>Nome</span>
          <input
            className="gx-input"
            value={value.name}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </label>
        <label className="gx-field">
          <span>Matéria (opcional)</span>
          <input
            className="gx-input"
            value={value.subject}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
          />
        </label>
      </div>
      <label className="gx-field">
        <span>Descrição (opcional)</span>
        <textarea
          className="gx-textarea"
          rows={2}
          value={value.description}
          readOnly={readOnly}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </label>
      {meta ?? null}
    </section>
  )
}

export function ObjetivoSection({
  value,
  onChange,
  readOnly,
  locked,
  editing,
  onEdit,
  onCancel,
  onSave,
  saveDisabled,
  bar,
}: {
  value: string
  onChange: (next: string) => void
  readOnly: boolean
  /** Trilha ativa: configuração bloqueada ("Somente visualização"). */
  locked: boolean
  editing: boolean
  onEdit?: () => void
  onCancel?: () => void
  onSave?: () => void
  saveDisabled?: boolean
  bar?: ReactNode
}) {
  const preset = (OBJECTIVES as readonly string[]).includes(value)
  const other = preset ? '' : value
  return (
    <section className="gx-card" aria-label="Objetivo">
      {bar ?? (
        <div className="gx-card__head">
          <div style={{ minWidth: 0, flex: '1 1 240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2>Objetivo da trilha</h2>
              {!editing && !locked && onEdit ? <Pencil label="Editar objetivo da trilha" onClick={onEdit} /> : null}
            </div>
            <p className="gx-muted">O objetivo orienta o tom e o tipo de conteúdo de todas as atividades</p>
          </div>
          {locked ? <ReadOnlyTag /> : null}
          {editing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="gx-btn" onClick={onCancel}>
                Cancelar
              </button>
              <button type="button" className="gx-btn gx-btn--primary" disabled={saveDisabled} onClick={onSave}>
                Salvar
              </button>
            </div>
          ) : null}
        </div>
      )}
      <div role="radiogroup" aria-label="Objetivo da trilha" className="gx-chips">
        {OBJECTIVES.map((o, i) => (
          <span key={o} style={{ display: 'contents' }}>
            <button
              type="button"
              role="radio"
              aria-checked={value === o}
              className={value === o ? 'gx-chip is-on' : 'gx-chip'}
              disabled={readOnly}
              onClick={() => onChange(o)}
            >
              {o}
            </button>
            {i === 4 ? <span aria-hidden="true" style={{ flexBasis: '100%', height: 0 }} /> : null}
          </span>
        ))}
        <input
          className="gx-input gx-input--other"
          aria-label="Outro objetivo"
          placeholder="Digite outro objetivo"
          autoComplete="off"
          value={other}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </section>
  )
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
  disabled,
  swatch,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  suffix?: string
  disabled?: boolean
  swatch?: 'c' | 'e'
}) {
  return (
    <div className="gx-counter">
      <span className="gx-counter__label">
        {swatch ? <span className={`gx-swatch gx-swatch--${swatch}`} aria-hidden="true" /> : null}
        {label}
      </span>
      {disabled ? null : (
        <button
          type="button"
          className="gx-btn gx-btn--icon"
          aria-label={`Menos ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
      )}
      <span className="gx-counter__value">{value}</span>
      {suffix ? <span className="gx-muted" style={{ marginLeft: -4 }}>{suffix}</span> : null}
      {disabled ? null : (
        <button
          type="button"
          className="gx-btn gx-btn--icon"
          aria-label={`Mais ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      )}
    </div>
  )
}

export function EstruturaSection({
  value,
  onChange,
  locked,
  bar,
  extra,
}: {
  value: StructureConfig
  onChange: (next: StructureConfig) => void
  locked: boolean
  bar?: ReactNode
  extra?: ReactNode
}) {
  const order = effectiveOrder(value)
  const { contents, exercises } = counts(order)
  const custom = value.depth === 'custom'
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const depthItems: Array<[DepthId, string, string]> = [
    ...DEPTHS.map((d) => [d[0], d[1], `${d[2]} + ${d[3]}`] as [DepthId, string, string]),
    ['custom', 'Personalizado', custom ? `${contents} + ${exercises}` : ''],
  ]

  return (
    <section className="gx-card" aria-label="Estrutura">
      {bar ?? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h2>Estrutura</h2>
            {locked ? <ReadOnlyTag /> : null}
          </div>
          <p className="gx-muted">Quantas etapas de conteúdo e exercício cada atividade tem, e em que ordem</p>
        </div>
      )}
      <div className="gx-counters">
        <Counter label="Conteúdos" swatch="c" value={contents} min={1} max={MAX_CONTENTS} disabled={locked} onChange={(n) => onChange(withCounts(value, n, exercises))} />
        <Counter label="Exercícios" swatch="e" value={exercises} min={1} max={MAX_EXERCISES} disabled={locked} onChange={(n) => onChange(withCounts(value, contents, n))} />
        <Counter
          label="Múltipla escolha"
          value={value.options}
          min={MIN_OPTIONS}
          max={MAX_OPTIONS}
          suffix="alternativas"
          disabled={locked}
          onChange={(n) => onChange({ ...value, options: n })}
        />
        <span className="gx-pill gx-pill--ok" style={{ marginLeft: 'auto' }}>
          Feedback imediato
        </span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600 }}>Profundidade</span>
      <div role="radiogroup" aria-label="Profundidade" className="gx-depths">
        {depthItems.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value.depth === id}
            className={value.depth === id ? 'gx-depth is-on' : 'gx-depth'}
            disabled={locked}
            onClick={() => onChange(withDepth(value, id))}
          >
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
              <strong>{label}</strong>
              <span className="gx-muted" style={{ fontWeight: 600 }}>
                {count}
              </span>
            </span>
          </button>
        ))}
      </div>
      <ol aria-label="Etapas de cada atividade" className="gx-blocks">
        {order.map((k, i) => (
          <li
            key={`${i}-${k}`}
            className={`gx-block gx-block--${k}`}
            draggable={custom && !locked}
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => custom && !locked && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragFrom !== null && custom && !locked) {
                onChange({ ...value, order: moveStep(order, dragFrom, i) })
              }
              setDragFrom(null)
            }}
          >
            <span>{i + 1}</span>
            {custom && !locked ? (
              <span className="gx-block__arrows">
                <button
                  type="button"
                  aria-label={`Mover etapa ${i + 1} para a esquerda`}
                  disabled={i === 0}
                  onClick={() => onChange({ ...value, order: moveStep(order, i, i - 1) })}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label={`Mover etapa ${i + 1} para a direita`}
                  disabled={i === order.length - 1}
                  onClick={() => onChange({ ...value, order: moveStep(order, i, i + 1) })}
                >
                  ›
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 20px', fontSize: 14, color: 'var(--v-t2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="gx-swatch gx-swatch--c" aria-hidden="true" />
          conteúdo
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="gx-swatch gx-swatch--e" aria-hidden="true" />
          exercício
        </span>
        <strong style={{ marginLeft: 'auto', color: 'var(--v-ink)' }}>{structureTotalLabel(order)}</strong>
      </div>
      {extra ?? null}
    </section>
  )
}

export function NumberOfActivities({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="gx-counter">
      <span className="gx-counter__label">Número de atividades</span>
      <button type="button" className="gx-btn gx-btn--icon" aria-label="Menos atividades" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <input
        className="gx-input"
        type="number"
        min={1}
        max={MAX_ACTIVITIES}
        value={value}
        aria-label="Número de atividades"
        style={{ width: 80, textAlign: 'center' }}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10)
          if (Number.isFinite(n)) onChange(Math.max(1, Math.min(MAX_ACTIVITIES, n)))
        }}
      />
      <button type="button" className="gx-btn gx-btn--icon" aria-label="Mais atividades" disabled={value >= MAX_ACTIVITIES} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

/** Orientações (opcional): subtítulo e sequência visual dos conteúdos (1.1.10). */
export function OrientacoesSection({
  value,
  onChange,
  locked,
  bar,
}: {
  value: string
  onChange: (next: string) => void
  locked: boolean
  bar?: ReactNode
}) {
  return (
    <section className="gx-card" aria-label="Orientações">
      {bar ?? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2>
            Orientações <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--v-t3)' }}>(opcional)</span>
          </h2>
          {locked ? <ReadOnlyTag /> : null}
        </div>
      )}
      <p className="gx-muted">
        Os conteúdos são gerados por padrão pela sequência abaixo. Você pode enviar orientações específicas.
      </p>
      <ol className="gx-sequence" aria-label="Sequência padrão dos conteúdos">
        {['Contextualização', 'Introdução', 'Exemplos', 'Desenvolvimento', 'Conclusão'].map((s, i, arr) => (
          <li key={s}>
            {s}
            {i < arr.length - 1 ? <span aria-hidden="true"> ›</span> : null}
          </li>
        ))}
      </ol>
      <textarea
        className="gx-textarea"
        rows={4}
        aria-label="Orientações"
        placeholder="Ex.: Use exemplos do dia a dia dos alunos, como compras no mercado e esportes. Explique os termos técnicos antes de usar. Nos exercícios, traga situações-problema curtas."
        value={value}
        readOnly={locked}
        onChange={(e) => onChange(e.target.value)}
      />
    </section>
  )
}
