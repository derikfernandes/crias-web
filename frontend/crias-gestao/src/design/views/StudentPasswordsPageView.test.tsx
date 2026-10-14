import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StudentPasswordsPageView } from './StudentPasswordsPageView'

const baseProps = {
  isMaster: true,
  institutionOptions: [{ id: 'inst1', label: 'Escola Teste' }],
  selectedInstitutionId: 'inst1',
  onSelectInstitution: vi.fn(),
  rows: Array.from({ length: 3 }, (_, i) => ({
    id: `s${i + 1}`,
    name: `Aluno ${i + 1}`,
    phone_number: `1199999999${i}`,
    password: i === 0 ? null : 'ab2cde',
    has_password_hash: i !== 0,
    has_password_encrypted: i !== 0,
  })),
  loading: false,
  error: null,
  busy: false,
  onExportCsv: vi.fn(),
  onBulkGenerateMissing: vi.fn(),
  bulkResultMessage: null as string | null,
  onRegenerate: vi.fn(),
  page: 1,
  totalPages: 3,
  totalRows: 120,
  pageStart: 1,
  pageEnd: 50,
  onPageChange: vi.fn(),
  importCsvText: '',
  onImportCsvTextChange: vi.fn(),
  onImportFile: vi.fn(),
  onSubmitImport: vi.fn(),
  importResultMessage: null,
  importErrors: [] as Array<{ line: number; error: string }>,
  onDownloadGeneratedCsv: null,
}

describe('StudentPasswordsPageView', () => {
  it('mostra botão de geração em lote e páginas clicáveis 1, 2, 3', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    const onBulk = vi.fn()
    render(
      <StudentPasswordsPageView
        {...baseProps}
        onPageChange={onPageChange}
        onBulkGenerateMissing={onBulk}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Gerar senhas para alunos sem senha',
      }),
    ).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: 'Página 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 3' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    await user.click(
      screen.getByRole('button', {
        name: 'Gerar senhas para alunos sem senha',
      }),
    )
    expect(onBulk).toHaveBeenCalled()
  })

  it('após geração mostra resultado e atalho de Exportar CSV', () => {
    render(
      <StudentPasswordsPageView
        {...baseProps}
        bulkResultMessage="42 senhas geradas. Você pode exportar o CSV da escola inteira."
      />,
    )
    expect(
      screen.getByText(/42 senhas geradas/i),
    ).toBeInTheDocument()
    // Botão do toolbar + botão no banner de sucesso
    expect(
      screen.getAllByRole('button', { name: 'Exportar CSV' }).length,
    ).toBeGreaterThanOrEqual(2)
  })
})
