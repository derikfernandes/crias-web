import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { snapshotToStudent } from '../lib/studentFirestore'
import { snapshotToStudentTrail } from '../lib/studentTrailFirestore'
import { snapshotToTrail } from '../lib/trailFirestore'
import { snapshotToTrailStageQuestion } from '../lib/trailStageQuestionFirestore'
import { activityKeysByTrail } from '../lib/gestaoMetrics'
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
import { Icon } from '../design/gx/ui'
import { downloadText, toCsv } from '../lib/tableFiles'
import { scopeOf, studentInScope } from '../lib/turmas'
import { pctOf, useStudentMetrics } from '../hooks/useStudentMetrics'
import { PctCell } from '../components/PctCell'


const PED = ['', 'Básico', 'Intermediário', 'Avançado']

function schooling(s: Student): string {
  const level = s.school_level === 'fundamental' ? 'Fundamental' : s.school_level === 'médio' ? 'Médio' : s.school_level
  return [level, s.school_grade].filter(Boolean).join(' · ') || 'N/A'
}

/** Exibe atividade atual limitada ao máximo da etapa atual (só display). */
function clampActivityInStage(
  stage: number | null | undefined,
  question: number | null | undefined,
  catalog: Array<{ stage: number; question: number }>,
): number | null {
  if (question == null || !Number.isFinite(question)) return null
  if (stage == null || !Number.isFinite(stage) || catalog.length === 0) {
    return Math.max(1, question)
  }
  const inStage = catalog.filter((a) => a.stage === stage)
  if (inStage.length === 0) return Math.max(1, question)
  const maxQ = Math.max(...inStage.map((a) => a.question))
  return Math.min(Math.max(1, question), maxQ)
}

/** Página Alunos (1.1.12): blocos de cadastro e remoção em massa, filtros por nome e código, tabela. */
export function StudentsListPage() {
  const g = useGestao()
  const { canNav, adminProfile } = usePermissions()
  const students = useCollection('students', snapshotToStudent)
  const links = useCollection('student_trails', snapshotToStudentTrail)
  const trails = useCollection('trails', snapshotToTrail)
  const questions = useCollection('trail_stage_questions', snapshotToTrailStageQuestion)
  const [byName, setByName] = useState<Set<string> | null>(null)
  const [q, setQ] = useState('')
  const [byTurma, setByTurma] = useState<Set<string> | null>(null)
  const [sort, setSort] = useState<SortState | null>({ key: 'code', dir: 'asc' })

  const activityCatalogs = useMemo(
    () => activityKeysByTrail(questions.rows),
    [questions.rows],
  )

  // 1.3.18: o Professor só vê alunos das turmas dele (o servidor também filtra, CONFLITO 1.3.E.3).
  const scope = scopeOf(adminProfile)
  const scoped = useMemo(
    () => students.rows.filter((s) => g.scopedIds.has(s.institution_id) && studentInScope(scope, s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students.rows, g.scopedIds, adminProfile],
  )
  const metrics = useStudentMetrics(g.scopedInstitutions.map((i) => i.id))
  const perf = metrics.byStudent
  const lessonPct = (id: string) => {
    const m = perf.get(id)
    return m ? pctOf(m.lessonsDone, m.lessonsReleased) : null
  }
  const accPct = (id: string) => {
    const m = perf.get(id)
    return m ? pctOf(m.correct, m.correct + m.wrong) : null
  }
  const lines = useMemo(() => {
    const trailName = new Map(trails.rows.map((t) => [t.id, t.name]))
    return scoped.map((s) => {
      const mine = links.rows
        .filter((l) => l.student_id === s.id)
        .sort((a, b) => (b.last_interaction_at?.toMillis?.() ?? 0) - (a.last_interaction_at?.toMillis?.() ?? 0))
      const top = mine[0]
      const code = studentCode(s.id)
      const catalog = top ? (activityCatalogs.get(top.trail_id) ?? []) : []
      const stage = top?.current_stage_number ?? null
      return {
        student: s,
        code,
        trail: top ? (trailName.get(top.trail_id) ?? 'N/A') : 'N/A',
        stage,
        question: clampActivityInStage(stage, top?.current_question_number, catalog),
        status: (top?.status ?? null) as StudentTrailStatus | null,
      }
    })
  }, [scoped, links.rows, trails.rows, activityCatalogs])

  const nameOptions = useMemo(() => scoped.map((s) => ({ id: s.id, name: s.name || s.id })), [scoped])
  const turmaOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const s of scoped) {
      const t = (s.turma ?? '').trim()
      const key = t || '__none__'
      if (!seen.has(key)) seen.set(key, t || 'Sem turma')
    }
    return [...seen.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
      .map(([id, name]) => ({ id, name }))
  }, [scoped])
  const nameSel = byName ?? new Set(scoped.map((s) => s.id))
  const turmaSel = byTurma ?? new Set(turmaOptions.map((o) => o.id))

  const rows = useMemo(
    () =>
      sortRows(
        lines.filter((l) => {
          if (!nameSel.has(l.student.id)) return false
          const key = (l.student.turma ?? '').trim() || '__none__'
          if (!turmaSel.has(key)) return false
          // Pesquisa: nome, telefone ou ID (1.3.12.a: o filtro por ID saiu).
          const needle = q.trim().toLowerCase()
          if (!needle) return true
          const digits = q.replace(/\D/g, '')
          return (
            (l.student.name ?? '').toLowerCase().includes(needle) ||
            (digits.length > 0 && (l.student.phone_number ?? '').replace(/\D/g, '').includes(digits)) ||
            String(l.code ?? '') === needle ||
            l.student.id.toLowerCase() === needle
          )
        }),
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
            case 'turma': return (s.turma ?? '').trim() || null
            case 'level': return schooling(s)
            case 'ped': return PED[s.student_level] ?? null
            case 'lr': return perf.get(s.id)?.lessonsReleased ?? null
            case 'ld': return perf.get(s.id)?.lessonsDone ?? null
            case 'lp': return lessonPct(s.id)
            case 'ok': return perf.get(s.id)?.correct ?? null
            case 'err': return perf.get(s.id)?.wrong ?? null
            case 'acc': return accPct(s.id)
            case 'active': return s.active ? 'Sim' : 'Não'
            case 'created': return s.created_at?.toMillis?.() ?? null
            default: return s.updated_at?.toMillis?.() ?? null
          }
        },
      ),
    [lines, nameSel, turmaSel, sort, q, perf],
  )
  const pager = usePager(rows, 100)

  const single = g.scopedInstitutions.length === 1 ? g.scopedInstitutions[0] : null
  const ready =
    students.ready && links.ready && trails.ready && questions.ready && !g.institutionsLoading
  if (!ready) return <BootSymbol />

  function exportBase() {
    const header = [
      'Nome', 'ID Aluno', 'Turma', 'Trilha atual', 'Atividade', 'Etapa', 'Status', 'Telefone', 'Escolaridade',
      'Nível pedagógico', 'Criado em', 'Atualizado em', 'Atividades liberadas', 'Atividades feitas',
      '% de conclusão', 'Acertos', 'Erros', '% de acerto', 'Ativo',
    ]
    const fmtPct = (v: number | null) => (v == null ? 'N/A' : `${String(v).replace('.', ',')}%`)
    const body = rows.map((l) => {
      const m = perf.get(l.student.id)
      return [
        l.student.name || l.student.id,
        na(l.code),
        na((l.student.turma ?? '').trim() || null),
        l.trail,
        na(l.question),
        na(l.stage),
        l.status ? STATUS_LABEL[l.status] : 'N/A',
        na(l.student.phone_number),
        schooling(l.student) || 'N/A',
        na(PED[l.student.student_level]),
        fmtDate(l.student.created_at),
        fmtDate(l.student.updated_at),
        na(m?.lessonsReleased ?? null),
        na(m?.lessonsDone ?? null),
        fmtPct(lessonPct(l.student.id)),
        na(m?.correct ?? null),
        na(m?.wrong ?? null),
        fmtPct(accPct(l.student.id)),
        l.student.active ? 'Sim' : 'Não',
      ].map(String)
    })
    downloadText('base-alunos.csv', toCsv(header, body))
  }

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
              + Adicionar aluno
            </Link>
          ) : null
        }
      />
      {students.error ? (
        <Banner onRetry={students.retry}>Não foi possível carregar os dados. Tente atualizar a página.</Banner>
      ) : null}
      <BulkBlocks institution={single} students={students.rows} />
      <section className="gx-card gx-card--alunos" aria-label="Alunos" style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '24px 24px 20px' }}>
          {/* 1.3.12.a: pesquisa, "Filtrar por nome" e "Filtrar turma" ("Filtrar por ID" saiu: a pesquisa acha por ID). */}
          <div className="gx-filters" role="group" aria-label="Filtros" style={{ marginTop: 0 }}>
            <span className="gx-filters__label">Filtros</span>
            <label className="gx-filters__item gx-searchfield">
              <span className="visually-hidden">Pesquisar nome, telefone ou ID</span>
              <input
                className="gx-input"
                type="search"
                value={q}
                placeholder="Pesquisar nome, telefone"
                autoComplete="off"
                onChange={(e) => {
                  setQ(e.target.value)
                  pager.reset()
                }}
              />
            </label>
            <div className="gx-filters__item">
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
            <div className="gx-filters__item">
              <FilterPopover
                variant="field"
                align="left"
                label="Filtrar turma"
                options={turmaOptions}
                selected={turmaSel}
                onChange={(n) => {
                  setByTurma(n)
                  pager.reset()
                }}
              />
            </div>
          </div>
          {/* 1.3.11: "Exportar base" exporta sempre o filtrado (todas as páginas, todas as colunas, na ordem da tela). */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="gx-btn gx-btn--primary" onClick={exportBase} disabled={rows.length === 0}>
              <Icon name="download" />
              Exportar base
            </button>
          </div>
        </div>
        <ScrollX>
          <table className="gx-table gx-table--alunos">
            <thead>
              <tr>
                {head('Nome', 'name')}
                {head('ID Aluno', 'code', true)}
                {head('Turma', 'turma')}
                {head('Trilha atual', 'trail')}
                {head('Atividade', 'question', true)}
                {head('Etapa', 'stage', true)}
                {head('Status', 'status')}
                {head('Telefone', 'phone')}
                {head('Escolaridade', 'level')}
                {head('Nível pedagógico', 'ped')}
                {head('Criado em', 'created')}
                {head('Atualizado em', 'updated')}
                {head('Atividades liberadas', 'lr', true)}
                {head('Atividades feitas', 'ld', true)}
                {head('% de conclusão', 'lp', true)}
                {head('Acertos', 'ok', true)}
                {head('Erros', 'err', true)}
                {head('% de acerto', 'acc', true)}
                {head('Ativo', 'active')}
                <th data-col="open" aria-label="Abrir" />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((l) => (
                <tr key={l.student.id}>
                  <td data-col="name">
                    <strong data-fade="1">{l.student.name || l.student.id}</strong>
                  </td>
                  <td className="num" data-col="code">{na(l.code)}</td>
                  <td data-col="turma">
                    <span data-fade="1">{na((l.student.turma ?? '').trim() || null)}</span>
                  </td>
                  <td data-col="trail">
                    <span data-fade="1">{l.trail}</span>
                  </td>
                  <td className="num" data-col="question">{na(l.question)}</td>
                  <td className="num" data-col="stage">{na(l.stage)}</td>
                  <td data-col="status">
                    <span className={statusPillClass(l.status)}>{l.status ? STATUS_LABEL[l.status] : 'N/A'}</span>
                  </td>
                  <td data-col="phone">{na(l.student.phone_number)}</td>
                  <td data-col="level">
                    <span data-fade="1" title={schooling(l.student)}>
                      {schooling(l.student)}
                    </span>
                  </td>
                  <td data-col="ped">{na(PED[l.student.student_level])}</td>
                  <td data-col="created">{fmtDate(l.student.created_at)}</td>
                  <td data-col="updated">{fmtDate(l.student.updated_at)}</td>
                  <td className="num">{na(perf.get(l.student.id)?.lessonsReleased ?? null)}</td>
                  <td className="num">{na(perf.get(l.student.id)?.lessonsDone ?? null)}</td>
                  <td>
                    <PctCell value={lessonPct(l.student.id)} />
                  </td>
                  <td className="num">{na(perf.get(l.student.id)?.correct ?? null)}</td>
                  <td className="num">{na(perf.get(l.student.id)?.wrong ?? null)}</td>
                  <td>
                    <PctCell value={accPct(l.student.id)} ok />
                  </td>
                  <td data-col="active">
                    <span className={activePillClass(l.student.active)}>{l.student.active ? 'Sim' : 'Não'}</span>
                  </td>
                  <td data-col="open">
                    <Link to={`/alunos/${l.student.id}`} className="gx-btn gx-btn--sm gx-btn--open">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={20} className="gx-table__empty">
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
