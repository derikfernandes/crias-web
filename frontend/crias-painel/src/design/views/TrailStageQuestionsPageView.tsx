import { Link } from 'react-router-dom'
import type { TrailStageQuestionsPageViewProps } from '../types/trailStageQuestionsPageView'

export type {
  TrailStageQuestionsRow,
  TrailStageQuestionsPageViewProps,
} from '../types/trailStageQuestionsPageView'

export function TrailStageQuestionsPageView(
  props: TrailStageQuestionsPageViewProps,
) {
  if (props.status === 'missing-trail-id') {
    return (
      <p className="banner banner--error" role="alert">
        ID da trilha ausente na URL.
      </p>
    )
  }

  if (props.status === 'invalid-stage') {
    return (
      <p className="banner banner--error" role="alert">
        Número de stage inválido na URL.
      </p>
    )
  }

  const {
    trailBackHref,
    trailBackLabel,
    trailError,
    loadingTrail,
    trailNotFound,
    trailLede,
    stageError,
    loadingStage,
    stageNotFound,
    showForm,
    formSlot,
    formLoading,
    loadingQuestions,
    questionsError,
    questionRows,
    emptyListPath,
    onNewQuestion,
    onEditQuestion,
  } = props

  return (
    <>
      <header className="admin__header">
        <h1>Atividades da etapa</h1>
        <p className="admin__actions">
          <Link className="btn btn--ghost" to={trailBackHref}>
            ← Trilha: {trailBackLabel}
          </Link>
        </p>
      </header>

      {trailError ? (
        <p className="banner banner--error" role="alert">
          {trailError}
        </p>
      ) : null}

      {loadingTrail ? (
        <p className="muted">Carregando trilha…</p>
      ) : trailNotFound ? (
        <p className="banner banner--error" role="alert">
          Trilha não encontrada.
        </p>
      ) : (
        trailLede
      )}

      {stageError ? (
        <p className="banner banner--error" role="alert">
          {stageError}
        </p>
      ) : null}

      {loadingStage ? (
        <p className="muted">Carregando stage…</p>
      ) : stageNotFound ? (
        <p className="banner banner--error" role="alert">
          Etapa não encontrada. Cadastre-a na trilha antes das atividades.
        </p>
      ) : (
        <section className="panel">
          <div className="panel__head">
            <h2>Etapas e exercícios (conteúdo)</h2>
            <p className="panel__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={onNewQuestion}
              >
                + Nova atividade
              </button>
            </p>
          </div>

          {showForm ? (
            formLoading ? (
              <p className="muted">Carregando atividade…</p>
            ) : (
              formSlot
            )
          ) : null}

          {loadingQuestions ? (
            <p className="muted">Carregando atividades…</p>
          ) : questionsError ? (
            <p className="banner banner--error" role="alert">
              {questionsError}
            </p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Título</th>
                    <th>Liberada</th>
                    <th>Ativa</th>
                    <th>Atualizado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {questionRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted table__empty">
                        Nenhuma atividade nesta etapa. Link direto desta tela:{' '}
                        <code>{emptyListPath}</code>
                      </td>
                    </tr>
                  ) : (
                    questionRows.map((q) => (
                      <tr key={q.id}>
                        <td>{q.questionNumber}</td>
                        <td>{q.title}</td>
                        <td>{q.releasedLabel}</td>
                        <td>{q.activeLabel}</td>
                        <td>{q.updatedAtLabel}</td>
                        <td className="table__actions">
                          <button
                            type="button"
                            className="btn btn--small btn--ghost"
                            onClick={() => onEditQuestion(q.id)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  )
}
