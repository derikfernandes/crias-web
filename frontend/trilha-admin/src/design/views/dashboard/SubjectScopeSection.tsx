import type {
  DashboardPickerItem,
  DashboardSubjectTabView,
} from '../../types/dashboardPageView'
import { formatPct } from './formatPct'

export type SubjectScopeSectionProps = {
  subjectTabs: DashboardSubjectTabView[]
  selectedSubject: string | null
  onSelectSubject: (subject: string | null) => void
  gradeOptions: DashboardPickerItem[]
  selectedGrade: string | null
  onSelectGrade: (grade: string | null) => void
  trailOptions: DashboardPickerItem[]
  selectedTrailId: string | null
  onSelectTrailId: (trailId: string | null) => void
  scopeSummary: {
    studentCount: number
    trailCount: number
    accuracyPct: number | null
    scopeLabel: string
  }
}

export function SubjectScopeSection({
  subjectTabs,
  selectedSubject,
  onSelectSubject,
  gradeOptions,
  selectedGrade,
  onSelectGrade,
  trailOptions,
  selectedTrailId,
  onSelectTrailId,
  scopeSummary,
}: SubjectScopeSectionProps) {
  if (subjectTabs.length === 0) return null

  return (
    <section className="crias-subject" aria-label="Por matéria">
      <div className="crias-subject__head">
        <div>
          <div className="crias-label">Por matéria</div>
          <h2
            className="crias-section-title"
            style={{ borderBottom: 0, paddingBottom: 0 }}
          >
            Escolha a matéria
          </h2>
        </div>
        <div
          className="crias-subject__tabs"
          role="tablist"
          aria-label="Matéria"
        >
          {subjectTabs.map((tab) => {
            const on = tab.id === selectedSubject
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={
                  on
                    ? 'crias-subject__tab crias-subject__tab--on'
                    : 'crias-subject__tab'
                }
                onClick={() => onSelectSubject(tab.id)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="crias-subject__filters">
        {gradeOptions.length > 0 ? (
          <label>
            <span>Série</span>
            <select
              value={selectedGrade ?? ''}
              onChange={(e) => {
                const next = e.target.value.trim()
                onSelectGrade(next || null)
              }}
            >
              <option value="">Todas</option>
              {gradeOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>Trilha</span>
          <select
            value={selectedTrailId ?? ''}
            onChange={(e) => {
              const next = e.target.value.trim()
              onSelectTrailId(next || null)
            }}
          >
            {trailOptions.length === 0 ? (
              <option value="">Nenhuma trilha</option>
            ) : (
              trailOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <div className="crias-subject__totals">
        <div>
          <strong>{scopeSummary.studentCount.toLocaleString('pt-BR')}</strong>{' '}
          <span>alunos</span>
        </div>
        <div>
          <strong>{scopeSummary.trailCount}</strong>{' '}
          <span>
            {scopeSummary.trailCount === 1 ? 'trilha' : 'trilhas'}
          </span>
        </div>
        <div>
          <strong>{formatPct(scopeSummary.accuracyPct, 0)}</strong>{' '}
          <span>acerto médio</span>
        </div>
        <span className="crias-subject__scope">{scopeSummary.scopeLabel}</span>
      </div>
    </section>
  )
}
