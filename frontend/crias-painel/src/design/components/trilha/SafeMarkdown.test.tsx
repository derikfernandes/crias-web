import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SafeMarkdown } from './SafeMarkdown'

describe('SafeMarkdown', () => {
  it('renderiza negrito estilo WA e GitHub sem HTML cru', () => {
    render(
      <SafeMarkdown text="Veja *formas geométricas* e **destaque**." />,
    )
    expect(screen.getByText('formas geométricas').tagName).toBe('STRONG')
    expect(screen.getByText('destaque').tagName).toBe('STRONG')
    expect(document.body.innerHTML).not.toMatch(/<script/i)
  })

  it('renderiza _itálico_ estilo WA', () => {
    render(<SafeMarkdown text="Palavra _enfatizada_ aqui." />)
    expect(screen.getByText('enfatizada').tagName).toBe('EM')
  })

  it('não interpreta tags HTML como markup', () => {
    render(<SafeMarkdown text={'<img src=x onerror=alert(1)> **ok**'} />)
    expect(screen.getByText(/img src/i)).toBeInTheDocument()
    expect(screen.getByText('ok').tagName).toBe('STRONG')
    expect(document.querySelector('img')).toBeNull()
  })

  it('modo inline não envolve em <p>', () => {
    const { container } = render(
      <SafeMarkdown text="**formas geométricas**" inline />,
    )
    expect(screen.getByText('formas geométricas').tagName).toBe('STRONG')
    expect(container.querySelector('p')).toBeNull()
  })
})
