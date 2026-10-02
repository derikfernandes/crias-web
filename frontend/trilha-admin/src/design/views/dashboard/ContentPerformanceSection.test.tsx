import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContentPerformanceSection } from './ContentPerformanceSection'
import type {
  DashboardContentBarView,
  DashboardContentSummaryView,
} from '../../types/dashboardPageView'

const bars: DashboardContentBarView[] = [
  {
    key: 't|86',
    num: '86',
    title: 'Nova aula',
    completionPct: 48,
    accuracyPct: 42,
    completedCount: 10,
    enrolledCount: 20,
    released: true,
    exercises: [
      {
        key: 'e1',
        label: 'Exercício 1',
        prompt: 'Qual a raiz de 16?',
        accuracyPct: 20,
        note: 'acertaram',
      },
      {
        key: 'e2',
        label: 'Exercício 2',
        prompt: 'Quanto é 2+2?',
        accuracyPct: 90,
        note: 'acertaram',
      },
    ],
  },
]

const summary: DashboardContentSummaryView = {
  progressAvg: 48,
  accuracyAvg: 42,
  lowest: {
    label: 'Qual a raiz de 16?',
    pct: 20,
    note: 'Conteúdo 86 · Ex. 1',
    contentKey: 't|86',
  },
  highest: {
    label: 'Quanto é 2+2?',
    pct: 90,
    note: 'Conteúdo 86 · Ex. 2',
    contentKey: 't|86',
  },
  releasedCount: 1,
  totalCount: 90,
  below60Count: 1,
}

describe('ContentPerformanceSection', () => {
  it('mostra exercícios distintos de menor e maior acerto', () => {
    render(
      <ContentPerformanceSection
        summary={summary}
        bars={bars}
        selectedKey={null}
        onSelectKey={vi.fn()}
      />,
    )

    expect(screen.getByText('Exercício com menor acerto')).toBeInTheDocument()
    expect(screen.getByText('Exercício com maior acerto')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('Qual a raiz de 16?')).toBeInTheDocument()
    expect(screen.getByText('Quanto é 2+2?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conteúdo 86 · Ex. 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conteúdo 86 · Ex. 2' })).toBeInTheDocument()
  })

  it('clique na nota abre o conteúdo', async () => {
    const user = userEvent.setup()
    const onSelectKey = vi.fn()
    render(
      <ContentPerformanceSection
        summary={summary}
        bars={bars}
        selectedKey={null}
        onSelectKey={onSelectKey}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Conteúdo 86 · Ex. 1' }))
    expect(onSelectKey).toHaveBeenCalledWith('t|86')
  })
})
