import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TrilhaHistoryPageView } from './TrilhaHistoryPageView'

describe('TrilhaHistoryPageView markdown', () => {
  it('renderiza negrito em título, corpo e resposta sem asteriscos literais', () => {
    const { container } = render(
      <TrilhaHistoryPageView
        loadState="ready"
        onBack={() => undefined}
        items={[
          {
            stageNumber: 1,
            questionNumber: 76,
            stageType: 'fixed',
            title: '**Contextualização**',
            body: 'Vamos falar de **formas geométricas** e o que já vimos.',
            studentAnswer: '**A**',
            isCorrect: true,
          },
        ]}
      />,
    )

    expect(screen.getByText('Contextualização').tagName).toBe('STRONG')
    expect(screen.getByText('formas geométricas').tagName).toBe('STRONG')
    expect(screen.getByText('A').tagName).toBe('STRONG')
    expect(container.textContent).not.toMatch(/\*\*/)
  })
})
