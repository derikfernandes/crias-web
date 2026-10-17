import { useMemo, useRef, useState } from 'react'
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
import { downloadText, parseYesNo, pick, readTable, toCsv } from '../../lib/tableFiles'
import { isLinkActive, moveStudentsPosition } from '../../lib/trailOps'
import type { ActivityDraft } from '../../lib/trailActivities'
import type { Student } from '../../types/student'
import type { StudentTrail } from '../../types/studentTrail'
import type { StructurePhase } from '../../lib/trailEditor'
import { fmtDateTime } from '../../lib/gestaoFormat'

/**
 * Alunos da trilha (1.1.9): vínculo Ativo/Inativo por aluno, em lote no Salvar do título.
 * Adicionar lista quem não está ativado; Remover lista quem está. O aluno não muda de lugar ao
 * alternar. Em massa: base de ativos e inativos (inativos primeiro) e importação com confirmação.
 */

export type StudentChanges = Map<string, boolean>

type Mode = 'add' | 'remove'

export function StudentsTab({
  trailId,
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
  students: Student[]
  links: StudentTrail[]
  activities: ActivityDraft[]
  phases: StructurePhase[]
  /** Trocas pendentes (aluno -> ativo?). O Salvar do título aplica tudo. */
  changes: StudentChanges
  onChanges: (next: StudentChanges) => void
  /** Importação em massa: aplica na hora, depois da confirmação. */
  onApplyMass: (changes: StudentChanges) => Promise<void>
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

  /* Planilha em massa */
  const fileRef = useRef<HTMLInputElement>(null)
  const [massPending, setMassPending] = useState<StudentChanges | null>(null)
  function download() {
    const sorted = [...students].sort((a, b) => {
      const aa = isLinkActive(byStudent.get(a.id)) ? 1 : 0
      const bb = isLinkActive(byStudent.get(b.id)) ? 1 : 0
      return aa - bb || (a.name || '').localeCompare(b.name || '', 'pt-BR')
    })
    downloadText(
      `alunos-trilha-${trailId}.csv`,
      toCsv(
        ['nome', 'código', 'telefone', 'ativo'],
        sorted.map((s) => [
          s.name,
          String(studentCode(s.id) ?? ''),
          s.phone_number,
          isLinkActive(byStudent.get(s.id)) ? 'sim' : 'não',
        ]),
      ),
    )
  }
  async function loadMass(file: File | null) {
    setMassPending(null)
    if (!file) return
    setError(null)
    try {
      const rows = await readTable(file)
      const byCode = new Map(students.map((s) => [String(studentCode(s.id) ?? ''), s]))
      const byPhone = new Map(students.map((s) => [s.phone_number.replace(/\D/g, ''), s]))
      const next: StudentChanges = new Map()
      let unknown = 0
      for (const row of rows) {
        const active = parseYesNo(pick(row, 'ativo', 'ativa'))
        if (active === null) continue
        const code = pick(row, 'código', 'codigo').replace(/\D/g, '').replace(/^0+/, '')
        const phone = pick(row, 'telefone', 'celular').replace(/\D/g, '')
        const s = (code && byCode.get(code)) || (phone && byPhone.get(phone)) || null
        if (!s) {
          unknown += 1
          continue
        }
        if (active !== isLinkActive(byStudent.get(s.id))) next.set(s.id, active)
      }
      if (next.size === 0) {
        setNotice(unknown > 0 ? `Nenhuma alteração. ${unknown} linha(s) sem aluno correspondente.` : 'Nenhuma alteração na planilha.')
        return
      }
      setMassPending(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao ler a planilha.')
    }
  }

  /* Tabela de alunos da trilha */
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
    [linked, selected, sort, studentById],
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
              aria-label="Alterar posição em lote"
              className="gx-switchkey"
              onClick={() => setBulk((v) => !v)}
            />
            <span>Alterar posição em lote</span>
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
          <div className="gx-callout">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="gx-btn" onClick={download}>
                Baixar base de alunos ativos e inativos
              </button>
              <label className="gx-btn gx-btn--primary" style={{ position: 'relative' }}>
                Importar em massa
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  aria-label="Importar alunos em massa"
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                  onChange={(e) => void loadMass(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <p className="gx-muted">
              Planilha com inativos primeiro e ativos depois: nome, código, telefone, ativo (sim / não). Altere a
              coluna ativo e importe o arquivo.
            </p>
            {massPending ? (
              <div className="gx-inlinebar" role="alertdialog">
                <strong style={{ fontSize: 14 }}>Tem certeza que deseja alterar os alunos da trilha em lote?</strong>
                <span className="gx-muted">{massPending.size} aluno(s) mudam de situação.</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="gx-btn"
                    onClick={() => {
                      setMassPending(null)
                      if (fileRef.current) fileRef.current.value = ''
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="gx-btn gx-btn--primary"
                    disabled={busy}
                    onClick={() => {
                      const toApply = massPending
                      setMassPending(null)
                      if (fileRef.current) fileRef.current.value = ''
                      void onApplyMass(toApply)
                    }}
                  >
                    Alterar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
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
                <SortHead label="Etapa" sortKey="stage" sort={sort} onSort={setSort} />
                <SortHead label="Atividade" sortKey="question" sort={sort} onSort={setSort} />
                <SortHead label="Status" sortKey="status" sort={sort} onSort={setSort} />
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
                    <td>{l.current_stage_number}</td>
                    <td>{l.current_question_number}</td>
                    <td>
                      <span className={statusPillClass(l.status)}>{STATUS_LABEL[l.status]}</span>
                    </td>
                    <td>{fmtDate(l.started_at)}</td>
                    <td>{fmtDateTime(l.last_interaction_at)}</td>
                  </tr>
                )
              })}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={bulk ? 7 : 6} className="gx-table__empty">
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
