import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPageView } from './DashboardPageView'
import type { DashboardPageViewProps } from '../types/dashboardPageView'

const noop = () => {}

function baseProps(
  overrides: Partial<DashboardPageViewProps> = {},
): DashboardPageViewProps {
  return {
    loadingInst: false,
    institutionOptions: [{ id: 'i2', label: 'Instituto Sol' }],
    selectedId: 'i2',
    onSelectInstitution: noop,
    activeTab: 'students',
    onActiveTabChange: noop,
    isQuestionsTabLoading: false,
    instError: null,
    dataError: null,
    exportError: null,
    isDashboardLoading: false,
    loadLabel: '',
    loadPercent: 0,
    logsError: null,
    onRetryLogs: noop,
    summary: {
      activeStudents: 10,
      activeTrails: 1,
      avgCompletion: 50,
      avgLessonCompletion: 40,
      avgAccuracy: 70,
    },
    missingGabaritoCount: 0,
    annulledGabaritoCount: 0,
    annulledAnswersExcluded: 0,
    filteredStudentCount: 0,
    totalStudentCount: 10,
    questionPickerLabel: '',
    showQuestionPicker: false,
    onToggleQuestionPicker: noop,
    questionPickerItems: [],
    questionPickerSelectedIds: [],
    onApplyQuestionPicker: noop,
    onCloseQuestionPicker: noop,
    stagePickerLabel: '',
    showStagePicker: false,
    onToggleStagePicker: noop,
    stagePickerItems: [],
    stagePickerSelectedIds: [],
    onApplyStagePicker: noop,
    onCloseStagePicker: noop,
    showColumnPicker: false,
    onToggleColumnPicker: noop,
    columnPickerItems: [],
    columnPickerSelectedIds: [],
    onApplyColumnPicker: noop,
    onCloseColumnPicker: noop,
    studentExportTrails: [],
    exportingTrailId: null,
    onExportTrailHistory: noop,
    hasActiveStudentExportFilters: false,
    nameFilter: '',
    onNameFilterChange: noop,
    pctMin: 0,
    pctMax: 100,
    onPctMinChange: noop,
    onPctMaxChange: noop,
    nameSortIndicator: '',
    onToggleStudentSort: noop,
    visibleColumns: [],
    studentRowsEmpty: true,
    paginatedStudentRows: [],
    showStudentPagination: false,
    studentPageRange: { start: 0, end: 0 },
    sortedFilteredStudentCount: 0,
    studentPage: 1,
    studentPageCount: 1,
    onStudentPagePrev: noop,
    onStudentPageNext: noop,
    studentsCharts: {
      studentCount: 0,
      completionBuckets: [],
      statuses: [],
      lessonBars: [],
    },
    studentChartFilter: null,
    onStudentChartFilterChange: noop,
    sortedPillCount: 0,
    totalPillCount: 0,
    pillExportTrails: [],
    exportingPillTrailId: null,
    onExportPillTrail: noop,
    pillSearch: '',
    onPillSearchChange: noop,
    pillTrailFilter: '',
    onPillTrailFilterChange: noop,
    pillTrailOptions: [],
    pillMinResponses: 1,
    onPillMinResponsesChange: noop,
    pillAccMin: 0,
    pillAccMax: 100,
    onPillAccMinChange: noop,
    onPillAccMaxChange: noop,
    questionsCharts: {
      studentCount: 0,
      questionCount: 0,
      responseCount: 0,
      avgAccuracy: null,
      correctTotal: 0,
      wrongTotal: 0,
      accuracyBuckets: [],
      trailBars: [],
    },
    worstPills: [],
    bestPills: [],
    onTogglePillSort: noop,
    pillSortIndicator: () => '',
    paginatedPillRows: [],
    showPillPagination: false,
    pillPageRange: { start: 0, end: 0 },
    pillPage: 1,
    pillPageCount: 1,
    onPillPagePrev: noop,
    onPillPageNext: noop,
    agentUsage: {
      totalMessages: 10,
      uniqueStudents: 2,
      coveragePct: 20,
      msgsPerTutorPerDay: 1,
      agents: [
        {
          trailId: 'Trilha - Matemática',
          trailIds: ['Trilha - Matemática'],
          label: 'Matemática',
          messages: 10,
          uniqueStudents: 2,
          pctOfTotal: 100,
          lastActivityLabel: '—',
          studentIds: ['s1'],
        },
      ],
      series: [],
    },
    agentPeriodDays: 30,
    onAgentPeriodDaysChange: noop,
    agentUsageLoading: false,
    agentUsageUnavailable: false,
    selectedAgentTrailId: null,
    onSelectAgentTrailId: noop,
    selectedAgentStudents: [],
    ...overrides,
  }
}

describe('DashboardPageView — accordion de KPIs', () => {
  it('começa só com os 4 indicadores + empty state (sem detalhes)', () => {
    render(
      <MemoryRouter>
        <DashboardPageView {...baseProps()} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Visão geral' }),
    ).toBeInTheDocument()
    const kpiButtons = screen.getAllByRole('button').filter((el) =>
      el.classList.contains('crias-kpi'),
    )
    expect(kpiButtons).toHaveLength(4)
    expect(kpiButtons[0]).toHaveTextContent(/Alunos ativos/i)
    expect(kpiButtons[1]).toHaveTextContent(/Progresso médio/i)
    expect(kpiButtons[2]).toHaveTextContent(/Acerto médio/i)
    expect(kpiButtons[3]).toHaveTextContent(/Interações com tutores/i)
    expect(
      screen.getByRole('heading', {
        name: /Clique em um indicador para ver os detalhes/i,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('agent-usage-section')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('tab', { name: 'Alunos' }),
    ).not.toBeInTheDocument()
  })

  it('ao clicar em Interações com tutores, abre Conversas com os tutores', async () => {
    const user = userEvent.setup()
    const onRequestKpiDetail = vi.fn()
    render(
      <MemoryRouter>
        <DashboardPageView
          {...baseProps({ onRequestKpiDetail })}
        />
      </MemoryRouter>,
    )

    const tutorsBtn = screen
      .getAllByRole('button')
      .find((el) => el.classList.contains('crias-kpi') && /Interações com tutores/i.test(el.textContent ?? ''))
    expect(tutorsBtn).toBeTruthy()
    await user.click(tutorsBtn!)

    expect(onRequestKpiDetail).toHaveBeenCalled()
    expect(screen.getByTestId('agent-usage-section')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Conversas com os tutores' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: /Clique em um indicador para ver os detalhes/i,
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Alunos' })).toBeInTheDocument()
  })

  it('segundo clique no mesmo KPI oculta o detalhe e volta ao empty', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DashboardPageView {...baseProps()} />
      </MemoryRouter>,
    )

    const tutorsBtn = () =>
      screen
        .getAllByRole('button')
        .find(
          (el) =>
            el.classList.contains('crias-kpi') &&
            /Interações com tutores/i.test(el.textContent ?? ''),
        )!

    await user.click(tutorsBtn())
    expect(screen.getByTestId('agent-usage-section')).toBeInTheDocument()

    await user.click(tutorsBtn())
    expect(screen.queryByTestId('agent-usage-section')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /Clique em um indicador para ver os detalhes/i,
      }),
    ).toBeInTheDocument()
  })

  it('exibe banner de erro + retry acessível (não fica no gate)', () => {
    const onRetryLogs = vi.fn()
    render(
      <MemoryRouter>
        <DashboardPageView
          {...baseProps({
            logsError: 'timeout',
            onRetryLogs,
            isDashboardLoading: false,
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('dashboard-logs-error')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('agent-usage-section')).not.toBeInTheDocument()
  })
})
