import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchDefaultAiTrailPrompt,
  generateAiTrailFromFiles,
  type AiTrailDraft,
} from '../lib/aiTrailGenerateApi'
import { trailPath } from '../lib/paths'
import {
  saveTrailContentDraft,
  saveTrailWithStructure,
} from '../lib/public/trails'
import type { ContentEtapa, StructurePhase } from '../lib/trailEditor'

type Step = 'upload' | 'prompt' | 'generating' | 'review'

type Props = {
  institutionId: string
  onCancel: () => void
}

const ACCEPTED =
  '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown'

export function TrailAiCreateWizard({ institutionId, onCancel }: Props) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [prompt, setPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [draft, setDraft] = useState<AiTrailDraft | null>(null)
  const [rawTrail, setRawTrail] = useState<unknown>(null)
  const [model, setModel] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [meta, setMeta] = useState<{
    truncated?: boolean
    chars?: number
    repaired?: boolean
  }>({})

  useEffect(() => {
    let cancelled = false
    setPromptLoading(true)
    fetchDefaultAiTrailPrompt()
      .then((text) => {
        if (!cancelled) setPrompt(text)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Falha ao carregar prompt padrão.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setPromptLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fileSummary = useMemo(
    () =>
      files.map((f) => `${f.name} (${Math.round(f.size / 1024)} KB)`).join(', '),
    [files],
  )

  function onPickFiles(list: FileList | null) {
    if (!list) return
    const next = Array.from(list)
    setFiles(next)
    setError(null)
  }

  function goPrompt() {
    if (files.length === 0) {
      setError('Envie pelo menos um documento (PDF, DOCX ou TXT/MD).')
      return
    }
    setError(null)
    setStep('prompt')
  }

  async function runGenerate() {
    setError(null)
    setIssues([])
    setStep('generating')
    try {
      const result = await generateAiTrailFromFiles({ files, prompt })
      setModel(result.model ?? '')
      setMeta({
        truncated: result.truncatedSources,
        chars: result.totalSourceChars,
        repaired: result.repaired,
      })
      setRawTrail(result.trail ?? null)
      if (!result.ok || !result.draft) {
        setIssues((result.issues ?? []).map((i) => i.message))
        setError(result.error ?? 'A geração não passou na validação.')
        setDraft(null)
        setStep('prompt')
        return
      }
      setDraft(result.draft)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar trilha.')
      setStep('prompt')
    }
  }

  function updateDraftName(value: string) {
    setDraft((prev) => (prev ? { ...prev, name: value } : prev))
  }

  function updateDraftDescription(value: string) {
    setDraft((prev) => (prev ? { ...prev, description: value } : prev))
  }

  function updateDraftSubject(value: string) {
    setDraft((prev) => (prev ? { ...prev, subject: value } : prev))
  }

  async function confirmSave() {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const structurePhases: StructurePhase[] = draft.structurePhases.map(
        (p, idx) => ({
          id: p.id || `p-${idx + 1}`,
          title: p.title,
          stage_type: p.stage_type,
          prompt: p.prompt ?? '',
        }),
      )
      const contentEtapas: ContentEtapa[] = draft.contentEtapas

      const trailId = await saveTrailWithStructure({
        targetTrailId: null,
        institution_id: institutionId,
        name: draft.name.trim(),
        description: draft.description.trim(),
        subject: draft.subject.trim(),
        default_total_steps_per_stage: structurePhases.length,
        active: draft.active ?? true,
        structurePhases,
      })
      if (!trailId) {
        throw new Error('Não foi possível criar a trilha (Firebase indisponível).')
      }
      await saveTrailContentDraft(trailId, contentEtapas)
      navigate(trailPath(trailId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a trilha.')
      setSaving(false)
    }
  }

  return (
    <section className="panel trail-ai-wizard" data-testid="trail-ai-wizard">
      <header className="trail-ai-wizard__header">
        <h2>Criar trilha com IA</h2>
        <p className="muted">
          Envie documentos, revise o prompt, gere a arquitetura e confirme antes
          de salvar. A trilha será criada como <strong>nova</strong> — nada
          existente é sobrescrito.
        </p>
        <ol className="trail-ai-wizard__steps" aria-label="Passos">
          <li className={step === 'upload' ? 'is-active' : ''}>1. Documentos</li>
          <li
            className={
              step === 'prompt' || step === 'generating' ? 'is-active' : ''
            }
          >
            2. Prompt
          </li>
          <li className={step === 'review' ? 'is-active' : ''}>3. Revisão</li>
        </ol>
      </header>

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}
      {issues.length > 0 ? (
        <div className="banner banner--error">
          <strong>Problemas de validação</strong>
          <ul>
            {issues.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === 'upload' ? (
        <div className="trail-ai-wizard__body" data-testid="trail-ai-upload">
          <label className="field">
            <span>Documentos (PDF, DOCX, TXT ou MD)</span>
            <input
              type="file"
              multiple
              accept={ACCEPTED}
              onChange={(e) => onPickFiles(e.target.files)}
            />
          </label>
          {files.length > 0 ? (
            <p className="muted">Selecionados: {fileSummary}</p>
          ) : (
            <p className="muted">
              Limite sugerido: até 8 arquivos, 4&nbsp;MB cada. Textos muito longos
              são truncados no servidor.
            </p>
          )}
          <div className="panel__actions">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Voltar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={goPrompt}
              disabled={files.length === 0}
            >
              Continuar →
            </button>
          </div>
        </div>
      ) : null}

      {step === 'prompt' || step === 'generating' ? (
        <div className="trail-ai-wizard__body" data-testid="trail-ai-prompt">
          <label className="field">
            <span>Prompt (editável)</span>
            <textarea
              rows={16}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={promptLoading || step === 'generating'}
              className="trail-ai-wizard__prompt"
            />
          </label>
          <p className="muted">
            Fontes desta geração: {fileSummary || 'nenhum arquivo'}.
          </p>
          <div className="panel__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setStep('upload')}
              disabled={step === 'generating'}
            >
              ← Documentos
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void runGenerate()}
              disabled={step === 'generating' || !prompt.trim()}
            >
              {step === 'generating' ? 'Gerando… (pode levar alguns minutos)' : 'Gerar trilha'}
            </button>
          </div>
          {step === 'generating' ? (
            <p className="banner banner--info" role="status">
              Chamando o modelo… aguarde. Não feche esta página.
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 'review' && draft ? (
        <div className="trail-ai-wizard__body" data-testid="trail-ai-review">
          <p className="muted">
            Modelo: <code>{model || '—'}</code>
            {meta.repaired ? ' · corrigido automaticamente uma vez' : ''}
            {meta.truncated ? ` · fontes truncadas (${meta.chars} chars)` : ''}
          </p>

          <div className="trail-ai-wizard__meta-fields">
            <label className="field">
              <span>Nome</span>
              <input
                value={draft.name}
                onChange={(e) => updateDraftName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Matéria / tema</span>
              <input
                value={draft.subject}
                onChange={(e) => updateDraftSubject(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Objetivo / descrição</span>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(e) => updateDraftDescription(e.target.value)}
              />
            </label>
          </div>

          <h3>Arquitetura ({draft.structurePhases.length} fases)</h3>
          <ol className="trail-ai-wizard__phase-list">
            {draft.structurePhases.map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong>{' '}
                <span className="muted">({p.stage_type})</span>
                {p.stage_type === 'ai' && p.prompt ? (
                  <details>
                    <summary>Comando global</summary>
                    <pre className="trail-ai-wizard__pre">{p.prompt}</pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>

          <h3>Etapas ({draft.contentEtapas.length})</h3>
          <div className="trail-ai-wizard__etapas">
            {draft.contentEtapas.map((et) => (
              <article key={et.id} className="trail-ai-wizard__etapa">
                <h4>{et.name}</h4>
                {(et.questions[0]?.phases ?? []).map((ph) => (
                  <details key={ph.phaseId}>
                    <summary>
                      {ph.phaseTitle}{' '}
                      <span className="muted">({ph.phaseType})</span>
                      {ph.phaseType === 'exercise' && ph.correctOption
                        ? ` · gabarito ${ph.correctOption}`
                        : ''}
                    </summary>
                    <pre className="trail-ai-wizard__pre">{ph.fixedText}</pre>
                  </details>
                ))}
              </article>
            ))}
          </div>

          <div className="panel__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setDraft(null)
                setStep('prompt')
              }}
              disabled={saving}
            >
              Descartar / regenerar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void confirmSave()}
              disabled={saving || !draft.name.trim()}
            >
              {saving ? 'Salvando…' : 'Confirmar e salvar trilha nova'}
            </button>
          </div>
          {rawTrail ? (
            <details className="trail-ai-wizard__raw">
              <summary>JSON gerado (debug)</summary>
              <pre className="trail-ai-wizard__pre">
                {JSON.stringify(rawTrail, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
