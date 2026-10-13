import { useEffect, useId, useMemo, useRef, useState } from 'react'
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

const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md'])

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileKey(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`
}

function isAcceptedDocument(file: File): boolean {
  const name = file.name.toLowerCase()
  const ext = name.includes('.') ? `.${name.split('.').pop() ?? ''}` : ''
  if (ACCEPTED_EXTENSIONS.has(ext)) return true
  return (
    file.type === 'application/pdf' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'text/plain' ||
    file.type === 'text/markdown'
  )
}

export function TrailAiCreateWizard({ institutionId, onCancel }: Props) {
  const navigate = useNavigate()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [promptLoadError, setPromptLoadError] = useState<string | null>(null)
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
          setPromptLoadError(
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
      files.map((f) => `${f.name} (${formatFileSize(f.size)})`).join(', '),
    [files],
  )

  function mergeFiles(incoming: File[]) {
    const accepted = incoming.filter(isAcceptedDocument)
    if (accepted.length === 0) {
      setError('Envie arquivos PDF, DOCX, TXT ou MD.')
      return
    }
    setFiles((prev) => {
      const seen = new Set(prev.map(fileKey))
      const next = [...prev]
      for (const file of accepted) {
        const key = fileKey(file)
        if (seen.has(key)) continue
        seen.add(key)
        next.push(file)
      }
      return next
    })
    setError(null)
  }

  function onPickFiles(list: FileList | null) {
    if (!list) return
    mergeFiles(Array.from(list))
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function clearFiles() {
    setFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
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
          <div className="field">
            <span id={`${fileInputId}-label`}>
              Documentos (PDF, DOCX, TXT ou MD)
            </span>
            <div
              className={[
                'trail-ai-dropzone',
                dragging ? 'is-dragging' : '',
                files.length > 0 ? 'has-files' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return
                fileInputRef.current?.click()
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragging(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (e.currentTarget.contains(e.relatedTarget as Node)) return
                setDragging(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragging(false)
                onPickFiles(e.dataTransfer.files)
              }}
            >
              <input
                ref={fileInputRef}
                id={fileInputId}
                className="trail-ai-dropzone__input"
                type="file"
                multiple
                accept={ACCEPTED}
                aria-labelledby={`${fileInputId}-label`}
                onChange={(e) => {
                  onPickFiles(e.target.files)
                  e.currentTarget.value = ''
                }}
              />
              <div className="trail-ai-dropzone__icon" aria-hidden="true">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5" />
                  <path d="M12 17V11" />
                  <path d="M9.5 13.5 12 11l2.5 2.5" />
                </svg>
              </div>
              <p className="trail-ai-dropzone__title">
                Arraste os documentos aqui
              </p>
              <p className="trail-ai-dropzone__hint muted">
                ou escolha no computador — PDF, DOCX, TXT ou MD
              </p>
              <button
                type="button"
                className="btn btn--ghost trail-ai-dropzone__browse"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Escolher arquivos
              </button>
            </div>
          </div>

          {files.length > 0 ? (
            <div className="trail-ai-file-list">
              <div className="trail-ai-file-list__head">
                <strong>
                  {files.length}{' '}
                  {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                </strong>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={clearFiles}
                >
                  Limpar
                </button>
              </div>
              <ul className="trail-ai-file-list__items">
                {files.map((file, index) => (
                  <li key={fileKey(file)} className="trail-ai-file-list__item">
                    <span className="trail-ai-file-list__name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="trail-ai-file-list__size muted">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small trail-ai-file-list__remove"
                      onClick={() => removeFile(index)}
                      aria-label={`Remover ${file.name}`}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="muted trail-ai-wizard__upload-note">
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
          {promptLoadError ? (
            <p className="banner banner--error" role="alert">
              {promptLoadError}
            </p>
          ) : null}
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
