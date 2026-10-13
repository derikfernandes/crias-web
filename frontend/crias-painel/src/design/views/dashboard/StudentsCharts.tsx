import type {
  DashboardStudentChartFilter,
  DashboardStudentsChartBucket,
  DashboardStudentsLessonBar,
  DashboardStudentsStatus,
} from '../../types/dashboardPageView'

type StudentsChartsProps = {
  studentCount: number
  completionBuckets: DashboardStudentsChartBucket[]
  statuses: DashboardStudentsStatus[]
  lessonBars: DashboardStudentsLessonBar[]
  selectedFilter: DashboardStudentChartFilter | null
  onFilterChange: (filter: DashboardStudentChartFilter | null) => void
}

const STATUS_COLORS: Record<DashboardStudentsStatus['key'], string> = {
  notStarted: '#dc2626',
  inProgress: '#f59e0b',
  completed: '#16a34a',
}

export function StudentsCharts({
  studentCount,
  completionBuckets,
  statuses,
  lessonBars,
  selectedFilter,
  onFilterChange,
}: StudentsChartsProps) {
  const bucketMax = Math.max(1, ...completionBuckets.map((item) => item.count))
  const lessonMax = Math.max(1, ...lessonBars.map((item) => item.count))
  const selectedLessonKeys =
    selectedFilter?.kind === 'lessons' ? new Set(selectedFilter.keys) : null

  const statusSegments = statuses
    .filter((status) => status.count > 0)
    .reduce<{ cursor: number; segments: string[] }>(
      (acc, status) => {
        const start = acc.cursor
        const end =
          studentCount > 0
            ? acc.cursor + (status.count / studentCount) * 100
            : acc.cursor
        return {
          cursor: end,
          segments: [
            ...acc.segments,
            `${STATUS_COLORS[status.key]} ${start}% ${end}%`,
          ],
        }
      },
      { cursor: 0, segments: [] },
    ).segments
  const statusBackground =
    statusSegments.length > 0
      ? `conic-gradient(${statusSegments.join(', ')})`
      : 'var(--border)'

  const toggleFilter = (filter: DashboardStudentChartFilter) => {
    if (filter.kind === 'lessons') return
    const alreadySelected =
      selectedFilter?.kind === filter.kind &&
      'key' in selectedFilter &&
      selectedFilter.key === filter.key
    onFilterChange(alreadySelected ? null : filter)
  }

  const toggleLesson = (lesson: DashboardStudentsLessonBar) => {
    if (selectedFilter?.kind === 'lessons') {
      const exists = selectedFilter.keys.includes(lesson.key)
      const keys = exists
        ? selectedFilter.keys.filter((key) => key !== lesson.key)
        : [...selectedFilter.keys, lesson.key]
      const nextLabels = keys.map((key) => {
        if (key === lesson.key) return lesson.label
        const idx = selectedFilter.keys.indexOf(key)
        return idx >= 0 ? selectedFilter.labels[idx]! : key
      })

      onFilterChange(
        keys.length > 0
          ? { kind: 'lessons', keys, labels: nextLabels }
          : null,
      )
      return
    }

    onFilterChange({
      kind: 'lessons',
      keys: [lesson.key],
      labels: [lesson.label],
    })
  }

  const activeFilterLabel =
    selectedFilter == null
      ? null
      : selectedFilter.kind === 'lessons'
        ? selectedFilter.labels.join(', ')
        : selectedFilter.label

  return (
    <section className="dashboard-student-charts" aria-label="Gráficos dos alunos">
      <div className="dashboard-student-charts__grid">
        <article className="dashboard-q-charts__card">
          <h3>Distribuição da conclusão</h3>
          <p className="muted dashboard-q-charts__hint">
            Quantos alunos estão em cada faixa de progresso.
          </p>
          <ul className="dashboard-q-charts__bars">
            {completionBuckets.map((bucket) => (
              <li key={bucket.key}>
                <button
                  type="button"
                  className={`dashboard-student-charts__filter-button${
                    selectedFilter?.kind === 'completion' &&
                    selectedFilter.key === bucket.key
                      ? ' dashboard-student-charts__filter-button--selected'
                      : ''
                  }`}
                  aria-pressed={
                    selectedFilter?.kind === 'completion' &&
                    selectedFilter.key === bucket.key
                  }
                  onClick={() =>
                    toggleFilter({
                      kind: 'completion',
                      key: bucket.key,
                      label: bucket.label,
                    })
                  }
                >
                  <span className="dashboard-q-charts__bar-label">
                    {bucket.label}
                  </span>
                  <span
                    className="dashboard-q-charts__bar-track"
                    aria-label={`${bucket.label}: ${bucket.count} alunos`}
                  >
                    <span
                      className="dashboard-q-charts__bar-fill dashboard-q-charts__bar-fill--accent"
                      style={{ width: `${(bucket.count / bucketMax) * 100}%` }}
                    />
                  </span>
                  <span className="dashboard-q-charts__bar-value">
                    {bucket.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="dashboard-q-charts__card">
          <h3>Status de engajamento</h3>
          <p className="muted dashboard-q-charts__hint">
            Situação dos alunos conforme o progresso filtrado.
          </p>
          <div
            className="dashboard-q-charts__donut"
            style={{ background: statusBackground }}
            role="img"
            aria-label={statuses
              .map((status) => `${status.label}: ${status.count}`)
              .join(', ')}
          >
            <div className="dashboard-q-charts__donut-hole">
              <strong>{studentCount}</strong>
              <span className="muted">
                {studentCount === 1 ? 'aluno' : 'alunos'}
              </span>
            </div>
          </div>
          <div className="dashboard-student-charts__legend">
            {statuses.map((status) => (
              <button
                key={status.key}
                type="button"
                className={`dashboard-student-charts__status-button${
                  selectedFilter?.kind === 'status' &&
                  selectedFilter.key === status.key
                    ? ' dashboard-student-charts__status-button--selected'
                    : ''
                }`}
                aria-pressed={
                  selectedFilter?.kind === 'status' &&
                  selectedFilter.key === status.key
                }
                onClick={() =>
                  toggleFilter({
                    kind: 'status',
                    key: status.key,
                    label: status.label,
                  })
                }
              >
                <i
                  className="dashboard-student-charts__swatch"
                  style={{ background: STATUS_COLORS[status.key] }}
                />
                {status.label} <strong>{status.count}</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="dashboard-q-charts__card dashboard-q-charts__card--wide">
          <h3>Alunos por aula concluída</h3>
          <p className="muted dashboard-q-charts__hint">
            Clique nas barras para filtrar. Dá para selecionar várias aulas ao
            mesmo tempo.
          </p>
          {lessonBars.length === 0 ? (
            <p className="muted">Nenhuma aula nas trilhas filtradas.</p>
          ) : (
            <div
              className="dashboard-lesson-vbars"
              role="group"
              aria-label="Alunos que concluíram cada aula"
            >
              {lessonBars.map((lesson) => {
                const selected = selectedLessonKeys?.has(lesson.key) ?? false
                const heightPct =
                  lessonMax > 0 ? (lesson.count / lessonMax) * 100 : 0
                return (
                  <button
                    key={lesson.key}
                    type="button"
                    className={`dashboard-lesson-vbar${
                      selected ? ' dashboard-lesson-vbar--selected' : ''
                    }`}
                    aria-pressed={selected}
                    title={`${lesson.label}: ${lesson.count} de ${lesson.enrolledCount} alunos`}
                    onClick={() => toggleLesson(lesson)}
                  >
                    <span className="dashboard-lesson-vbar__value">
                      {lesson.count}
                    </span>
                    <span className="dashboard-lesson-vbar__column" aria-hidden="true">
                      <span
                        className="dashboard-lesson-vbar__fill"
                        style={{ height: `${Math.max(heightPct, lesson.count > 0 ? 4 : 0)}%` }}
                      />
                    </span>
                    <span className="dashboard-lesson-vbar__label">
                      {lesson.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </article>
      </div>
      {selectedFilter && activeFilterLabel ? (
        <div className="dashboard-student-charts__active-filter" role="status">
          <span>
            Alunos exibidos abaixo: <strong>{activeFilterLabel}</strong>
            {selectedFilter.kind === 'lessons' ? (
              <span className="muted"> (concluíram ao menos uma)</span>
            ) : null}
          </span>
          <button type="button" onClick={() => onFilterChange(null)}>
            Limpar seleção
          </button>
        </div>
      ) : (
        <p className="muted dashboard-student-charts__select-hint">
          Selecione uma faixa, um status ou uma ou mais aulas para filtrar os
          alunos abaixo.
        </p>
      )}
    </section>
  )
}
