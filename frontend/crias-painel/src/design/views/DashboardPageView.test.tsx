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

describe('DashboardPageView — colocação Tutores', () => {
  it('mostra Tutores de IA só na tab Alunos', async () => {
    const user = userEvent.setup()
    const onActiveTabChange = vi.fn()
    const { rerender } = render(
      <MemoryRouter>
        <DashboardPageView
          {...baseProps({ activeTab: 'students', onActiveTabChange })}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('agent-usage-section')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Tutores de IA' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Questões' }))
    expect(onActiveTabChange).toHaveBeenCalledWith('questions')

    rerender(
      <MemoryRouter>
        <DashboardPageView
          {...baseProps({ activeTab: 'questions', onActiveTabChange })}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('agent-usage-section')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Tutores de IA' }),
    ).not.toBeInTheDocument()
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
