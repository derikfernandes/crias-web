import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StudentShellView } from '../layouts/StudentShellView'
import { TrilhaHomePageView } from './TrilhaHomePageView'
import { TrilhaLoginPageView } from './TrilhaLoginPageView'
import { TrilhaPlayerPageView } from './TrilhaPlayerPageView'

const noop = () => {}

const sampleTrail = {
  trailId: 't1',
  title: 'Trilha Crias',
  institutionName: 'Escola Demo',
  subject: 'Cidadania',
  status: 'in_progress' as const,
  nextAction: 'deliver_content' as const,
  stageNumber: 2,
  questionNumber: 1,
  progressRatio: 0.4,
  totalStages: 4,
  totalQuestions: 4,
  stagesCompleted: 1,
}

describe('Trilha a11y — login / home / player', () => {
  it('login: telefone rotulado, erro em alert, aria-invalid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())

    const { rerender } = render(
      <TrilhaLoginPageView
        phone="12"
        submitting={false}
        formError={null}
        onPhoneChange={noop}
        onSubmit={onSubmit}
      />,
    )

    const phone = screen.getByLabelText(/telefone/i)
    expect(phone).toHaveAttribute('type', 'tel')
    expect(phone).not.toHaveAttribute('aria-invalid')

    rerender(
      <TrilhaLoginPageView
        phone="12"
        submitting={false}
        formError="Não encontrámos este número."
        onPhoneChange={noop}
        onSubmit={onSubmit}
      />,
    )

    expect(phone).toHaveAttribute('aria-invalid', 'true')
    expect(phone).toHaveAttribute('aria-describedby', 'trilha-login-error')
    expect(screen.getByRole('alert')).toHaveTextContent(/não encontrámos/i)

    await user.click(screen.getByRole('button', { name: /entrar/i }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('home: landmarks, CTA Continuar, link WhatsApp anuncia nova janela', () => {
    render(
      <MemoryRouter initialEntries={['/trilha']}>
        <StudentShellView studentName="Ana" onLogout={noop}>
          <TrilhaHomePageView
            studentName="Ana"
            trails={[sampleTrail]}
            totals={{ trails: 1, inProgress: 1, completed: 0, stagesCompleted: 1 }}
            whatsappHelpHref="https://wa.me/5512974085258"
            loadState="ready"
            onContinue={noop}
            onOpenHistory={noop}
          />
        </StudentShellView>
      </MemoryRouter>,
    )

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /navegação do aluno/i }),
    ).toBeInTheDocument()
    const trailLinks = screen.getAllByRole('link', {
      name: /trilhas|minhas trilhas/i,
    })
    expect(
      trailLinks.some((el) => el.getAttribute('aria-current') === 'page'),
    ).toBe(true)
    expect(screen.getByRole('link', { name: /revisão/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /minhas trilhas/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /resumo do aluno/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /minhas trilhas/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /trilha crias/i })).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: /tirar dúvida no whatsapp \(abre numa nova janela\)/i,
      }),
    ).toHaveAttribute('target', '_blank')
    const continueBtns = screen.getAllByRole('button', { name: /^continuar$/i })
    expect(continueBtns.length).toBeGreaterThanOrEqual(1)
    expect(continueBtns[0]).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /abrir revisão/i }),
    ).toBeInTheDocument()
  })

  it('home await_release: sem CTA Continuar mentiroso', () => {
    render(
      <TrilhaHomePageView
        studentName="Ana"
        trails={[
          {
            ...sampleTrail,
            nextAction: 'await_release',
            status: 'in_progress',
          },
        ]}
        totals={{ trails: 1, inProgress: 1, completed: 0, stagesCompleted: 1 }}
        loadState="ready"
        onContinue={noop}
        onOpenHistory={noop}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /^continuar$/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/pausa esperada/i)).toBeInTheDocument()
  })

  it('home loading: anuncia estado busy com texto para leitores de ecrã', () => {
    render(
      <TrilhaHomePageView
        studentName="Ana"
        trails={[]}
        totals={{ trails: 0, inProgress: 0, completed: 0, stagesCompleted: 0 }}
        loadState="loading"
        onContinue={noop}
      />,
    )

    expect(screen.getByText(/a carregar as suas trilhas/i)).toBeInTheDocument()
    expect(
      screen.getByText(/a carregar as suas trilhas/i).parentElement,
    ).toHaveAttribute('aria-busy', 'true')
  })

  it('home empty: empty state sem cards', () => {
    render(
      <TrilhaHomePageView
        studentName="Ana"
        trails={[]}
        totals={{ trails: 0, inProgress: 0, completed: 0, stagesCompleted: 0 }}
        loadState="empty"
        onContinue={noop}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /minhas trilhas/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/nenhuma trilha vinculada/i)).toBeInTheDocument()
  })

  it('player: h1, alerta de erro, formulário de exercício com fieldset', async () => {
    const user = userEvent.setup()
    const onSubmitAnswer = vi.fn()

    render(
      <TrilhaPlayerPageView
        stageNumber={3}
        questionNumber={2}
        stageType="exercise"
        title="Questão de leitura"
        body="Qual a resposta?"
        options={[
          { key: 'A', label: 'A) Opção A' },
          { key: 'B', label: 'B) Opção B' },
        ]}
        nextAction="await_answer"
        submitting={false}
        answerValue=""
        loadState="ready"
        chatMessages={[]}
        onAnswerChange={noop}
        onContinue={noop}
        onSubmitAnswer={onSubmitAnswer}
        onBack={noop}
      />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: /questão de leitura/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /voltar ao mapa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /responder/i })).toBeInTheDocument()

    const group = screen.getByRole('group', { name: /escolha uma opção/i })
    expect(within(group).getByLabelText(/opção a/i)).toBeInTheDocument()
    expect(within(group).getByLabelText(/opção b/i)).toBeInTheDocument()

    await user.click(within(group).getByLabelText(/opção a/i))
  })

  it('player: conflito usa role=status; loading anuncia', () => {
    const { rerender } = render(
      <TrilhaPlayerPageView
        stageNumber={1}
        questionNumber={1}
        stageType="fixed"
        body="Texto"
        options={null}
        nextAction="deliver_content"
        submitting={false}
        answerValue=""
        loadState="ready"
        conflictMessage="O progresso foi atualizado noutro dispositivo."
        chatMessages={[]}
        onAnswerChange={noop}
        onContinue={noop}
        onSubmitAnswer={noop}
        onBack={noop}
      />,
    )

    expect(
      screen.getByText(/noutro dispositivo/i).closest('[role="status"]'),
    ).toHaveTextContent(/noutro dispositivo/i)
    expect(screen.getByRole('button', { name: /^continuar$/i })).toBeInTheDocument()
    expect(screen.getByRole('log', { name: /histórico da trilha/i })).toBeInTheDocument()

    rerender(
      <TrilhaPlayerPageView
        stageNumber={1}
        questionNumber={1}
        stageType="fixed"
        body=""
        options={null}
        nextAction="deliver_content"
        submitting={false}
        answerValue=""
        loadState="loading"
        chatMessages={[]}
        onAnswerChange={noop}
        onContinue={noop}
        onSubmitAnswer={noop}
        onBack={noop}
      />,
    )

    expect(screen.getByText(/a carregar a conversa da trilha/i)).toBeInTheDocument()
  })

  it('player erro: banner alert + h1 landmark', () => {
    render(
      <TrilhaPlayerPageView
        stageNumber={1}
        questionNumber={1}
        stageType="fixed"
        body=""
        options={null}
        nextAction="deliver_content"
        submitting={false}
        answerValue=""
        loadState="error"
        errorMessage="Falha de rede"
        chatMessages={[]}
        onAnswerChange={noop}
        onContinue={noop}
        onSubmitAnswer={noop}
        onBack={noop}
        onRetry={noop}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: /player da trilha/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/falha de rede/i)
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
  })
})
