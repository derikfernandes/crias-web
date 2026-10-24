import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPageView } from './DashboardPageView'
import type { DashboardPageViewProps } from '../types/dashboardPageView'

beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', RO)
})

const noop = vi.fn()

function baseProps(
  overrides: Partial<DashboardPageViewProps> = {},
): DashboardPageViewProps {
  return {
    institutionName: 'Instituto Sol',
    studentFilterOptions: [],
    studentFilterSelectedIds: [],
    onStudentFilterChange: noop,
    trailFilterOptions: [],
    trailFilterSelectedIds: [],
    onTrailFilterChange: noop,
    onExportExerciseHistory: noop,
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
    isDashboardRefreshing: false,
    loadLabel: '',
    loadPercent: 0,
    logsError: null,
    onRetryLogs: noop,
    summary: {
      activeStudents: 402,
      activeTrails: 2,
      avgCompletion: 10,
      avgLessonCompletion: 10,
      avgAccuracy: null,
      avgAccuracyLoading: true,
    },
    exercisesLoading: true,
    missingGabaritoCount: 0,
    annulledGabaritoCount: 0,
    annulledAnswersExcluded: 0,
    filteredStudentCount: 402,
    totalStudentCount: 402,
    questionPickerLabel: 'Atividades',
    showQuestionPicker: false,
    onToggleQuestionPicker: noop,
    questionPickerItems: [],
    questionPickerSelectedIds: [],
    onApplyQuestionPicker: noop,
    onCloseQuestionPicker: noop,
    stagePickerLabel: 'Etapas',
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
      totalMessages: 0,
      uniqueStudents: 0,
      coveragePct: 0,
      msgsPerTutorPerDay: 0,
      agents: [],
      series: [],
    },
    agentPeriodDays: 30,
    onAgentPeriodDaysChange: noop,
    agentUsageLoading: true,
    agentUsageUnavailable: false,
    selectedAgentTrailId: null,
    onSelectAgentTrailId: noop,
    selectedAgentStudents: [],
    ...overrides,
  }
}

describe('DashboardPageView acerto / monitor loading', () => {
  it('mostra Carregando… no Acerto médio (não N/A sem exercícios)', () => {
    render(
      <MemoryRouter>
        <DashboardPageView {...baseProps()} />
      </MemoryRouter>,
    )
    const acerto = screen.getByText('Acerto médio').parentElement
    expect(acerto?.textContent).toContain('Carregando…')
    expect(acerto?.textContent).not.toContain('sem exercícios')
    expect(acerto?.textContent).not.toMatch(/\bN\/A\b/)
  })

  it('mostra Carregando… em Menor/Maior acerto enquanto exercisesLoading', () => {
    render(
      <MemoryRouter>
        <DashboardPageView
          {...baseProps({
            exercisesLoading: true,
            worstPills: [],
            bestPills: [],
          })}
        />
      </MemoryRouter>,
    )
    const opp = screen.getByLabelText('Oportunidades')
    expect(opp.textContent).toContain('Carregando…')
    expect(opp.textContent).not.toMatch(/\bN\/A\b/)
  })

  it('mostra Carregando… nos KPIs do monitor (não vaza total da instituição anterior)', () => {
    render(
      <MemoryRouter>
        <DashboardPageView
          {...baseProps({
            summary: {
              activeStudents: 402,
              activeTrails: 2,
              avgCompletion: 10,
              avgLessonCompletion: 10,
              avgAccuracy: 68.8,
              avgAccuracyLoading: false,
            },
            agentUsageLoading: true,
            agentUsage: {
              totalMessages: 22,
              uniqueStudents: 1,
              coveragePct: 1,
              msgsPerTutorPerDay: 1,
              agents: [],
              series: [],
            },
          })}
        />
      </MemoryRouter>,
    )
    const monitor = screen.getByLabelText('Uso do monitor')
    expect(monitor.textContent).toContain('Carregando…')
    expect(monitor.textContent).not.toContain('22')
  })

  it('com avgAccuracyLoading false e null: N/A sem exercícios', () => {
    render(
      <MemoryRouter>
        <DashboardPageView
          {...baseProps({
            summary: {
              activeStudents: 0,
              activeTrails: 0,
              avgCompletion: null,
              avgLessonCompletion: null,
              avgAccuracy: null,
              avgAccuracyLoading: false,
            },
            agentUsageLoading: false,
            exercisesLoading: false,
          })}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('sem exercícios')).toBeTruthy()
  })
})
