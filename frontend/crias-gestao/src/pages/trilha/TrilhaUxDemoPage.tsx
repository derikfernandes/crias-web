/**
 * DEV-only: estados fixos para screenshots UX (histórico / markdown / MCQ / home).
 * Não chama API — só monta as views de design com fixtures.
 */
import { StudentShellView } from '../../design/layouts/StudentShellView'
import { TrilhaHistoryPageView } from '../../design/views/TrilhaHistoryPageView'
import { TrilhaHomePageView } from '../../design/views/TrilhaHomePageView'
import { TrilhaPlayerPageView } from '../../design/views/TrilhaPlayerPageView'

const noop = () => undefined

export function TrilhaUxDemoPage() {
  const params = new URLSearchParams(window.location.search)
  const scene = params.get('scene') ?? 'markdown'


  if (scene === 'home-done') {
    return (
      <StudentShellView studentName="Ana" onLogout={noop}>
        <TrilhaHomePageView
          studentName="Ana"
          trails={[
            {
              trailId: 't1',
              title: 'Introdução à cidadania',
              institutionName: 'Escola Demo',
              subject: 'Cidadania',
              status: 'completed',
              nextAction: 'completed',
              stageNumber: 4,
              questionNumber: 4,
              progressRatio: 1,
              totalStages: 4,
              totalQuestions: 4,
              stagesCompleted: 4,
              lastActivityAt: '2026-09-21T10:00:00Z',
            },
          ]}
          totals={{ trails: 1, inProgress: 0, completed: 1, stagesCompleted: 4 }}
          loadState="ready"
          onContinue={noop}
          onOpenHistory={noop}
        />
      </StudentShellView>
    )
  }

  if (scene === 'home' || scene === 'home-paused') {
    const paused = scene === 'home-paused'
    return (
      <StudentShellView studentName="Ana" onLogout={noop}>
        <TrilhaHomePageView
          studentName="Ana"
          trails={[
            {
              trailId: 't1',
              title: 'Introdução à cidadania',
              institutionName: 'Escola Demo',
              subject: 'Cidadania',
              status: 'in_progress',
              nextAction: paused ? 'await_release' : 'await_answer',
              stageNumber: 2,
              questionNumber: 2,
              progressRatio: paused ? 0.35 : 0.4,
              totalStages: 4,
              totalQuestions: 4,
              stagesCompleted: 1,
              lastActivityAt: '2026-09-23T14:30:00Z',
            },
            {
              trailId: 't2',
              title: 'Matemática — Demo',
              institutionName: 'Escola Demo',
              subject: 'Matemática',
              status: 'not_started',
              nextAction: 'deliver_content',
              stageNumber: 1,
              questionNumber: 1,
              progressRatio: 0,
              totalStages: 3,
              totalQuestions: 5,
              stagesCompleted: 0,
            },
          ]}
          totals={{ trails: 2, inProgress: 1, completed: 0, stagesCompleted: 1 }}
          whatsappHelpHref="https://wa.me/5512974085258"
          loadState="ready"
          onContinue={noop}
          onOpenHistory={noop}
        />
      </StudentShellView>
    )
  }

  if (scene === 'history-paged') {
    const items = [1, 2, 3, 4, 5, 6].flatMap((stageNumber) => [
      {
        stageNumber,
        questionNumber: 1,
        stageType: 'fixed' as const,
        title: `Etapa ${stageNumber} — leitura`,
        body: `Conteúdo da fase ${stageNumber}.`,
        studentAnswer: null,
        isCorrect: null,
      },
    ])
    return (
      <StudentShellView studentName="Ana" onLogout={noop}>
        <TrilhaHistoryPageView
          loadState="ready"
          onBack={noop}
          onContinueCurrent={noop}
          items={items}
        />
      </StudentShellView>
    )
  }

  if (scene === 'history') {
    return (
      <StudentShellView studentName="Dérik" onLogout={noop}>
        <TrilhaHistoryPageView
          loadState="ready"
          onBack={noop}
          items={[
            {
              stageNumber: 1,
              questionNumber: 76,
              stageType: 'fixed',
              title: '**Contextualização**',
              body: '🗣️ *Contextualização*\n\nVamos falar de **formas geométricas** e o que já vimos.',
              studentAnswer: null,
              isCorrect: null,
            },
            {
              stageNumber: 1,
              questionNumber: 77,
              stageType: 'exercise',
              title: 'Exercício',
              body: 'Qual elemento?',
              studentAnswer: '**A**',
              isCorrect: true,
            },
            {
              stageNumber: 2,
              questionNumber: 1,
              stageType: 'exercise',
              title: 'Situações do dia a dia',
              body: 'Qual atitude demonstra cidadania?',
              studentAnswer: 'C',
              isCorrect: false,
            },
          ]}
        />
      </StudentShellView>
    )
  }


  if (scene === 'feedback') {
    return (
      <StudentShellView studentName="Dérik" onLogout={noop}>
        <TrilhaPlayerPageView
          stageNumber={2}
          questionNumber={2}
          totalQuestions={5}
          totalStages={4}
          stageType="exercise"
          title="Situações do dia a dia"
          body="Qual atitude demonstra cidadania?"
          options={[
            { key: 'A', label: 'A) Ignorar' },
            { key: 'B', label: 'B) Ajudar o colega' },
            { key: 'C', label: 'C) Atrapalhar' },
          ]}
          nextAction="await_answer"
          submitting={false}
          answerValue="B"
          feedbackState="correct"
          loadState="ready"
          chatMessages={[
            {
              id: '1',
              sender: 'system',
              message_text: 'Qual atitude demonstra cidadania?',
              stage_number: 2,
              question_number: 2,
              created_at_brasilia: '2026-09-23T10:00:00',
            },
            {
              id: '2',
              sender: 'student',
              message_text: 'B',
              stage_number: 2,
              question_number: 2,
              created_at_brasilia: '2026-09-23T10:01:00',
            },
          ]}
          onAnswerChange={noop}
          onContinue={noop}
          onSubmitAnswer={noop}
          onContinueAfterFeedback={noop}
          onBack={noop}
          onOpenHistory={noop}
        />
      </StudentShellView>
    )
  }

  if (scene === 'mcq') {
    return (
      <StudentShellView studentName="Dérik" onLogout={noop}>
        <TrilhaPlayerPageView
          stageNumber={2}
          questionNumber={2}
          totalQuestions={5}
          totalStages={4}
          stageType="exercise"
          title="Situações do dia a dia"
          body="O segmento que une dois vértices não consecutivos de um polígono é chamado de:"
          options={[
            { key: 'A', label: 'A) Lado' },
            { key: 'B', label: 'B) Diagonal' },
            { key: 'C', label: 'C) Ângulo' },
          ]}
          nextAction="await_answer"
          submitting={false}
          answerValue="B"
          loadState="ready"
          chatMessages={[
            {
              id: '1',
              sender: 'system',
              message_text:
                '🗣️ *Contextualização*\n\nVamos praticar **polígonos**.',
              stage_number: 2,
              question_number: 1,
              created_at_brasilia: '2026-09-23T09:58:00',
            },
            {
              id: '2',
              sender: 'system',
              message_text:
                'O segmento que une dois vértices não consecutivos de um polígono é chamado de:',
              stage_number: 2,
              question_number: 2,
              created_at_brasilia: '2026-09-23T10:00:00',
            },
          ]}
          onAnswerChange={noop}
          onContinue={noop}
          onSubmitAnswer={noop}
          onBack={noop}
          onOpenHistory={noop}
        />
      </StudentShellView>
    )
  }

  if (scene === 'chat') {
    return (
      <StudentShellView studentName="Dérik" onLogout={noop}>
        <TrilhaPlayerPageView
          stageNumber={2}
          questionNumber={1}
          totalQuestions={5}
          totalStages={4}
          stageType="ai"
          title="Questão 76 IA"
          body={
            '🗣️ *Contextualização*\n\nHoje vamos revisar **formas geométricas** e *polígonos*.\n\nObserve o desenho e continue.'
          }
          options={null}
          nextAction="deliver_content"
          submitting={false}
          answerValue=""
          loadState="ready"
          chatMessages={[
            {
              id: '1',
              sender: 'system',
              message_text: 'Bem-vindo à trilha. Vamos começar *juntos*.',
              stage_number: 1,
              question_number: 1,
              created_at_brasilia: '2026-09-22T18:10:00',
            },
            {
              id: '2',
              sender: 'student',
              message_text: 'B',
              stage_number: 1,
              question_number: 2,
              created_at_brasilia: '2026-09-22T18:12:00',
            },
            {
              id: '3',
              sender: 'system',
              message_text:
                '🗣️ *Contextualização*\n\nHoje vamos revisar **formas geométricas** e *polígonos*.\n\nObserve o desenho e continue.',
              stage_number: 2,
              question_number: 1,
              created_at_brasilia: '2026-09-23T10:05:00',
            },
          ]}
          onAnswerChange={noop}
          onContinue={noop}
          onSubmitAnswer={noop}
          onBack={noop}
          onOpenHistory={noop}
        />
      </StudentShellView>
    )
  }

  return (
    <StudentShellView studentName="Dérik" onLogout={noop}>
      <TrilhaPlayerPageView
        stageNumber={2}
        questionNumber={1}
        totalQuestions={5}
        totalStages={4}
        stageType="ai"
        title="Questão 76 IA"
        body={
          '🗣️ *Contextualização*\n\nHoje vamos revisar **formas geométricas** e *polígonos*.\n\nObserve o desenho e continue.'
        }
        options={null}
        nextAction="deliver_content"
        submitting={false}
        answerValue=""
        loadState="ready"
        chatMessages={[
          {
            id: '1',
            sender: 'system',
            message_text:
              '🗣️ *Contextualização*\n\nHoje vamos revisar **formas geométricas** e *polígonos*.\n\nObserve o desenho e continue.',
            stage_number: 2,
            question_number: 1,
            created_at_brasilia: '2026-09-23T10:05:00',
          },
        ]}
        onAnswerChange={noop}
        onContinue={noop}
        onSubmitAnswer={noop}
        onBack={noop}
        onOpenHistory={noop}
      />
    </StudentShellView>
  )
}
