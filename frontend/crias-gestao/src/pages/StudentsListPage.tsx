import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { snapshotToStudent } from '../lib/studentFirestore'
import { snapshotToStudentTrail } from '../lib/studentTrailFirestore'
import { snapshotToTrail } from '../lib/trailFirestore'
import {
  activePillClass,
  fmtDate,
  STATUS_LABEL,
  statusPillClass,
  studentCode,
} from '../lib/gestaoFormat'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { usePermissions } from '../hooks/usePermissions'
import type { Student } from '../types/student'
import type { StudentTrailStatus } from '../types/studentTrail'
import {
  Banner,
  BootSymbol,
  FilterPopover,
  na,
  PageHead,
  Pager,
  ScrollX,
  SortHead,
  sortRows,
  usePager,
  type SortState,
} from '../design/gx/ui'
import { BulkBlocks } from './students/BulkBlocks'

const PED = ['', 'Básico', 'Intermediário', 'Avançado']

function schooling(s: Student): string {
  const level = s.school_level === 'fundamental' ? 'Fundamental' : s.school_level === 'médio' ? 'Médio' : s.school_level
  return [level, s.school_grade].filter(Boolean).join(' · ') || 'N/A'
}

/** Página Alunos (1.1.12): blocos de cadastro e remoção em massa, filtros por nome e código, tabela. */
export function StudentsListPage() {
  const g = useGestao()
  const { canNav } = usePermissions()
  const students = useCollection('students', snapshotToStudent)
  const links = useCollection('student_trails', snapshotToStudentTrail)
  const trails = useCollection('trails', snapshotToTrail)
  const [byName, setByName] = useState<Set<string> | null>(null)
  const [byCode, setByCode] = useState<Set<string> | null>(null)
  const [sort, setSort] = useState<SortState | null>({ key: 'code', dir: 'asc' })

  const scoped = useMemo(
    () => students.rows.filter((s) => g.scopedIds.has(s.institution_id)),
    [students.rows, g.scopedIds],
  )
  const lines = useMemo(() => {
    const trailName = new Map(trails.rows.map((t) => [t.id, t.name]))
    return scoped.map((s) => {
      const mine = links.rows
        .filter((l) => l.student_id === s.id)
        .sort((a, b) => (b.last_interaction_at?.toMillis?.() ?? 0) - (a.last_interaction_at?.toMillis?.() ?? 0))
      const top = mine[0]
      const code = studentCode(s.id)
      return {
        student: s,
        code,
        trail: top ? (trailName.get(top.trail_id) ?? 'N/A') : 'N/A',
        stage: top?.current_stage_number ?? null,
        question: top?.current_question_number ?? null,
        status: (top?.status ?? null) as StudentTrailStatus | null,
      }
    })
  }, [scoped, links.rows, trails.rows])

  const nameOptions = useMemo(() => scoped.map((s) => ({ id: s.id, name: s.name || s.id })), [scoped])
  const codeOptions = useMemo(
    () =>
      lines
        .filter((l) => l.code !== null)
        .sort((a, b) => (a.code ?? 0) - (b.code ?? 0))
        .map((l) => ({ id: l.student.id, name: String(l.code) })),
    [lines],
  )
  const nameSel = byName ?? new Set(scoped.map((s) => s.id))
  const codeSel = byCode ?? new Set(scoped.map((s) => s.id))

  const rows = useMemo(
    () =>
      sortRows(
        lines.filter((l) => nameSel.has(l.student.id) && codeSel.has(l.student.id)),
        sort,
        (l, k) => {
          const s = l.student
          switch (k) {
            case 'name': return s.name
            case 'code': return l.code
            case 'trail': return l.trail
            case 'stage': return l.stage
            case 'question': return l.question
            case 'status': return l.status ? STATUS_LABEL[l.status] : null
            case 'phone': return s.phone_number
            case 'level': return schooling(s)
            case 'ped': return PED[s.student_level] ?? null
            case 'active': return s.active ? 'Sim' : 'Não'
            case 'created': return s.created_at?.toMillis?.() ?? null
            default: return s.updated_at?.toMillis?.() ?? null
          }
        },
      ),
    [lines, nameSel, codeSel, sort],
  )
  const pager = usePager(rows, 100)

  const single = g.scopedInstitutions.length === 1 ? g.scopedInstitutions[0] : null
  const ready = students.ready && links.ready && trails.ready && !g.institutionsLoading
  if (!ready) return <BootSymbol />

  const head = (label: string, key: string, numeric?: boolean) => (
    <SortHead label={label} sortKey={key} sort={sort} onSort={setSort} numeric={numeric} />
  )

  return (
    <div className="gx-page">
      <PageHead
        title="Alunos"
        subtitle="Cadastro de alunos da instituição."
        actions={
          canNav('student_new') ? (
            <Link to="/alunos/novo" className="gx-btn gx-btn--primary">
              + Novo aluno
            </Link>
          ) : null
        }
      />
      {students.error ? (
        <Banner onRetry={students.retry}>Não foi possível carregar os dados. Tente atualizar a página.</Banner>
      ) : null}
      <BulkBlocks institution={single} students={students.rows} trails={trails.rows} />
      <section className="gx-card" aria-label="Alunos" style={{ padding: 0, gap: 0, overflow: 'visible' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '24px 24px 20px' }}>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <FilterPopover
              variant="field"
              align="left"
              label="Filtrar por nome"
              options={nameOptions}
              selected={nameSel}
              onChange={(n) => {
                setByName(n)
                pager.reset()
              }}
            />
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <FilterPopover
              variant="field"
              align="left"
              label="Filtrar por código"
              options={codeOptions}
              selected={codeSel}
              onChange={(n) => {
                setByCode(n)
                pager.reset()
              }}
            />
          </div>
        </div>
        <ScrollX>
          <table className="gx-table">
            <thead>
              <tr>
                {head('Nome', 'name')}
                {head('Código', 'code', true)}
                {head('Trilha', 'trail')}
                {head('Etapa', 'stage', true)}
                {head('Atividade', 'question', true)}
                {head('Status', 'status')}
                {head('Telefone', 'phone')}
                {head('Escolaridade', 'level')}
                {head('Nível pedagógico', 'ped')}
                {head('Ativo', 'active')}
                {head('Criado em', 'created')}
                {head('Atualizado em', 'updated')}
                <th />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((l) => (
                <tr key={l.student.id}>
                  <td data-col="name">
                    <Link to={`/alunos/${l.student.id}`} style={{ color: 'var(--v-ink)', fontWeight: 700 }} data-fade="1">
                      {l.student.name || l.student.id}
                    </Link>
                  </td>
                  <td className="num" data-col="code">{na(l.code)}</td>
                  <td data-col="trail">{l.trail}</td>
                  <td className="num">{na(l.stage)}</td>
                  <td className="num">{na(l.question)}</td>
                  <td>
                    <span className={statusPillClass(l.status)}>{l.status ? STATUS_LABEL[l.status] : 'N/A'}</span>
                  </td>
                  <td data-col="phone">{na(l.student.phone_number)}</td>
                  <td data-col="level">{schooling(l.student)}</td>
                  <td>{na(PED[l.student.student_level])}</td>
                  <td>
                    <span className={activePillClass(l.student.active)}>{l.student.active ? 'Sim' : 'Não'}</span>
                  </td>
                  <td>{fmtDate(l.student.created_at)}</td>
                  <td>{fmtDate(l.student.updated_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/alunos/${l.student.id}`} className="gx-btn">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={13} className="gx-table__empty">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ScrollX>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--v-soft2)' }}>
          <Pager pager={pager} noun="aluno" nounPlural="alunos" sizes={[100, 500, 1000]} />
        </div>
      </section>
    </div>
  )
}
