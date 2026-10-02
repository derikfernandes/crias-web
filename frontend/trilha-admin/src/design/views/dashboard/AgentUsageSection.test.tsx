import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentProps } from 'react'
import { AgentUsageSection } from './AgentUsageSection'
import type { DashboardAgentUsageView } from '../../types/dashboardPageView'

const baseUsage: DashboardAgentUsageView = {
  totalMessages: 10,
  uniqueStudents: 3,
  coveragePct: 30,
  msgsPerTutorPerDay: 1.2,
  agents: [
    {
      trailId: 'Trilha - Matemática',
      trailIds: ['Trilha - Matemática', 'Tutor - Matemática'],
      label: 'Matemática',
      messages: 6,
      uniqueStudents: 2,
      pctOfTotal: 60,
      lastActivityLabel: '18/09/2026, 14:00',
      studentIds: ['s1', 's2'],
    },
    {
      trailId: 'Tutor - Linguagens',
      trailIds: ['Tutor - Linguagens'],
      label: 'Linguagens',
      messages: 4,
      uniqueStudents: 1,
      pctOfTotal: 40,
      lastActivityLabel: '18/09/2026, 15:00',
      studentIds: ['s3'],
    },
    {
      trailId: 'Trilha - Geral',
      trailIds: ['Trilha - Geral'],
      label: 'Geral',
      messages: 0,
      uniqueStudents: 0,
      pctOfTotal: 0,
      lastActivityLabel: '—',
      studentIds: [],
    },
  ],
  series: [
    {
      date: '2026-09-18',
      trailId: 'Trilha - Matemática',
      label: 'Matemática',
      messages: 3,
    },
  ],
}

const emptyUsage: DashboardAgentUsageView = {
  totalMessages: 0,
  uniqueStudents: 0,
  coveragePct: 0,
  msgsPerTutorPerDay: 0,
  agents: [],
  series: [],
}

function renderSection(
  props: Partial<ComponentProps<typeof AgentUsageSection>> = {},
) {
  const onPeriodDaysChange = vi.fn()
  const onSelectAgentTrailId = vi.fn()
  const view = render(
    <MemoryRouter>
      <AgentUsageSection
        agentUsage={baseUsage}
        periodDays={30}
        onPeriodDaysChange={onPeriodDaysChange}
        loading={false}
        selectedAgentTrailId={null}
        onSelectAgentTrailId={onSelectAgentTrailId}
        selectedAgentStudents={[]}
        {...props}
      />
    </MemoryRouter>,
  )
  return { ...view, onPeriodDaysChange, onSelectAgentTrailId }
}

describe('AgentUsageSection', () => {
  it('mostra empty state quando não há mensagens', () => {
    renderSection({ agentUsage: emptyUsage })
    expect(
      screen.getByText(/Nenhum uso de tutores no período/i),
    ).toBeInTheDocument()
  })

  it('mostra skeleton no loading sem dados (sem zeros)', () => {
    renderSection({ loading: true, agentUsage: emptyUsage })
    expect(screen.getByTestId('agent-usage-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('mantém consolidado no refetch e mostra badge Atualizando', () => {
    renderSection({ loading: true, agentUsage: baseUsage })
    expect(screen.getByRole('status')).toHaveTextContent(/atualizando/i)
    expect(screen.getByText('Alunos que conversaram')).toBeInTheDocument()
    expect(screen.getByText('Por matéria')).toBeInTheDocument()
  })

  it('distingue unavailable de empty real', () => {
    renderSection({
      agentUsage: emptyUsage,
      unavailable: true,
      onRetry: vi.fn(),
    })
    expect(screen.getByTestId('agent-usage-unavailable')).toBeInTheDocument()
    expect(screen.queryByTestId('agent-usage-empty')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument()
  })

  it('mostra empty pedagógico sem confundir com erro', () => {
    renderSection({ agentUsage: emptyUsage, unavailable: false })
    expect(screen.getByTestId('agent-usage-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('agent-usage-unavailable')).not.toBeInTheDocument()
  })

  it('renderiza consolidado e barras só com uso (>0)', () => {
    renderSection()
    expect(
      screen.getByRole('heading', { name: 'Conversas com os tutores' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Consolidado')).toBeInTheDocument()
    expect(screen.getByText('Mensagens por dia')).toBeInTheDocument()

    const mathButtons = screen.getAllByRole('button', { name: /Matemática/i })
    expect(mathButtons.length).toBe(1)
    expect(screen.queryByRole('button', { name: /^Geral/i })).not.toBeInTheDocument()
  })

  it('não duplica labels de disciplina', () => {
    renderSection()
    const labels = screen
      .getAllByRole('button')
      .map((el) => el.textContent ?? '')
      .filter((t) => /Matemática|Linguagens|Geral|Humanas|Natureza/.test(t))
    const subjects = labels.map((t) => {
      if (t.includes('Matemática')) return 'Matemática'
      if (t.includes('Linguagens')) return 'Linguagens'
      if (t.includes('Geral')) return 'Geral'
      if (t.includes('Humanas')) return 'Humanas'
      if (t.includes('Natureza')) return 'Natureza'
      return t
    })
    expect(new Set(subjects).size).toBe(subjects.length)
  })

  it('drill-down mostra msgs e última atividade por aluno', async () => {
    const user = userEvent.setup()
    const { onSelectAgentTrailId } = renderSection({
      selectedAgentTrailId: 'Trilha - Matemática',
      selectedAgentStudents: [
        {
          id: 's1',
          name: 'Ana',
          href: '/alunos/s1?agent_trail_id=Trilha+-+Matem%C3%A1tica&agent_trail_ids=Trilha+-+Matem%C3%A1tica%2CTutor+-+Matem%C3%A1tica',
          messages: 4,
          lastActivityLabel: '19/09/2026, 10:00',
        },
      ],
    })
    expect(screen.getByRole('heading', { name: 'Matemática' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ana' })).toHaveAttribute(
      'href',
      expect.stringContaining('agent_trail'),
    )
    expect(screen.getByText(/4 msgs/i)).toBeInTheDocument()
    expect(screen.getByText(/19\/09\/2026, 10:00/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onSelectAgentTrailId).toHaveBeenCalledWith(null)
  })
})
