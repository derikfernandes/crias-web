import { useEffect, useRef, useState } from 'react'
import type {
  BulkImportPreview,
  ContentEtapa,
  ContentPhase,
  ContentQuestion,
} from '../lib/trailEditor'

type Props = {
  contentEtapas: ContentEtapa[]
  selectedEtapaId: string | null
  selectedQuestionId: string | null
  phaseSaved: Record<string, boolean>
  saving: boolean
  error: string | null
  onAddEtapa: () => void
  onSelectEtapa: (etapaId: string) => void
  onSelectQuestion: (questionId: string) => void
  onToggleEtapaReleased: (etapaId: string) => void
  onUpdateQuestionTitle: (questionId: string, value: string) => void
  onUpdateQuestionPhase: (
    questionId: string,
    phaseId: string,
    patch: Partial<
      Pick<
        ContentPhase,
        'aiPrompt' | 'fixedText' | 'correctOption' | 'exerciseQuestions'
      >
    >,
  ) => void
  onMarkPhaseSaved: (questionId: string, phaseId: string) => void
  onRemoveEtapa?: (etapaId: string) => void
  onBack: () => void
  onSave: () => void
  backLabel: string
  saveLabel: string
  onDownloadTemplate?: () => void
  onImportFile?: (file: File) => void
  onApplyImportedContent?: () => void
  bulkPreview?: BulkImportPreview | null
  importingBulk?: boolean
  hasPendingImportedContent?: boolean
}

export function TrailContentEditor({
  contentEtapas,
  selectedEtapaId,
  selectedQuestionId,
  phaseSaved,
  saving,
  error,
  onAddEtapa,
  onSelectEtapa,
  onSelectQuestion,
  onToggleEtapaReleased,
  onUpdateQuestionTitle,
  onUpdateQuestionPhase,
  onMarkPhaseSaved,
  onRemoveEtapa,
  onBack,
  onSave,
  backLabel,
  saveLabel,
  onDownloadTemplate,
  onImportFile,
  onApplyImportedContent,
  bulkPreview = null,
  importingBulk = false,
  hasPendingImportedContent = false,
}: Props) {
  const selectedEtapa =
    contentEtapas.find((et) => et.id === selectedEtapaId) ?? null
  const selectedQuestion =
    selectedEtapa?.questions.find((q) => q.id === selectedQuestionId) ?? null
  const [expandedPhaseKeys, setExpandedPhaseKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const gridRef = useRef<HTMLDivElement>(null)
  const editorColumnRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const grid = gridRef.current
    const editorColumn = editorColumnRef.current
    if (!grid || !editorColumn || typeof ResizeObserver === 'undefined') return

    const syncEditorHeight = () => {
      const height = Math.ceil(editorColumn.getBoundingClientRect().height)
      grid.style.setProperty('--trail-content-editor-column-height', `${height}px`)
    }
    const observer = new ResizeObserver(syncEditorHeight)
    observer.observe(editorColumn)
    syncEditorHeight()

    return () => {
      observer.disconnect()
      grid.style.removeProperty('--trail-content-editor-column-height')
    }
  }, [])

  return (
    <div className="trail-content-editor">
      <header className="trail-content-editor__header">
        <div>
          <h3>Conteúdos da trilha ✨</h3>
          <p className="muted">
            Crie as questões da etapa e o sistema aplicará cada uma delas em todas as
            fases da trilha, seguindo a ordem definida na estrutura.
          </p>
        </div>
        <aside className="trail-content-editor__tip">
          <strong>🧩 Como funciona?</strong>
          <p className="muted">
            Cada questão percorre todas as fases da etapa. O CRIAS aplica o conteúdo em
            todas elas, mantendo o fluxo consistente.
          </p>
        </aside>
      </header>

      {onDownloadTemplate || onImportFile ? (
        <div className="trail-content-editor__col-head" style={{ marginBottom: '0.75rem' }}>
          <h4>Ações em lote</h4>
          <div className="panel__actions" style={{ display: 'flex', gap: '0.5rem' }}>
            {onDownloadTemplate ? (
              <button type="button" className="btn btn--ghost btn--small" onClick={onDownloadTemplate}>
                Baixar planilha modelo
              </button>
            ) : null}
            {onImportFile ? <ImportFileButton onImportFile={onImportFile} /> : null}
            {onApplyImportedContent ? (
              <button
                type="button"
                className="btn btn--small btn--primary"
                onClick={onApplyImportedContent}
                disabled={!hasPendingImportedContent || importingBulk}
              >
                Aplicar lote
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {bulkPreview ? (
        <div className={bulkPreview.invalidRows > 0 ? 'banner banner--error' : 'banner banner--info'}>
          <p style={{ margin: 0 }}>
            Linhas lidas: <strong>{bulkPreview.totalRows}</strong> · Válidas:{' '}
            <strong>{bulkPreview.validRows}</strong> · Inválidas:{' '}
            <strong>{bulkPreview.invalidRows}</strong>
          </p>
          {bulkPreview.errorsByRow.length > 0 ? (
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1rem' }}>
              {bulkPreview.errorsByRow.slice(0, 8).map((err, idx) => (
                <li key={`${err.rowNumber}-${err.field}-${idx}`}>
                  Linha {err.rowNumber} · {err.field}: {err.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}

      <div ref={gridRef} className="trail-content-editor__grid">
        <section className="trail-content-editor__col">
          <div className="trail-content-editor__col-head">
            <h4>Etapas da trilha</h4>
            <button type="button" className="btn btn--ghost btn--small" onClick={onAddEtapa}>
              + Nova etapa
            </button>
          </div>
          <div className="trail-content-editor__list">
            {contentEtapas
              .map((etapa, index) => ({ etapa, index }))
              .reverse()
              .map(({ etapa, index }) => (
              <div key={etapa.id} className="trail-content-editor__item-row">
                <button
                  type="button"
                  className={`trail-content-editor__item ${selectedEtapaId === etapa.id ? 'is-active' : ''}`}
                  onClick={() => onSelectEtapa(etapa.id)}
                >
                  <div className="trail-content-editor__item-title">
                    Etapa {index + 1} —{' '}
                    {etapa.name.trim() || `Etapa ${index + 1}`}
                  </div>
                  <div className="muted">
                    {etapa.questions.length} questão{etapa.questions.length === 1 ? '' : 'ões'}
                  </div>
                </button>
                <button
                  type="button"
                  className={`trail-content-editor__etapa-release btn btn--small ${etapa.released ? 'is-released' : ''}`}
                  aria-pressed={etapa.released}
                  aria-label={
                    etapa.released
                      ? 'Etapa liberada para o aluno em todas as fases. Ativar para bloquear.'
                      : 'Etapa bloqueada. Ativar para liberar todas as fases para o aluno.'
                  }
                  title={
                    etapa.released
                      ? 'Etapa liberada: todas as fases visíveis para o aluno. Clique para bloquear.'
                      : 'Etapa bloqueada. Clique para liberar todas as fases para o aluno.'
                  }
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleEtapaReleased(etapa.id)
                  }}
                >
                  <span className="trail-content-editor__etapa-release-icon" aria-hidden>
                    {etapa.released ? '🔓' : '🔒'}
                  </span>
                  <span className="trail-content-editor__etapa-release-label">
                    {etapa.released ? 'Liberada' : 'Bloqueada'}
                  </span>
                </button>
              </div>
              ))}
          </div>
          <p className="trail-content-editor__support muted">
            💡 A estrutura (fases) é a mesma em todas as etapas. O conteúdo muda em cada
            questão.
          </p>
        </section>

        <section
          ref={editorColumnRef}
          className="trail-content-editor__col trail-content-editor__col--editor"
        >
          {selectedEtapa ? (
            <>
              <div className="trail-content-editor__col-head trail-content-editor__col-head--etapa">
                <h4>Conteúdo da etapa "{selectedEtapa.name.trim() || 'Sem nome'}"</h4>
                <div className="trail-content-editor__etapa-actions">
                  <button
                    type="button"
                    className={`trail-content-editor__etapa-release trail-content-editor__etapa-release--inline btn btn--small btn--ghost ${selectedEtapa.released ? 'is-released' : ''}`}
                    aria-pressed={selectedEtapa.released}
                    aria-label={
                      selectedEtapa.released
                        ? 'Etapa liberada em todas as fases. Ativar para bloquear.'
                        : 'Liberar etapa para o aluno em todas as fases.'
                    }
                    title={
                      selectedEtapa.released
                        ? 'Etapa liberada (todas as fases). Clique para bloquear.'
                        : 'Clique para liberar esta etapa (todas as fases) para o aluno.'
                    }
                    onClick={() => onToggleEtapaReleased(selectedEtapa.id)}
                  >
                    <span className="trail-content-editor__etapa-release-icon" aria-hidden>
                      {selectedEtapa.released ? '🔓' : '🔒'}
                    </span>
                    {selectedEtapa.released ? 'Liberada' : 'Liberar etapa'}
                  </button>
                  {onRemoveEtapa ? (
                    <button
                      type="button"
                      className="btn btn--small btn--ghost trail-content-editor__etapa-delete"
                      onClick={() => {
                        const label = selectedEtapa.name.trim() || 'Sem nome'
                        const confirmed = window.confirm(
                          `Excluir a etapa "${label}"? Esta ação não pode ser desfeita.`,
                        )
                        if (confirmed) onRemoveEtapa(selectedEtapa.id)
                      }}
                    >
                      Excluir etapa
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="muted">Cada questão percorre todas as fases da trilha.</p>
              <div className="trail-content-editor__list">
                {selectedEtapa.questions.length === 0 ? (
                  <p className="muted">Nenhuma questão criada nesta etapa.</p>
                ) : (
                  selectedEtapa.questions.map((question, qIdx) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      isActive={selectedQuestionId === question.id}
                      questionIndex={qIdx}
                      onSelectQuestion={onSelectQuestion}
                      onUpdateQuestionTitle={onUpdateQuestionTitle}
                    />
                  ))
                )}
              </div>

              {selectedQuestion ? (
                <>
                  <h4>
                    Editando: <span>"{selectedQuestion.title || 'Nova questão'}"</span>
                  </h4>

                  <div className="trail-content-editor__phase-editors">
                    {selectedQuestion.phases.map((phase, idx) => {
                      const phaseKey = `${selectedQuestion.id}:${phase.phaseId}`
                      const isExpanded = expandedPhaseKeys.has(phaseKey)
                      const preview = phase.fixedText.trim()
                      const typeLabel =
                        phase.phaseType === 'ai'
                          ? 'IA'
                          : phase.phaseType === 'fixed'
                            ? 'Texto'
                            : 'Exercício'
                      const typeIcon =
                        phase.phaseType === 'ai'
                          ? '🧠'
                          : phase.phaseType === 'fixed'
                            ? '📄'
                            : '✏️'
                      return (
                        <article
                          key={`editor-${selectedQuestion.id}-${phase.phaseId}`}
                          className={`trail-content-editor__phase-editor${
                            isExpanded
                              ? ' trail-content-editor__phase-editor--expanded'
                              : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="trail-content-editor__phase-toggle"
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedPhaseKeys((current) => {
                                const next = new Set(current)
                                if (next.has(phaseKey)) next.delete(phaseKey)
                                else next.add(phaseKey)
                                return next
                              })
                            }
                          >
                            <span className="trail-content-editor__phase-toggle-top">
                              <span className="trail-content-editor__phase-index">
                                Fase {idx + 1}
                              </span>
                              <span className="trail-content-editor__phase-badge">
                                {typeIcon} {typeLabel}
                              </span>
                            </span>
                            <strong className="trail-content-editor__phase-title">
                              {phase.phaseTitle}
                            </strong>
                            {!isExpanded ? (
                              <span className="trail-content-editor__phase-preview muted">
                                {preview
                                  ? preview
                                  : 'Sem conteúdo ainda. Clique para editar.'}
                              </span>
                            ) : null}
                            <span className="trail-content-editor__phase-expand-hint muted">
                              {isExpanded ? 'Recolher' : 'Expandir'}
                            </span>
                          </button>

                          {isExpanded ? (
                            <div className="trail-content-editor__phase-body">
                              {phase.phaseType === 'ai' ? (
                                <>
                                  <label className="field">
                                    <span>Conteúdo da fase</span>
                                    <textarea
                                      rows={7}
                                      value={phase.fixedText}
                                      onChange={(e) =>
                                        onUpdateQuestionPhase(
                                          selectedQuestion.id,
                                          phase.phaseId,
                                          { fixedText: e.target.value },
                                        )
                                      }
                                      placeholder="Texto-base desta fase para a IA trabalhar."
                                    />
                                  </label>
                                  <p className="muted">
                                    A IA usa o conteúdo desta fase como base.
                                  </p>
                                </>
                              ) : null}

                              {phase.phaseType === 'fixed' ? (
                                <label className="field">
                                  <span>Conteúdo</span>
                                  <textarea
                                    rows={7}
                                    value={phase.fixedText}
                                    onChange={(e) =>
                                      onUpdateQuestionPhase(
                                        selectedQuestion.id,
                                        phase.phaseId,
                                        { fixedText: e.target.value },
                                      )
                                    }
                                  />
                                </label>
                              ) : null}

                              {phase.phaseType === 'exercise' ? (
                                <>
                                  <label className="field">
                                    <span>Pergunta do exercício</span>
                                    <textarea
                                      rows={5}
                                      value={phase.fixedText}
                                      onChange={(e) =>
                                        onUpdateQuestionPhase(
                                          selectedQuestion.id,
                                          phase.phaseId,
                                          { fixedText: e.target.value },
                                        )
                                      }
                                      placeholder="Escreva a pergunta desta fase de exercício."
                                    />
                                  </label>
                                  <label className="field">
                                    <span>Gabarito / resposta correta</span>
                                    <select
                                      value={phase.correctOption}
                                      onChange={(e) =>
                                        onUpdateQuestionPhase(
                                          selectedQuestion.id,
                                          phase.phaseId,
                                          { correctOption: e.target.value },
                                        )
                                      }
                                    >
                                      <option value="">Selecione a resposta</option>
                                      <option value="1">A</option>
                                      <option value="2">B</option>
                                      <option value="3">C</option>
                                    </select>
                                  </label>
                                  <p className="muted">
                                    A opção escolhida será salva como 1, 2 ou 3.
                                  </p>
                                </>
                              ) : null}

                              <div className="trail-content-editor__phase-save">
                                <button
                                  type="button"
                                  className="btn btn--small btn--primary"
                                  onClick={() =>
                                    onMarkPhaseSaved(
                                      selectedQuestion.id,
                                      phase.phaseId,
                                    )
                                  }
                                >
                                  Salvar
                                </button>
                                {phaseSaved[
                                  `${selectedQuestion.id}:${phase.phaseId}`
                                ] ? (
                                  <span className="trail-content-editor__saved">
                                    ✅ Salvo
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p className="muted">
                  Selecione ou crie uma questão para editar os conteúdos por fase.
                </p>
              )}
            </>
          ) : (
            <p className="muted">Selecione uma etapa para criar e editar as questões.</p>
          )}
        </section>
      </div>

      <footer className="trail-content-editor__footer">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onBack}
          disabled={saving}
        >
          {backLabel}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Salvando…' : saveLabel}
        </button>
      </footer>
    </div>
  )
}

type ImportFileButtonProps = {
  onImportFile: (file: File) => void
}

function ImportFileButton({ onImportFile }: ImportFileButtonProps) {
  return (
    <label className="btn btn--small btn--ghost" style={{ cursor: 'pointer' }}>
      Importar planilha
      <input
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          if (file) onImportFile(file)
          e.currentTarget.value = ''
        }}
      />
    </label>
  )
}

type QuestionCardProps = {
  question: ContentQuestion
  isActive: boolean
  questionIndex: number
  onSelectQuestion: (questionId: string) => void
  onUpdateQuestionTitle: (questionId: string, value: string) => void
}

function QuestionCard({
  question,
  isActive,
  questionIndex,
  onSelectQuestion,
  onUpdateQuestionTitle,
}: QuestionCardProps) {
  return (
    <div
      key={question.id}
      className={`trail-content-editor__question ${isActive ? 'is-active' : ''}`}
    >
      <div
        className="trail-content-editor__question-main"
        onClick={() => onSelectQuestion(question.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelectQuestion(question.id)
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span className="trail-content-editor__question-index">{questionIndex + 1}</span>
        <input
          type="text"
          value={question.title}
          onChange={(e) => onUpdateQuestionTitle(question.id, e.target.value)}
          aria-label={`Título da questão ${questionIndex + 1}`}
        />
      </div>
    </div>
  )
}
