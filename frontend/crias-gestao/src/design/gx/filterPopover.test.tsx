import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FilterPopover } from './ui'

function renderFilter(
  props: Partial<React.ComponentProps<typeof FilterPopover>> & {
    selected: Set<string>
    onChange: (next: Set<string>) => void
  },
) {
  return render(
    <MemoryRouter>
      <FilterPopover
        label="Filtrar instituições"
        options={[
          { id: 'i1', name: 'Crias' },
          { id: 'i2', name: 'Instituto Sol' },
          { id: 'i4', name: 'Teste' },
        ]}
        exclusiveOnLabel
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('FilterPopover exclusiveOnLabel', () => {
  it('toque no nome seleciona só essa instituição e fecha', () => {
    const onChange = vi.fn()
    renderFilter({ selected: new Set(['i1']), onChange })
    fireEvent.click(screen.getByRole('button', { name: /Filtrar instituições/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Instituto Sol' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as Set<string>
    expect([...next]).toEqual(['i2'])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('checkbox mantém multi-select e o menu aberto', () => {
    const onChange = vi.fn()
    renderFilter({ selected: new Set(['i1']), onChange, minSelected: 1 })
    fireEvent.click(screen.getByRole('button', { name: /Filtrar instituições/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Marcar Instituto Sol' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as Set<string>
    expect(next.has('i1')).toBe(true)
    expect(next.has('i2')).toBe(true)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('checkbox não desmarca o último quando minSelected=1', () => {
    const onChange = vi.fn()
    renderFilter({ selected: new Set(['i1']), onChange, minSelected: 1 })
    fireEvent.click(screen.getByRole('button', { name: /Filtrar instituições/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Desmarcar Crias' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('checkbox fica marcado na hora (UI otimista, sem esperar o pai)', () => {
    // Pai não re-renderiza `selected` — simula Dashboard lento.
    const onChange = vi.fn()
    renderFilter({ selected: new Set(['i1']), onChange, minSelected: 1 })
    fireEvent.click(screen.getByRole('button', { name: /Filtrar instituições/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Marcar Instituto Sol' }))
    expect(
      screen.getByRole('button', { name: 'Desmarcar Instituto Sol' }),
    ).toBeTruthy()
    expect(screen.getByText('2 de 3')).toBeTruthy()
  })

  it('com todas marcadas o contador mostra Todas (não N de N)', () => {
    renderFilter({
      selected: new Set(['i1', 'i2', 'i4']),
      onChange: vi.fn(),
      minSelected: 1,
    })
    expect(screen.getByText('Todas')).toBeTruthy()
  })

  it('toque fora (scrim) fecha o menu', () => {
    renderFilter({ selected: new Set(['i1']), onChange: vi.fn() })
    fireEvent.click(screen.getByRole('button', { name: /Filtrar instituições/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(document.querySelector('.gx-scrim') as Element)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
