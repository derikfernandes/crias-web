import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banner,
  FilterPopover,
  Pager,
  ScrollX,
  SortHead,
  sortRows,
  usePager,
  type SortState,
} from '../../design/gx/ui'
import { fmtDate, STATUS_LABEL, statusPillClass, studentCode } from '../../lib/gestaoFormat'
import { BulkPanel } from '../../components/BulkPanel'
import { planTrailStudents, plural } from '../../lib/bulkActions'
import { downloadText, toCsv } from '../../lib/tableFiles'
import { isLinkActive, moveStudentsPosition } from '../../lib/trailOps'
import type { ActivityDraft } from '../../lib/trailActivities'
import type { Student } from '../../types/student'
import type { StudentTrail } from '../../types/studentTrail'
import type { StructurePhase } from '../../lib/trailEditor'
import { fmtDateTime } from '../../lib/gestaoFormat'
import { useTrailAttempts } from '../../hooks/useTrailAttempts'
import { pctOf } from '../../hooks/useStudentMetrics'
import { accuracyFromAttempts } from '../../lib/dashboardTrailProgress'
import { PctCell } from '../../components/PctCell'

/**
 * Alunos da trilha (1.1.9): vínculo Ativo/Inativo por aluno, em lote no Salvar do título.
 * Adicionar lista quem não está ativado; Remover lista quem está. O aluno não muda de lugar ao
 * alternar. Em massa: base de ativos e inativos (inativos primeiro) e importação com confirmação.
 */

export type StudentChanges = Map<string, boolean>

type Mode = 'add' | 'remove'

// 1.3.13: Turma depois do Nome (visualização).
const BASE_COLUMNS = ['ID Trilha', 'Trilha', 'ID Aluno', 'Nome (visualização)', 'Turma (visualização)', 'Telefone (visualização)', 'Ativo (sim / não)']

export function StudentsTab({
  trailId,
  trailName,
  students,
  links,
  activities,
  phases,
  changes,
  onChanges,
  onApplyMass,
  busy,
}: {
  trailId: string
  trailName: string
  students: Student[]
  links: StudentTrail[]
  activities: ActivityDraft[]
  phases: StructurePhase[]
  /** Trocas pendentes (aluno -> ativo?). O Salvar do título aplica tudo. */
  changes: StudentChanges
  onChanges: (next: StudentChanges) => void
  /** Ativar ou inativar em massa: aplica na hora, depois da confirmação em linha. */
  onApplyMass: (changes: StudentChanges) => Promise<{ created: number; activated: number; deactivated: number }>
  busy: boolean
}) {
  const byStudent = useMemo(() => new Map(links.map((l) => [l.student_id, l])), [links])
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const [panel, setPanel] = useState(false)
  const [mode, setMode] = useState<Mode>('add')
  const [bulk, setBulk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  /* Listas congeladas pelo estado salvo, para o aluno não "pular" de aba ao alternar. */
  const inactiveSaved = useMemo(
    () => students.filter((s) => !isLinkActive(byStudent.get(s.id))),
    [students, byStudent],
  )
  const activeSaved = useMemo(
    () => students.filter((s) => isLinkActive(byStudent.get(s.id))),
    [students, byStudent],
  )
  const listRows = mode === 'add' ? inactiveSaved : activeSaved
  const effective = (s: Student) => {
    const pending = changes.get(s.id)
    return pending === undefined ? isLinkActive(byStudent.get(s.id)) : pending
  }
  function toggle(s: Student) {
    const saved = isLinkActive(byStudent.get(s.id))
    const next = new Map(changes)
    const want = !effective(s)
    if (want === saved) next.delete(s.id)
    else next.set(s.id, want)
    onChanges(next)
  }

  /* Tabela de alunos da trilha (1.3.12: Turma depois do nome; depois de Status, o desempenho do Dados nesta trilha). */
  const attempts = useTrailAttempts(trailId)
  const releasedCount = useMemo(() => activities.filter((a) => a.released).length, [activities])
  const perfOf = (l: StudentTrail) => {
    const done =
      l.status === 'completed'
        ? releasedCount
        : l.status === 'not_started'
          ? 0
          : Math.max(0, Math.min(releasedCount, (l.current_question_number || 1) - 1))
    const acc = accuracyFromAttempts(attempts, l.student_id, new Set([trailId]))
    return {
      released: releasedCount,
      done,
      donePct: pctOf(done, releasedCount),
      correct: acc.correct,
      wrong: acc.wrong,
      accPct: pctOf(acc.correct, acc.correct + acc.wrong),
    }
  }
  const [filterSel, setFilterSel] = useState<Set<string> | null>(null)
  const linked = useMemo(() => links.filter((l) => studentById.has(l.student_id)), [links, studentById])
  const selected = useMemo(() => filterSel ?? new Set(linked.map((l) => l.student_id)), [filterSel, linked])
  const [sort, setSort] = useState<SortState | null>({ key: 'name', dir: 'asc' })
  const rows = useMemo(
    () =>
      sortRows(
        linked.filter((l) => selected.has(l.student_id)),
        sort,
        (l, k) =>
          k === 'name'
            ? studentById.get(l.student_id)?.name
            : k === 'turma'
              ? (studentById.get(l.student_id)?.turma ?? '').trim() || null
            : k === 'lr'
              ? perfOf(l).released
            : k === 'ld'
              ? perfOf(l).done
            : k === 'lp'
              ? perfOf(l).donePct
            : k === 'ok'
              ? perfOf(l).correct
            : k === 'err'
              ? perfOf(l).wrong
            : k === 'acc'
              ? perfOf(l).accPct
            : k === 'stage'
              ? l.current_stage_number
              : k === 'question'
                ? l.current_question_number
                : k === 'status'
                  ? STATUS_LABEL[l.status]
                  : k === 'started'
                    ? (l.started_at?.toMillis?.() ?? null)
                    : (l.last_interaction_at?.toMillis?.() ?? null),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linked, selected, sort, studentById, attempts, releasedCount],
  )
  const pager = usePager(rows, 100)
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [destQuestion, setDestQuestion] = useState('')
  const [destStage, setDestStage] = useState('')
  const [moving, setMoving] = useState(false)

  async function applyMove() {
    const q = Number(destQuestion)
    const s = Number(destStage)
    if (marked.size === 0 || !q || !s) return
    setMoving(true)
    setError(null)
    try {
      await moveStudentsPosition({ linkIds: [...marked], stage: s, question: q })
      setNotice(`${marked.size} aluno(s) movido(s) para a atividade ${q}, etapa ${s}.`)
      setMarked(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível mover os alunos.')
    } finally {
      setMoving(false)
    }
  }

  const pendingCount = changes.size
  const addCount = [...changes.values()].filter(Boolean).length

  return (
    <section className="gx-card" aria-label="Alunos da trilha">
      <div className="gx-card__head">
        <h2>Alunos da trilha</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span className="gx-switchrow">
            <button
              type="button"
              role="switch"
              aria-checked={bulk}
              aria-label="Alterar posição em massa"
              className="gx-switchkey"
              onClick={() => setBulk((v) => !v)}
            />
            <span>Alterar posição em massa</span>
          </span>
          <button type="button" className="gx-btn gx-btn--primary" onClick={() => setPanel((v) => !v)}>
            {panel ? 'Fechar' : 'Adicionar ou remover'}
          </button>
        </div>
      </div>
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      {panel ? (
        <div className="gx-card" style={{ gap: 14, padding: 16 }}>
          <BulkPanel
            title="Ativar ou inativar alunos em massa"
            subtitle="Ative ou inative vários alunos da trilha de uma vez com uma planilha"
            columns={BASE_COLUMNS}
            note='A planilha base vem toda preenchida, com os inativos primeiro. Só a coluna "ativo" é lida; o aluno é achado pelo ID Aluno. O progresso de quem é inativado fica guardado.'
            baseLabel="Baixar planilha base"
            disabled={busy}
            onDownload={() => {
              const sorted = [...students].sort((a, b) => {
                const aa = isLinkActive(byStudent.get(a.id)) ? 1 : 0
                const bb = isLinkActive(byStudent.get(b.id)) ? 1 : 0
                return aa - bb || (a.name || '').localeCompare(b.name || '', 'pt-BR')
              })
              downloadText(
                `base-alunos-trilha-${trailId}.csv`,
                toCsv(
                  BASE_COLUMNS,
                  sorted.map((s) => [trailId, trailName, s.id, s.name, (s.turma ?? '').trim(), s.phone_number, isLinkActive(byStudent.get(s.id)) ? 'sim' : 'não']),
                ),
              )
            }}
            plan={(rows) => {
              const p = planTrailStudents(rows, {
                trailId,
                students,
                isActive: (id) => isLinkActive(byStudent.get(id)),
              })
              return {
                data: p,
                preview: {
                  confirmTitle: 'Ativar ou inativar em massa?',
                  confirmText: `${plural(p.activate, 'aluno será ativado', 'alunos serão ativados')}, ${p.inactivate} ${
                    p.inactivate === 1 ? 'inativado' : 'inativados'
                  } e ${p.unchanged} ${p.unchanged === 1 ? 'fica' : 'ficam'} como ${p.unchanged === 1 ? 'está' : 'estão'}.`,
                  actionable: p.changes.size,
                  issues: p.issues,
                },
              }
            }}
            apply={async (p) => {
              const r = await onApplyMass(p.changes)
              return {
                summary: `${r.created + r.activated} ${r.created + r.activated === 1 ? 'ativado' : 'ativados'}, ${r.deactivated} ${
                  r.deactivated === 1 ? 'inativado' : 'inativados'
                }, ${p.unchanged} sem mudança.`,
              }
            }}
            actionLabel="Atualizar"
            confirmLabel="Confirmar"
            defaultOpen
          />
          <nav role="tablist" aria-label="Adicionar ou remover" className="gx-tabs" style={{ marginTop: 0 }}>
            <button role="tab" type="button" className="gx-tab" aria-selected={mode === 'add'} onClick={() => setMode('add')}>
              Adicionar alunos
            </button>
            <button role="tab" type="button" className="gx-tab" aria-selected={mode === 'remove'} onClick={() => setMode('remove')}>
              Remover alunos
            </button>
          </nav>
          <p className="gx-muted">
            {mode === 'add'
              ? 'Alunos que ainda não estão ativos na trilha. Ative quem deve ter acesso e use Salvar no topo.'
              : 'Alunos ativos na trilha. Inative quem deve perder o acesso (o histórico fica guardado) e use Salvar no topo.'}
            {pendingCount > 0 ? ` ${pendingCount} alteração(ões) pendente(s).` : ''}
          </p>
          <div className="gx-scrollbox" data-sfade="y">
            {listRows.map((s) => {
              const on = effective(s)
              return (
                <div className="gx-togglerow" key={s.id}>
                  <strong data-fade="1">{s.name || s.id}</strong>
                  <span className="gx-muted" style={{ minWidth: 44 }}>
                    {(s.turma ?? '').trim() || 'N/A'}
                  </span>
                  <span className="gx-muted" style={{ minWidth: 40, fontVariantNumeric: 'tabular-nums' }}>
                    {studentCode(s.id) ?? 'N/A'}
                  </span>
                  <span className="gx-switchrow">
                    <span style={{ minWidth: 44, textAlign: 'right' }}>{on ? 'Ativo' : 'Inativo'}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${s.name || s.id}: ${on ? 'ativo' : 'inativo'}`}
                      className="gx-switchkey"
                      onClick={() => toggle(s)}
                    />
                  </span>
                </div>
              )
            })}
            {listRows.length === 0 ? (
              <p className="gx-muted" style={{ padding: '12px 4px' }}>
                {mode === 'add' ? 'Todos os alunos da instituição já estão ativos nesta trilha.' : 'Nenhum aluno ativo nesta trilha.'}
              </p>
            ) : null}
          </div>
          {addCount > 0 ? <span className="gx-muted">{addCount} aluno(s) serão ativados.</span> : null}
        </div>
      ) : null}

      {bulk ? (
        <div className="gx-callout">
          <p className="gx-muted">Marque os alunos na tabela, escolha a atividade e a etapa de destino e aplique.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
            <label className="gx-field" style={{ minWidth: 180 }}>
              <span>Atividade de destino</span>
              <select className="gx-select" value={destQuestion} onChange={(e) => setDestQuestion(e.target.value)}>
                <option value="">Escolha</option>
                {activities.map((a) => (
                  <option key={a.number} value={a.number}>
                    {a.number} · {a.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="gx-field" style={{ minWidth: 180 }}>
              <span>Etapa de destino</span>
              <select className="gx-select" value={destStage} onChange={(e) => setDestStage(e.target.value)}>
                <option value="">Escolha</option>
                {phases.map((_, i) => (
                  <option key={i} value={i + 1}>
                    Etapa {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="gx-btn gx-btn--primary"
              disabled={moving || marked.size === 0 || !destQuestion || !destStage}
              onClick={() => void applyMove()}
            >
              {moving ? 'Aplicando…' : `Aplicar a ${marked.size} aluno(s)`}
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ flex: '1 1 100%' }}>
        <FilterPopover
          variant="field"
          align="left"
          label="Filtrar alunos"
          options={linked.map((l) => ({ id: l.student_id, name: studentById.get(l.student_id)?.name || l.student_id }))}
          selected={selected}
          onChange={(n) => {
            setFilterSel(n)
            pager.reset()
          }}
          emptyText="Nada encontrado."
        />
      </div>
      <div style={{ border: '1px solid var(--v-soft2)', borderRadius: 12, overflow: 'hidden' }}>
        <ScrollX>
          <table className="gx-table">
            <thead>
              <tr>
                {bulk ? <th style={{ width: 36 }} /> : null}
                <SortHead label="Aluno" sortKey="name" sort={sort} onSort={setSort} />
                <SortHead label="Turma" sortKey="turma" sort={sort} onSort={setSort} />
                <SortHead label="Etapa" sortKey="stage" sort={sort} onSort={setSort} />
                <SortHead label="Atividade" sortKey="question" sort={sort} onSort={setSort} />
                <SortHead label="Status" sortKey="status" sort={sort} onSort={setSort} />
                <SortHead label="Atividades liberadas" sortKey="lr" sort={sort} onSort={setSort} numeric />
                <SortHead label="Atividades feitas" sortKey="ld" sort={sort} onSort={setSort} numeric />
                <SortHead label="% de conclusão" sortKey="lp" sort={sort} onSort={setSort} numeric />
                <SortHead label="Acertos" sortKey="ok" sort={sort} onSort={setSort} numeric />
                <SortHead label="Erros" sortKey="err" sort={sort} onSort={setSort} numeric />
                <SortHead label="% de acerto" sortKey="acc" sort={sort} onSort={setSort} numeric />
                <SortHead label="Início" sortKey="started" sort={sort} onSort={setSort} />
                <SortHead label="Última interação" sortKey="last" sort={sort} onSort={setSort} />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((l) => {
                const s = studentById.get(l.student_id)
                return (
                  <tr key={l.id}>
                    {bulk ? (
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Marcar ${s?.name ?? l.student_id}`}
                          checked={marked.has(l.id)}
                          style={{ width: 16, height: 16, accentColor: 'var(--v-green)' }}
                          onChange={() =>
                            setMarked((m) => {
                              const n = new Set(m)
                              if (n.has(l.id)) n.delete(l.id)
                              else n.add(l.id)
                              return n
                            })
                          }
                        />
                      </td>
                    ) : null}
                    <td>
                      <Link to={`/alunos/${l.student_id}`} style={{ color: 'var(--v-ink)', fontWeight: 700 }}>
                        {s?.name || l.student_id}
                      </Link>
                      <div className="gx-muted" style={{ fontSize: 12 }}>
                        {s?.phone_number || 'N/A'}
                      </div>
                    </td>
                    <td>{(s?.turma ?? '').trim() || 'N/A'}</td>
                    <td>{l.current_stage_number}</td>
                    <td>{l.current_question_number}</td>
                    <td>
                      <span className={statusPillClass(l.status)}>{STATUS_LABEL[l.status]}</span>
                    </td>
                    {(() => {
                      const p = perfOf(l)
                      return (
                        <>
                          <td className="num">{p.released}</td>
                          <td className="num">{p.done}</td>
                          <td>
                            <PctCell value={p.donePct} />
                          </td>
                          <td className="num">{p.correct}</td>
                          <td className="num">{p.wrong}</td>
                          <td>
                            <PctCell value={p.accPct} ok />
                          </td>
                        </>
                      )
                    })()}
                    <td>{fmtDate(l.started_at)}</td>
                    <td>{fmtDateTime(l.last_interaction_at)}</td>
                  </tr>
                )
              })}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={bulk ? 14 : 13} className="gx-table__empty">
                    Nenhum aluno com progresso nesta trilha. Use Adicionar ou remover para ativar alunos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ScrollX>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--v-soft2)' }}>
          <Pager pager={pager} noun="aluno" nounPlural="alunos" sizes={[100, 500, 1000]} />
        </div>
      </div>
    </section>
  )
}
