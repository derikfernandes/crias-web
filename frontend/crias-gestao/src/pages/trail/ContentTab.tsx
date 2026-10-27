import { BulkPanel } from '../../components/BulkPanel'
import { plural } from '../../lib/bulkActions'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Banner, DeletarDialog, Icon } from '../../design/gx/ui'
import { loadXlsx } from '../../lib/loadXlsx'
import {
  activityIsComplete,
  blankActivity,
  instructionRows,
  numberAfter,
  parseActivitySheet,
  SHEET_INSTRUCTIONS,
  SHEET_TEMPLATE,
  stepLabel,
  templateHeaders,
  templateRows,
  letterOf,
  type ActivityDraft,
  type StepDraft,
} from '../../lib/trailActivities'
import { generateActivitiesWithAi } from '../../lib/trailAiApi'
import {
  DEFAULT_OBJECTIVE,
  OBJECTIVES,
  MAX_ACTIVITIES,
  orNA,
  type GenerationConfig,
} from '../../lib/trailConfig'
import {
  addActivities,
  removeActivity,
  saveActivity,
  setActivityReleased,
} from '../../lib/trailOps'
import type { StructurePhase } from '../../lib/trailEditor'
import { PreviewPanel } from './PreviewPanel'
import type { Trail } from '../../types/trail'
import type { TrailStageQuestion } from '../../types/trailStageQuestion'
import { NumberOfActivities, Pencil } from './ConfigSections'
import { FilesPicker, type PickedFile } from './FilesPicker'

/**
 * Conteúdo da trilha (1.1.9): adicionar atividades por IA ou em lote (sempre ADICIONA,
 * entram no topo e a numeração continua), lista de atividades e etapas de cada uma.
 */

function StepView({
  steps,
  index,
  expanded,
  onToggle,
}: {
  steps: StepDraft[]
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const s = steps[index]
  const body =
    s.kind === 'e'
      ? [s.content, ...s.options.map((o, i) => `${letterOf(i)}) ${o}`)].filter(Boolean).join('\n')
      : s.content
  const long = body.split('\n').length > 3 || body.length > 220
  return (
    <li className="gx-step">
      <div className="gx-step__top">
        <span>Etapa {index + 1}</span>
        <span className={s.kind === 'e' ? 'gx-pill gx-pill--warn' : 'gx-pill'}>
          {s.kind === 'e' ? 'Exercício' : 'Conteúdo'}
        </span>
      </div>
      <strong className="gx-step__title" data-fade="1">
        {stepLabel(steps, index)}
      </strong>
      {s.kind === 'e' && s.correct ? <span className="gx-muted">Gabarito: {s.correct}</span> : null}
      <p className={expanded || !long ? 'gx-step__body' : 'gx-step__body gx-step__body--clamp'}>
        {body || 'N/A'}
      </p>
      {long ? (
        <button type="button" className="gx-linktoggle" aria-expanded={expanded} onClick={onToggle}>
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      ) : null}
    </li>
  )
}

function StepEditor({
  steps,
  index,
  onChange,
  optionCount,
  readOnlyGabarito,
}: {
  steps: StepDraft[]
  index: number
  onChange: (next: StepDraft) => void
  optionCount: number
  readOnlyGabarito?: boolean
}) {
  const s = steps[index]
  const set = (patch: Partial<StepDraft>) => onChange({ ...s, ...patch })
  return (
    <li className="gx-step">
      <div className="gx-step__top">
        <span>Etapa {index + 1}</span>
        <span className={s.kind === 'e' ? 'gx-pill gx-pill--warn' : 'gx-pill'}>
          {s.kind === 'e' ? 'Exercício' : 'Conteúdo'}
        </span>
      </div>
      <strong className="gx-step__title">{stepLabel(steps, index)}</strong>
      <textarea
        className="gx-textarea"
        rows={s.kind === 'e' ? 3 : 4}
        aria-label={s.kind === 'e' ? 'Enunciado do exercício' : 'Conteúdo da etapa'}
        placeholder={s.kind === 'e' ? 'Enunciado do exercício' : 'Conteúdo da etapa'}
        value={s.content}
        onChange={(e) => set({ content: e.target.value })}
      />
      {s.kind === 'e' ? (
        <>
          <div className="gx-alts">
            {Array.from({ length: optionCount }, (_, i) => (
              <label className="gx-alt" key={i}>
                <span>{letterOf(i)}</span>
                <input
                  className="gx-input"
                  aria-label={`Alternativa ${letterOf(i)}`}
                  placeholder={`Alternativa ${letterOf(i)}`}
                  value={s.options[i] ?? ''}
                  onChange={(e) => {
                    const options = Array.from({ length: optionCount }, (_, k) => s.options[k] ?? '')
                    options[i] = e.target.value
                    set({ options })
                  }}
                />
              </label>
            ))}
          </div>
          <div role="radiogroup" aria-label="Gabarito" className="gx-gab">
            <strong>Gabarito</strong>
            {Array.from({ length: optionCount }, (_, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={s.correct === letterOf(i)}
                disabled={readOnlyGabarito}
                onClick={() => set({ correct: letterOf(i) })}
              >
                {letterOf(i)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </li>
  )
}

export function ContentTab({
  trail,
  trailId,
  activities,
  cells,
  phases,
  optionCount,
  buildConfig,
}: {
  trail: Trail
  trailId: string
  activities: ActivityDraft[]
  cells: TrailStageQuestion[]
  phases: StructurePhase[]
  optionCount: number
  buildConfig: (extra: { activities: number; objective: string; skills: string; guidelines: string; filesText: string }) => GenerationConfig
}) {
  // Mais recentes no topo (1.1.9): a numeração continua depois da última.
  const ordered = useMemo(() => [...activities].sort((a, b) => b.number - a.number), [activities])
  const [selected, setSelected] = useState<number | null>(null)
  const [editing, setEditing] = useState<ActivityDraft | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // IA
  const [aiOpen, setAiOpen] = useState(false)
  const [aiCount, setAiCount] = useState(5)
  const [aiObjective, setAiObjective] = useState<string>(DEFAULT_OBJECTIVE)
  const [aiSkills, setAiSkills] = useState('')
  const [aiNotes, setAiNotes] = useState('')
  const [aiFiles, setAiFiles] = useState<PickedFile[]>([])
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<ActivityDraft[] | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (activities.length > 0 && aiCount === 5) setAiCount(Math.min(MAX_ACTIVITIES, Math.max(1, activities.length)))
    // Só na primeira carga das atividades.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities.length > 0])

  useEffect(() => {
    if (selected === null || !activities.some((a) => a.number === selected)) {
      setSelected(ordered[0]?.number ?? null)
      setEditing(null)
    }
  }, [ordered, activities, selected])

  const current = activities.find((a) => a.number === selected) ?? null
  const view = editing ?? current
  const dirty = editing && current ? JSON.stringify(editing) !== JSON.stringify(current) : Boolean(editing)

  async function run(fn: () => Promise<void>, okMessage?: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await fn()
      if (okMessage) setNotice(okMessage)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir a ação.')
    } finally {
      setBusy(false)
    }
  }

  function newActivity() {
    const number = activities.reduce((m, a) => Math.max(m, a.number), 0) + 1
    const draft = blankActivity(number, phases, optionCount)
    void run(async () => {
      await saveActivity(trailId, draft)
      setSelected(number)
      setEditing(draft)
    })
  }

  function toggleReleased(a: ActivityDraft) {
    if (!a.released && !activityIsComplete(a)) {
      setError(`Preencha todas as etapas da atividade ${a.number} antes de liberar.`)
      return
    }
    const mine = cells.filter((c) => c.question_number === a.number)
    void run(() => setActivityReleased(mine, !a.released))
  }

  function save() {
    if (!editing) return
    void run(async () => {
      await saveActivity(trailId, editing)
      setEditing(null)
    }, 'Atividade salva.')
  }

  function remove() {
    if (selected === null) return
    void run(async () => {
      await removeActivity(trailId, selected, cells)
      setDeleteOpen(false)
      setEditing(null)
      setSelected(null)
    }, 'Atividade excluída.')
  }

  /* ----- IA ----- */
  const canGenerate = aiSkills.trim() !== '' && !generating

  async function generate() {
    setError(null)
    setNotice(null)
    setGenerating(true)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const cfg = buildConfig({
        activities: aiCount,
        objective: aiObjective,
        skills: aiSkills,
        guidelines: aiNotes,
        filesText: aiFiles.length > 0 ? 'enviados' : '',
      })
      const result = await generateActivitiesWithAi({
        mode: 'append',
        config: cfg,
        existingTitles: activities.map((a) => a.title),
        files: aiFiles.map((f) => f.file),
        signal: ctrl.signal,
      })
      setPreview(numberAfter(activities, result))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'Não foi possível gerar a prévia.')
      }
    } finally {
      setGenerating(false)
    }
  }

  function addPreview() {
    if (!preview) return
    void run(async () => {
      await addActivities(trailId, preview, activities.map((a) => a.number))
      setPreview(null)
      setAiOpen(false)
      setAiSkills('')
      setAiNotes('')
      setAiFiles([])
      setSelected(preview[preview.length - 1]?.number ?? null)
    }, `${preview.length} ${preview.length === 1 ? 'atividade adicionada' : 'atividades adicionadas'}.`)
  }

  /* ----- Planilha ----- */
  async function downloadTemplate() {
    const XLSX = await loadXlsx()
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructionRows(phases, optionCount)), SHEET_INSTRUCTIONS)
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([templateHeaders(phases), ...templateRows(phases, optionCount)]),
      SHEET_TEMPLATE,
    )
    XLSX.writeFile(wb, `modelo-atividades-${trailId}.xlsx`)
  }

  /** Lê a aba do modelo (a de instruções vem antes e não serve). */
  async function readActivitySheet(file: File) {
    const XLSX = await loadXlsx()
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const ws = wb.Sheets[SHEET_TEMPLATE] ?? wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]]
    if (!ws) throw new Error(`A planilha precisa conter a aba "${SHEET_TEMPLATE}".`)
    return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
  }

  /* ----- Prévia (página dentro da aba) ----- */
  if (preview) {
    return (
      <section aria-label="Prévia" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="gx-card__head" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <h2>Prévia</h2>
            <p className="gx-muted" style={{ lineHeight: 1.5 }}>
              Revise os conteúdos para adicionar atividades. Você pode revisar ou excluir as atividades depois.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="gx-btn" onClick={() => setPreview(null)}>
              Cancelar
            </button>
            <button type="button" className="gx-btn gx-btn--primary" disabled={busy} onClick={addPreview}>
              Criar atividades
            </button>
          </div>
        </div>
        {error ? <Banner>{error}</Banner> : null}
        <PreviewPanel
          activities={preview}
          // TODO backend 1.1.1.b: a etapa conclusiva ainda não existe nas atividades salvas.
          opts={{ feedback: true, conclusive: false }}
          options={optionCount}
          name="Novas atividades"
          sub={trail.name || 'N/A'}
        />
      </section>
    )
  }

  return (
    <>
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      <p className="gx-sectionlabel">Novas atividades</p>
      <div className="gx-newacts">
      <BulkPanel
        title="Adicionar atividades em massa"
        subtitle="Adicione várias atividades de uma vez com uma planilha. Elas entram depois da última existente e nada é substituído."
        columns={templateHeaders(phases)}
        baseLabel="Baixar planilha modelo"
        onDownload={() => void downloadTemplate()}
        read={readActivitySheet}
        plan={(rows) => {
          const parsed = parseActivitySheet(rows as Record<string, unknown>[], phases, optionCount)
          return {
            data: parsed,
            preview: {
              confirmTitle: 'Adicionar atividades em massa?',
              confirmText: `${plural(parsed.activities.length, 'atividade será adicionada', 'atividades serão adicionadas')} depois da última existente.`,
              actionable: parsed.activities.length,
              issues: parsed.errors.map((er) => ({ line: er.row, ref: er.field, error: er.message })),
            },
          }
        }}
        apply={async (parsed) => {
          const next = numberAfter(activities, parsed.activities)
          await addActivities(trailId, next, activities.map((a) => a.number))
          setSelected(next[next.length - 1]?.number ?? null)
          return { summary: `${plural(next.length, 'atividade adicionada', 'atividades adicionadas')}.` }
        }}
        actionLabel="Adicionar atividades"
        confirmLabel="Adicionar atividades"
      />
      <section className="gx-card gx-bulk" aria-label="Adicionar atividades com inteligência artificial">
        <div
          className="gx-bulk__head"
          role="button"
          tabIndex={0}
          aria-expanded={aiOpen}
          onClick={() => setAiOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setAiOpen((v) => !v)
            }
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2>Adicionar atividades com Inteligência Artificial</h2>
            <p className="gx-muted">Gere novas atividades a partir das habilidades e orientações</p>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
            <span className="gx-tag gx-tag--ai">IA</span>
            <button
              type="button"
              className={canGenerate ? 'gx-btn gx-btn--primary gx-btn--pulse' : 'gx-btn gx-btn--primary'}
              disabled={!canGenerate}
              onClick={(e) => {
                e.stopPropagation()
                void generate()
              }}
            >
              {generating ? 'Gerando…' : 'Gerar prévia'}
            </button>
            <span className="gx-roundarrow" aria-hidden="true">
              <Icon name={aiOpen ? 'chev-up' : 'chev-down'} />
            </span>
          </span>
        </div>
        {aiOpen ? (
          <div className="gx-bulk__body">
            <NumberOfActivities value={aiCount} onChange={setAiCount} />
            <label className="gx-field" style={{ maxWidth: 280 }}>
              <span>Objetivo</span>
              <select className="gx-select" value={aiObjective} onChange={(e) => setAiObjective(e.target.value)}>
                {OBJECTIVES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="gx-field">
              <span>Habilidades</span>
              <textarea
                className="gx-textarea"
                rows={3}
                placeholder="Habilidades ou conteúdos das novas atividades"
                value={aiSkills}
                onChange={(e) => setAiSkills(e.target.value)}
              />
            </label>
            <label className="gx-field">
              <span>Orientações (opcional)</span>
              <textarea className="gx-textarea" rows={3} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} />
            </label>
            <FilesPicker files={aiFiles} onChange={setAiFiles} compact />
          </div>
        ) : null}
      </section>
      </div>

      <p className="gx-sectionlabel">Atividades</p>
      <div className="gx-split">
        <section className="gx-card" aria-label="Atividades da trilha">
          <div className="gx-card__head" style={{ flexWrap: 'nowrap' }}>
            <h2 style={{ whiteSpace: 'nowrap' }}>Atividades da trilha</h2>
            <button type="button" className="gx-btn gx-btn--primary" disabled={busy} onClick={newActivity}>
              + Nova atividade
            </button>
          </div>
          <ol className="gx-list">
            {ordered.map((a) => (
              <li className="gx-actrow" key={a.number}>
                <button
                  type="button"
                  className={a.number === selected ? 'gx-actbtn is-on' : 'gx-actbtn'}
                  aria-pressed={a.number === selected}
                  onClick={() => {
                    setSelected(a.number)
                    setEditing(null)
                  }}
                >
                  <span className="gx-num">{a.number}</span>
                  <strong data-fade="1">{a.title}</strong>
                </button>
                <button
                  type="button"
                  className={a.released ? 'gx-lock gx-lock--on' : 'gx-lock gx-lock--off'}
                  aria-label={a.released ? `Bloquear atividade ${a.number}` : `Liberar atividade ${a.number}`}
                  title={a.released ? 'Clique para bloquear' : 'Clique para liberar'}
                  disabled={busy}
                  onClick={() => toggleReleased(a)}
                >
                  {a.released ? 'Liberada' : 'Bloqueada'}
                </button>
              </li>
            ))}
            {ordered.length === 0 ? <li className="gx-muted">Nenhuma atividade ainda.</li> : null}
          </ol>
        </section>

        <section className="gx-card" aria-label="Conteúdo das etapas">
          <div className="gx-card__head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 200px' }}>
              <h2 data-fade="1">Conteúdo das etapas</h2>
              {view && !editing ? <Pencil label="Editar atividade" onClick={() => setEditing(structuredClone(view))} /> : null}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {editing ? (
                <>
                  <button type="button" className="gx-btn" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                  <button type="button" className="gx-btn gx-btn--primary" disabled={!dirty || busy} onClick={save}>
                    Salvar
                  </button>
                </>
              ) : null}
              {view && !editing ? (
                <button
                  type="button"
                  className="gx-btn"
                  style={{ color: 'var(--v-err)', borderColor: 'rgba(138,28,18,.28)' }}
                  onClick={() => setDeleteOpen(true)}
                >
                  Excluir
                </button>
              ) : null}
            </div>
          </div>
          {view ? (
            <>
              {editing ? (
                <label className="gx-field">
                  <span>Título da atividade</span>
                  <input
                    className="gx-input"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                </label>
              ) : (
                <p className="gx-muted">
                  Atividade {view.number}: {orNA(view.title)}
                </p>
              )}
              <ol className="gx-list">
                {view.steps.map((_, i) =>
                  editing ? (
                    <StepEditor
                      key={i}
                      steps={editing.steps}
                      index={i}
                      optionCount={optionCount}
                      onChange={(next) =>
                        setEditing({ ...editing, steps: editing.steps.map((s, k) => (k === i ? next : s)) })
                      }
                    />
                  ) : (
                    <StepView
                      key={i}
                      steps={view.steps}
                      index={i}
                      expanded={expanded.has(i)}
                      onToggle={() =>
                        setExpanded((s) => {
                          const n = new Set(s)
                          if (n.has(i)) n.delete(i)
                          else n.add(i)
                          return n
                        })
                      }
                    />
                  ),
                )}
              </ol>
            </>
          ) : (
            <p className="gx-muted">Selecione uma atividade para ver as etapas.</p>
          )}
        </section>
      </div>

      <DeletarDialog
        open={deleteOpen}
        title="Deseja mesmo excluir a atividade?"
        busy={busy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={remove}
      />
      <span hidden>{trail.id}</span>
    </>
  )
}
