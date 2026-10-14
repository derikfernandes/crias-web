import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deleteTrailCascade,
  saveTrailContentDraft,
  saveTrailWithStructure,
  updateTrail,
} from '../lib/public/trails'
import { trailPath } from '../lib/paths'
import { TrailStructureEditor } from './TrailStructureEditor'
import { TrailContentEditor } from './TrailContentEditor'
import {
  buildQuestionFromStructure,
  defaultEtapasFromStructure,
  defaultStructurePhases,
  newId,
  newStructurePhase,
  syncQuestionPhasesWithStructure,
  type ContentEtapa,
  type ContentPhase,
  type StructurePhase,
} from '../lib/trailEditor'
import type { Trail } from '../types/trail'

type Props = {
  /** Se ausente, modo criação. */
  docId?: string
  /** Instituição fixa usada no modo criação. */
  fixedInstitutionId?: string
  /** Dados atuais (modo edição); o pai mantém o listener do Firestore. */
  initial?: Trail
  /** Callback opcional após salvar com sucesso. */
  onSaved?: () => void
}

const DEFAULT_STEPS = 8

function sanitizeStepsInt(v: string): number | null {
  const trimmed = v.trim()
  if (!trimmed) return null
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  return n
}

function trimRequiredString(v: string): string | null {
  const s = v.trim()
  return s.length ? s : null
}

export function TrailForm({ docId, fixedInstitutionId, initial, onSaved }: Props) {
  const navigate = useNavigate()
  const isEdit = Boolean(docId)
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)
  const [createdTrailId, setCreatedTrailId] = useState<string | null>(null)
  const [contentEtapas, setContentEtapas] = useState<ContentEtapa[]>([])
  const [selectedEtapaId, setSelectedEtapaId] = useState<string | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [phaseSaved, setPhaseSaved] = useState<Record<string, boolean>>({})
  const [savingContentDraft, setSavingContentDraft] = useState(false)

  const [institution_id, setInstitutionId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [default_total_steps_per_stage, setDefaultTotalStepsPerStage] =
    useState(String(DEFAULT_STEPS))
  const [structurePhases, setStructurePhases] = useState<StructurePhase[]>(
    defaultStructurePhases,
  )
  const [active, setActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const parsedSteps = useMemo(
    () => sanitizeStepsInt(default_total_steps_per_stage),
    [default_total_steps_per_stage],
  )
  const previewDescription = useMemo(() => {
    const trimmed = description.trim()
    if (!trimmed) return ''
    return trimmed.length > 140 ? `${trimmed.slice(0, 140)}...` : trimmed
  }, [description])

  const selectedEtapa = useMemo(
    () => contentEtapas.find((et) => et.id === selectedEtapaId) ?? null,
    [contentEtapas, selectedEtapaId],
  )

  useEffect(() => {
    if (!isEdit) {
      setInstitutionId((fixedInstitutionId ?? '').trim())
      setName('')
      setDescription('')
      setSubject('')
      setStructurePhases(defaultStructurePhases())
      setDefaultTotalStepsPerStage(String(DEFAULT_STEPS))
      setActive(true)
      setCreateStep(1)
      setCreatedTrailId(null)
      setContentEtapas([])
      setSelectedEtapaId(null)
      setSelectedQuestionId(null)
      setPhaseSaved({})
      setSavingContentDraft(false)
      return
    }

    if (!initial) return
    setInstitutionId(initial.institution_id)
    setName(initial.name)
    setDescription(initial.description)
    setSubject(initial.subject)
    setDefaultTotalStepsPerStage(
      String(initial.default_total_steps_per_stage ?? DEFAULT_STEPS),
    )
    setActive(initial.active)
  }, [fixedInstitutionId, isEdit, initial])

  useEffect(() => {
    if (isEdit || createStep !== 3) return
    if (contentEtapas.length > 0) return
    const defaults = defaultEtapasFromStructure(structurePhases)
    setContentEtapas(defaults)
    setSelectedEtapaId(defaults[0]?.id ?? null)
    setSelectedQuestionId(defaults[0]?.questions[0]?.id ?? null)
  }, [createStep, contentEtapas.length, isEdit, structurePhases])

  useEffect(() => {
    if (!selectedEtapa) return
    if (!selectedQuestionId) {
      setSelectedQuestionId(selectedEtapa.questions[0]?.id ?? null)
      return
    }
    if (!selectedEtapa.questions.some((q) => q.id === selectedQuestionId)) {
      setSelectedQuestionId(selectedEtapa.questions[0]?.id ?? null)
    }
  }, [selectedEtapa, selectedQuestionId])

  useEffect(() => {
    if (isEdit || createStep !== 3) return
    if (contentEtapas.length === 0) return
    setContentEtapas((prev) =>
      prev.map((et) => ({
        ...et,
        questions: et.questions.map((q) => ({
          ...q,
          phases: syncQuestionPhasesWithStructure(q, structurePhases),
        })),
      })),
    )
  }, [createStep, isEdit, structurePhases, contentEtapas.length])

  useEffect(() => {
    if (!selectedEtapaId) return
    const etapa = contentEtapas.find((et) => et.id === selectedEtapaId)
    if (!etapa || etapa.questions.length > 0) return

    const autoQuestion = buildQuestionFromStructure('Questão 1', structurePhases)
    setContentEtapas((prev) =>
      prev.map((et) =>
        et.id === selectedEtapaId ? { ...et, questions: [autoQuestion] } : et,
      ),
    )
    setSelectedQuestionId(autoQuestion.id)
  }, [contentEtapas, selectedEtapaId, structurePhases])

  function handleNextCreateStep() {
    const trimmedName = trimRequiredString(name)
    const trimmedDescription = trimRequiredString(description)
    const trimmedSubject = trimRequiredString(subject)

    if (!trimmedName) {
      setFormError('Informe o nome da trilha.')
      return
    }
    if (!trimmedSubject) {
      setFormError('Informe a matéria/tema principal da trilha.')
      return
    }
    if (!trimmedDescription) {
      setFormError('Informe a descrição geral da trilha.')
      return
    }

    setFormError(null)
    setCreateStep(2)
  }

  function addStructurePhase() {
    setStructurePhases((prev) => [
      ...prev,
      newStructurePhase(`Fase ${prev.length + 1}`, 'fixed'),
    ])
  }

  function addEtapa() {
    setContentEtapas((prev) => {
      const autoQuestion = buildQuestionFromStructure('Questão 1', structurePhases)
      const created = {
        id: newId('et'),
        name: `Etapa ${prev.length + 1}`,
        released: false,
        questions: [autoQuestion],
      }
      setSelectedEtapaId(created.id)
      setSelectedQuestionId(autoQuestion.id)
      return [...prev, created]
    })
  }

  function removeEtapa(etapaId: string) {
    setContentEtapas((prev) => {
      if (prev.length <= 1) {
        setFormError('A trilha precisa de pelo menos 1 etapa.')
        return prev
      }
      const removedIndex = prev.findIndex((et) => et.id === etapaId)
      if (removedIndex < 0) return prev
      const next = prev.filter((et) => et.id !== etapaId)
      const nextSelected = next[Math.min(removedIndex, next.length - 1)] ?? null
      setSelectedEtapaId(nextSelected?.id ?? null)
      setSelectedQuestionId(nextSelected?.questions[0]?.id ?? null)
      return next
    })
  }

  function updateQuestionTitle(questionId: string, value: string) {
    setContentEtapas((prev) =>
      prev.map((et) => ({
        ...et,
        questions: et.questions.map((q) =>
          q.id === questionId ? { ...q, title: value } : q,
        ),
      })),
    )
  }

  function updateQuestionPhase(
    questionId: string,
    phaseId: string,
    patch: Partial<
      Pick<
        ContentPhase,
        'aiPrompt' | 'fixedText' | 'correctOption' | 'exerciseQuestions'
      >
    >,
  ) {
    setContentEtapas((prev) =>
      prev.map((et) => ({
        ...et,
        questions: et.questions.map((q) =>
          q.id === questionId
            ? {
                ...q,
                phases: q.phases.map((p) =>
                  p.phaseId === phaseId ? { ...p, ...patch } : p,
                ),
              }
            : q,
        ),
      })),
    )
    setPhaseSaved((prev) => ({
      ...prev,
      [`${questionId}:${phaseId}`]: false,
    }))
  }

  function markPhaseSaved(questionId: string, phaseId: string) {
    setPhaseSaved((prev) => ({
      ...prev,
      [`${questionId}:${phaseId}`]: true,
    }))
  }

  function toggleEtapaReleased(etapaId: string) {
    setContentEtapas((prev) =>
      prev.map((et) =>
        et.id === etapaId ? { ...et, released: !et.released } : et,
      ),
    )
  }

  async function handleSaveAndContinue() {
    if (!createdTrailId) return
    if (contentEtapas.length === 0) {
      setFormError('Crie pelo menos uma etapa antes de continuar.')
      return
    }

    if (contentEtapas.some((etapa) => etapa.questions.length !== 1)) {
      setFormError(
        'Cada etapa deve ter exatamente 1 questão. Crie novos conteúdos adicionando uma nova etapa.',
      )
      return
    }

    const incomplete = contentEtapas.find((etapa) => {
      const question = etapa.questions[0]
      if (!question) return true
      return question.phases.some((phase) => {
        if (phase.phaseType === 'ai') return !trimRequiredString(phase.fixedText)
        if (phase.phaseType === 'fixed') return !trimRequiredString(phase.fixedText)
        return !trimRequiredString(phase.fixedText)
      })
    })

    if (incomplete) {
      setFormError(
        `Preencha as questões da etapa "${incomplete.name.trim() || 'Sem nome'}" em todas as fases antes de continuar.`,
      )
      return
    }

    setSavingContentDraft(true)
    setFormError(null)
    try {
      await saveTrailContentDraft(createdTrailId, contentEtapas)

      navigate(trailPath(createdTrailId))
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Erro ao salvar os conteúdos.',
      )
    } finally {
      setSavingContentDraft(false)
    }
  }

  function removeStructurePhase(id: string) {
    setStructurePhases((prev) =>
      prev.length <= 1 ? prev : prev.filter((p) => p.id !== id),
    )
  }

  function updateStructurePhase(
    id: string,
    patch: Partial<Pick<StructurePhase, 'title' | 'stage_type' | 'prompt'>>,
  ) {
    setStructurePhases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isEdit && createStep !== 2) return

    const instId = institution_id.trim()
    const trimmedName = trimRequiredString(name)
    const trimmedDescription = trimRequiredString(description)
    const trimmedSubject = trimRequiredString(subject)

    if (!instId) {
      setFormError('Informe a instituição (vínculo obrigatório).')
      return
    }
    if (!trimmedName) {
      setFormError('Informe o nome da trilha.')
      return
    }
    if (!trimmedDescription) {
      setFormError('Informe a descrição geral da trilha.')
      return
    }
    if (!trimmedSubject) {
      setFormError('Informe a matéria/tema principal da trilha.')
      return
    }
    let stepsToSave: number
    if (!isEdit) {
      if (structurePhases.length < 1) {
        setFormError('Inclua pelo menos uma fase na estrutura.')
        return
      }
      for (let i = 0; i < structurePhases.length; i++) {
        const phase = structurePhases[i]
        if (!trimRequiredString(phase.title)) {
          setFormError('Cada fase precisa de um nome.')
          return
        }
        if (phase.stage_type === 'ai' && !trimRequiredString(phase.prompt)) {
          const label = phase.title.trim() || `Fase ${i + 1}`
          setFormError(
            `A fase "${label}" usa IA e precisa de um comando da IA (instrução para o modelo).`,
          )
          return
        }
      }
      stepsToSave = structurePhases.length
    } else {
      if (parsedSteps === null) {
        setFormError('default_total_steps_per_stage deve ser um inteiro.')
        return
      }
      if (parsedSteps < 0) {
        setFormError('default_total_steps_per_stage não pode ser negativo.')
        return
      }
      stepsToSave = parsedSteps
    }

    setSaving(true)
    setFormError(null)
    try {
      if (docId) {
        await updateTrail(docId, {
          name: trimmedName,
          description: trimmedDescription,
          subject: trimmedSubject,
          default_total_steps_per_stage: stepsToSave,
          active,
        })
        onSaved?.()
      } else {
        const targetTrailId =
          createdTrailId && createdTrailId.trim() ? createdTrailId : null

        const persistedId = await saveTrailWithStructure({
          targetTrailId,
          institution_id: instId,
          name: trimmedName,
          description: trimmedDescription,
          subject: trimmedSubject,
          default_total_steps_per_stage: stepsToSave,
          active,
          structurePhases,
        })

        if (persistedId) {
          setCreatedTrailId(persistedId)
          setCreateStep(3)
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!docId || !initial) return
    const ok = window.confirm(
      `Excluir a trilha "${initial.name || docId}"? Esta ação não pode ser desfeita.`,
    )
    if (!ok) return

    try {
      await deleteTrailCascade(docId)
      navigate('/')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erro ao excluir.')
    }
  }

  const createProgressPct = !isEdit ? `${(createStep / 3) * 100}%` : '0%'

  return (
    <section className="panel">
      {isEdit ? <h2>Editar cadastro</h2> : null}

      {!isEdit ? (
        <div className="trail-create-stepper-wrap">
          <div className="trail-create-stepper-progress" aria-hidden="true">
            <span
              className="trail-create-stepper-progress__fill"
              style={{ width: createProgressPct }}
            />
          </div>
          <div className="trail-create-stepper" aria-label="Progresso da criação da trilha">
            <div
              className={`trail-create-stepper__step ${createStep === 1 ? 'is-active' : createStep > 1 ? 'is-done' : ''}`}
            >
              <span className="trail-create-stepper__index">1</span>
              <span className="trail-create-stepper__label">Base da trilha</span>
            </div>
            <div className="trail-create-stepper__line" aria-hidden="true" />
            <div
              className={`trail-create-stepper__step ${createStep === 2 ? 'is-active' : createStep > 2 ? 'is-done' : ''}`}
            >
              <span className="trail-create-stepper__index">2</span>
              <span className="trail-create-stepper__label">Estrutura</span>
            </div>
            <div className="trail-create-stepper__line" aria-hidden="true" />
            <div className={`trail-create-stepper__step ${createStep === 3 ? 'is-active' : ''}`}>
              <span className="trail-create-stepper__index">3</span>
              <span className="trail-create-stepper__label">Conteúdos</span>
            </div>
          </div>
        </div>
      ) : null}

      {!isEdit && createStep === 3 && createdTrailId ? (
        <TrailContentEditor
          contentEtapas={contentEtapas}
          selectedEtapaId={selectedEtapaId}
          selectedQuestionId={selectedQuestionId}
          phaseSaved={phaseSaved}
          saving={savingContentDraft}
          error={formError}
          onAddEtapa={addEtapa}
          onRemoveEtapa={removeEtapa}
          onSelectEtapa={setSelectedEtapaId}
          onSelectQuestion={setSelectedQuestionId}
          onToggleEtapaReleased={toggleEtapaReleased}
          onUpdateQuestionTitle={updateQuestionTitle}
          onUpdateQuestionPhase={updateQuestionPhase}
          onMarkPhaseSaved={markPhaseSaved}
          onBack={() => setCreateStep(2)}
          onSave={() => void handleSaveAndContinue()}
          backLabel="← Voltar"
          saveLabel="Salvar e continuar →"
        />
      ) : (
        <form className="form trail-create-form" onSubmit={handleSubmit}>
        {isEdit || createStep === 1 ? (
          <>
            {!isEdit ? (
              <div className="trail-create-card__intro">
                <p className="trail-create-card__eyebrow">Etapa 1 de 3 • Informações básicas</p>
                <h3>Crie sua trilha de aprendizado</h3>
                <p className="muted">
                  Defina o ponto de partida da sua trilha. Depois você monta a estrutura de fases e,
                  na etapa final, os conteúdos (questões) de cada fase.
                </p>
              </div>
            ) : null}

            <div className={isEdit ? 'trail-create-card' : 'trail-create-grid'}>
              <div className="trail-create-card trail-create-card--form">
                {!isEdit ? (
                  <p className="trail-create-card__eyebrow">Etapa 1 de 3 • Informações básicas</p>
                ) : null}
                <label className="field">
                  <span>Nome da trilha</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Matemática Básica para o 6º ano"
                    autoComplete="organization"
                  />
                </label>

                <label className="field">
                  <span>Matéria ou tema principal</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Matemática"
                    autoComplete="off"
                  />
                </label>
                <label className="field">
                  <span>O que o aluno vai aprender nessa trilha?</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Ex: Revisão dos conceitos básicos de matemática, com foco em operações e resolução de problemas."
                  />
                </label>
              </div>

              {!isEdit ? (
                <aside className="trail-create-side">
                  <div className="trail-create-card__preview" aria-live="polite">
                    <p className="trail-create-card__preview-title">🖼️ Sua trilha</p>
                    {name.trim() ? (
                      <>
                        <p className="trail-create-card__preview-name">
                          <strong>📖 {name.trim()}</strong>
                        </p>
                        <p className="muted">📖 {subject.trim() || 'Matéria'}</p>
                        <p className="trail-create-card__preview-description muted">
                          ✨ <strong>O aluno vai aprender:</strong>
                          <br />
                          {previewDescription || 'Adicione uma descrição para completar a visão da trilha.'}
                        </p>
                      </>
                    ) : (
                      <p className="trail-create-card__preview-empty">Dê um nome para começar ✨</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary trail-create-cta"
                    onClick={handleNextCreateStep}
                  >
                    Continuar → Estruturar etapas
                  </button>
                </aside>
              ) : null}
            </div>
          </>
        ) : null}

        {isEdit || createStep === 2 ? (
          <>
            {!isEdit ? (
              <TrailStructureEditor
                structurePhases={structurePhases}
                active={active}
                onToggleActive={setActive}
                onAddPhase={addStructurePhase}
                onRemovePhase={removeStructurePhase}
                onUpdatePhase={updateStructurePhase}
                submitLabel="Definir conteúdos →"
                submitting={saving}
                submitButtonType="submit"
              />
            ) : (
              <div className="trail-create-card">
                <div className="trail-create-card__intro">
                  <h3>Configurações iniciais</h3>
                </div>
                <label className="field">
                  <span>Quantidade de itens em cada etapa</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={default_total_steps_per_stage}
                    onChange={(e) => setDefaultTotalStepsPerStage(e.target.value)}
                  />
                </label>
                <label className="field field--inline">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <span>Trilha ativa</span>
                </label>
              </div>
            )}
          </>
        ) : null}

        {formError ? (
          <p className="form__error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="form__actions">
          {isEdit ? (
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving
                ? 'Salvando…'
                : isEdit
                  ? 'Salvar alterações'
                  : 'Definir conteúdos →'}
            </button>
          ) : null}
          {!isEdit && createStep === 2 ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setCreateStep(1)}
              disabled={saving}
            >
              Card anterior
            </button>
          ) : null}
          {isEdit ? (
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleDelete}
              disabled={saving}
            >
              Excluir
            </button>
          ) : null}
        </div>
      </form>
      )}
    </section>
  )
}

