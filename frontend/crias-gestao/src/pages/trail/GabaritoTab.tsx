import { useMemo, useState } from 'react'
import { BulkPanel } from '../../components/BulkPanel'
import { Banner, Dialog, FilterPopover, ScrollX } from '../../design/gx/ui'
import { planGabarito, plural, type GabaritoCell } from '../../lib/bulkActions'
import { downloadText, toCsv } from '../../lib/tableFiles'
import { correctToLetter, letterOf } from '../../lib/trailActivities'
import { saveCorrectOptions, setAnnulled } from '../../lib/trailOps'
import type { StructurePhase } from '../../lib/trailEditor'
import type { TrailStageQuestion } from '../../types/trailStageQuestion'

export type GabaritoDrafts = Map<string, string>

/**
 * Gabarito (1.1.12): resposta correta de cada exercício da trilha aberta, com "Só faltando" e
 * "Só anulados". Exercícios anulados ficam fora do cálculo de acerto. O Salvar do título grava tudo.
 */
const BASE_COLUMNS = ['ID Trilha', 'Trilha', 'Atividade', 'Exercício', 'Gabarito', 'Anular (sim / não)']

export function GabaritoTab({
  trailId,
  trailName,
  cells,
  phases,
  optionCount,
  drafts,
  onDrafts,
}: {
  trailId: string
  trailName: string
  cells: TrailStageQuestion[]
  phases: StructurePhase[]
  optionCount: number
  drafts: GabaritoDrafts
  onDrafts: (next: GabaritoDrafts) => void
}) {
  const exercises = useMemo(
    () =>
      cells
        .filter((c) => c.active && phases[c.stage_number - 1]?.stage_type === 'exercise')
        .sort((a, b) => a.question_number - b.question_number || a.stage_number - b.stage_number),
    [cells, phases],
  )
  const activityNumbers = useMemo(() => [...new Set(exercises.map((c) => c.question_number))], [exercises])
  const [picked, setPicked] = useState<Set<number> | null>(null)
  const selected = picked ?? new Set(activityNumbers)
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [onlyAnnulled, setOnlyAnnulled] = useState(false)
  const [annulling, setAnnulling] = useState<TrailStageQuestion | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const value = (c: TrailStageQuestion) => drafts.get(c.id) ?? correctToLetter(c.correct_option)
  const rows = exercises.filter((c) => {
    if (!selected.has(c.question_number)) return false
    if (onlyAnnulled) return c.annulled
    if (onlyMissing) return !c.annulled && !value(c)
    return true
  })
  const letters = Array.from({ length: optionCount }, (_, i) => letterOf(i))

  /** Exercícios numerados dentro de cada atividade (1, 2, 3...), como na planilha em massa. */
  const bulkCells = useMemo<GabaritoCell[]>(() => {
    const counter = new Map<number, number>()
    return exercises.map((c) => {
      const n = (counter.get(c.question_number) ?? 0) + 1
      counter.set(c.question_number, n)
      return { id: c.id, activity: c.question_number, exercise: n, letter: correctToLetter(c.correct_option), annulled: c.annulled }
    })
  }, [exercises])

  function set(c: TrailStageQuestion, letter: string) {
    const saved = correctToLetter(c.correct_option)
    const next = new Map(drafts)
    if (letter === saved) next.delete(c.id)
    else next.set(c.id, letter)
    onDrafts(next)
  }

  async function annul() {
    if (!annulling) return
    try {
      await setAnnulled(annulling.id, true, reason)
      setAnnulling(null)
      setReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível anular.')
    }
  }

  return (
    <section className="gx-card" aria-label="Gabarito dos exercícios">
      <div>
        <h2>Gabarito dos exercícios</h2>
        <p className="gx-muted" style={{ lineHeight: 1.5 }}>
          Resposta correta de cada exercício da trilha. Exercícios anulados ficam fora do cálculo de acerto.
        </p>
      </div>
      {error ? <Banner>{error}</Banner> : null}
      <BulkPanel
        title="Alterar gabarito em massa"
        subtitle="Altere o gabarito e anule exercícios de uma vez com uma planilha"
        columns={BASE_COLUMNS}
        note='A planilha base vem com o gabarito atual. Somente as alterações nas colunas "gabarito" ou "anular" são registradas.'
        baseLabel="Baixar planilha base"
        onDownload={() =>
          downloadText(
            `base-gabarito-${trailId}.csv`,
            toCsv(
              BASE_COLUMNS,
              bulkCells.map((c) => [trailId, trailName, String(c.activity), String(c.exercise), c.letter, c.annulled ? 'sim' : 'não']),
            ),
          )
        }
        plan={(rows) => {
          const p = planGabarito(rows, { trailId, cells: bulkCells, optionCount })
          return {
            data: p,
            preview: {
              confirmTitle: 'Alterar gabarito em massa?',
              confirmText: `${plural(p.changedLetters, 'gabarito será alterado', 'gabaritos serão alterados')}, ${p.annulled} ${
                p.annulled === 1 ? 'exercício anulado' : 'exercícios anulados'
              }${p.reactivated > 0 ? `, ${p.reactivated} reativado${p.reactivated === 1 ? '' : 's'}` : ''} e ${p.unchanged} ${
                p.unchanged === 1 ? 'fica' : 'ficam'
              } como ${p.unchanged === 1 ? 'está' : 'estão'}.`,
              actionable: p.items.length,
              issues: p.issues,
            },
          }
        }}
        apply={async (p) => {
          const letters = new Map(p.items.filter((i) => i.letter !== undefined).map((i) => [i.cellId, i.letter as string]))
          if (letters.size > 0) await saveCorrectOptions(letters)
          for (const i of p.items) {
            if (i.annulled !== undefined) await setAnnulled(i.cellId, i.annulled, 'Alterado em massa')
          }
          // As trocas pendentes dessas células ficam sem efeito: a planilha acabou de gravar.
          const next = new Map(drafts)
          for (const i of p.items) next.delete(i.cellId)
          if (next.size !== drafts.size) onDrafts(next)
          return {
            summary: `${p.changedLetters} ${p.changedLetters === 1 ? 'gabarito alterado' : 'gabaritos alterados'}, ${p.annulled} ${
              p.annulled === 1 ? 'anulado' : 'anulados'
            }${p.reactivated > 0 ? `, ${p.reactivated} ${p.reactivated === 1 ? 'reativado' : 'reativados'}` : ''}, ${p.unchanged} sem mudança.`,
          }
        }}
        actionLabel="Alterar"
        confirmLabel="Alterar"
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: '0 1 max(calc(50% - 6px), min(100%, 360px))', minWidth: 0 }}>
          <FilterPopover
            variant="field"
            align="left"
            label="Filtrar atividades"
            options={activityNumbers.map((n) => ({ id: String(n), name: `Atividade ${n}` }))}
            selected={new Set([...selected].map(String))}
            onChange={(n) => setPicked(new Set([...n].map(Number)))}
            emptyText="Nada encontrado."
          />
        </div>
        <label className="gx-check gx-btn" style={{ height: 40, borderRadius: 12 }}>
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Só faltando
        </label>
        <label className="gx-check gx-btn" style={{ height: 40, borderRadius: 12 }}>
          <input type="checkbox" checked={onlyAnnulled} onChange={(e) => setOnlyAnnulled(e.target.checked)} />
          Só anulados
        </label>
      </div>
      <div style={{ border: '1px solid var(--v-soft2)', borderRadius: 12, overflow: 'hidden' }}>
        <ScrollX>
          <table className="gx-table">
            <thead>
              <tr>
                <th>Atividade</th>
                <th>Etapa</th>
                <th>Exercício</th>
                <th>Gabarito</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const v = value(c)
                return (
                  <tr key={c.id}>
                    <td>{c.question_number}</td>
                    <td>{c.stage_number}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: 240 }}>{c.content.split('\n')[0] || 'N/A'}</td>
                    <td>
                      <select
                        className="gx-select"
                        style={{ width: 96 }}
                        aria-label={`Gabarito da atividade ${c.question_number}, etapa ${c.stage_number}`}
                        disabled={c.annulled}
                        value={v}
                        onChange={(e) => set(c, e.target.value)}
                      >
                        <option value="">N/A</option>
                        {letters.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={c.annulled ? 'gx-pill gx-pill--err' : v ? 'gx-pill gx-pill--ok' : 'gx-pill gx-pill--warn'}>
                        {c.annulled ? 'Anulado' : v ? 'Com gabarito' : 'Sem gabarito'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="gx-btn"
                        onClick={() => {
                          if (c.annulled) void setAnnulled(c.id, false)
                          else setAnnulling(c)
                        }}
                      >
                        {c.annulled ? 'Reativar' : 'Anular'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="gx-table__empty">
                    Nenhum exercício com os filtros atuais.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ScrollX>
      </div>
      <Dialog
        open={Boolean(annulling)}
        title="Anular exercício?"
        onClose={() => setAnnulling(null)}
        actions={
          <>
            <button type="button" className="gx-btn" onClick={() => setAnnulling(null)}>
              Cancelar
            </button>
            <button type="button" className="gx-btn gx-btn--danger" onClick={() => void annul()}>
              Anular
            </button>
          </>
        }
      >
        <p>O exercício sai do cálculo de acerto e erro. Diga o motivo:</p>
        <input
          className="gx-input"
          aria-label="Motivo da anulação"
          placeholder="Ex.: gabarito do material veio errado"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Dialog>
    </section>
  )
}
