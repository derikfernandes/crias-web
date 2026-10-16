import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Banner, BootSymbol, Icon, PageHead } from '../../design/gx/ui'
import { useGestao } from '../../hooks/useGestao'
import { blankActivity, stepLabel, letterOf, type ActivityDraft } from '../../lib/trailActivities'
import { generateActivitiesWithAi } from '../../lib/trailAiApi'
import {
  DEFAULT_OBJECTIVE,
  DEFAULT_STRUCTURE,
  effectiveOrder,
  generationSummary,
  phasesFromConfig,
  type GenerationConfig,
  type StructureConfig,
} from '../../lib/trailConfig'
import { createTrailFromPreview } from '../../lib/trailOps'
import {
  CadastroSection,
  EstruturaSection,
  NumberOfActivities,
  ObjetivoSection,
  OrientacoesSection,
  StepBar,
  type CadastroValue,
} from './ConfigSections'
import { FilesPicker, type PickedFile } from './FilesPicker'

/**
 * Nova trilha (1.1.9): fluxo único, sempre por IA. Seis passos (Cadastro, Objetivo, Estrutura,
 * Habilidades, Orientações, Arquivos). "Gerar prévia" abre a Prévia; só "Salvar trilha" grava.
 * Com Habilidades, Orientações e Arquivos vazios não chama a IA: a prévia tem só a Atividade 1 em branco.
 */
export function NewTrailPage() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const g = useGestao()

  const institutionId =
    search.get('institution') ?? (g.scopedInstitutions.length === 1 ? g.scopedInstitutions[0].id : '')
  const institution = g.institutions.find((i) => i.id === institutionId) ?? null

  const [cad, setCad] = useState<CadastroValue>({ name: '', subject: '', description: '', active: false })
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE)
  const [structure, setStructure] = useState<StructureConfig>(DEFAULT_STRUCTURE)
  const [activities, setActivities] = useState(10)
  const [skills, setSkills] = useState('')
  const [guidelines, setGuidelines] = useState('')
  const [files, setFiles] = useState<PickedFile[]>([])
  const [open, setOpen] = useState<Set<number>>(new Set([1]))
  const [preview, setPreview] = useState<ActivityDraft[] | null>(null)
  const [previewOpen, setPreviewOpen] = useState<Set<number>>(new Set([0]))
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const phases = useMemo(() => phasesFromConfig(structure), [structure])
  const order = useMemo(() => effectiveOrder(structure), [structure])
  const useAi = skills.trim() !== '' || guidelines.trim() !== '' || files.length > 0
  const ready = cad.name.trim() !== '' && objective.trim() !== ''

  const config: GenerationConfig = {
    name: cad.name,
    subject: cad.subject,
    description: cad.description,
    objective,
    contents: order.filter((k) => k === 'c').length,
    exercises: order.filter((k) => k === 'e').length,
    order,
    activities,
    options: structure.options,
    skills,
    guidelines,
    filesText: files.length > 0 ? 'enviados' : '',
  }

  function setStep(k: number, on: boolean) {
    if (k < 1 || k > 6) return
    setOpen((s) => {
      const n = new Set(s)
      if (on) n.add(k)
      else n.delete(k)
      return n
    })
  }

  async function generate() {
    setError(null)
    if (!ready) return
    if (!useAi) {
      setPreview([blankActivity(1, phases, structure.options)])
      setPreviewOpen(new Set([0]))
      return
    }
    setGenerating(true)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const result = await generateActivitiesWithAi({
        mode: 'new',
        config,
        files: files.map((f) => f.file),
        signal: ctrl.signal,
      })
      setPreview(result)
      setPreviewOpen(new Set([0]))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'Não foi possível gerar a prévia.')
      }
    } finally {
      setGenerating(false)
    }
  }

  async function saveTrail() {
    if (!preview || !institution) return
    setSaving(true)
    setError(null)
    try {
      const id = await createTrailFromPreview({
        institutionId: institution.id,
        name: cad.name,
        subject: cad.subject,
        description: cad.description,
        objective: objective.trim(),
        guidelines: guidelines.trim(),
        optionsCount: structure.options,
        phases,
        activities: preview,
      })
      navigate(`/trilhas/${id}?aba=content`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a trilha.')
      setSaving(false)
    }
  }

  if (g.institutionsLoading) return <BootSymbol />

  if (!institution) {
    return (
      <div className="gx-page">
        <PageHead title="Nova trilha" subtitle="Crie em poucos passos" />
        <Banner>Selecione uma instituição para criar a trilha.</Banner>
      </div>
    )
  }

  /* ---------- Prévia ---------- */
  if (preview) {
    const summary = generationSummary(config)
    return (
      <div className="gx-page">
        <PageHead
          title={cad.name || 'Nova trilha'}
          subtitle="Prévia: revise antes de salvar. Nada foi gravado ainda."
          titleAction={
            <button
              type="button"
              className="gx-btn gx-btn--primary gx-btn--pulse"
              disabled={saving}
              onClick={() => void saveTrail()}
            >
              {saving ? 'Salvando…' : 'Salvar trilha'}
            </button>
          }
          tools={
            <nav role="tablist" aria-label="Seções da trilha" className="gx-tabs">
              <button type="button" role="tab" className="gx-tab" aria-selected={false} onClick={() => setPreview(null)}>
                Configuração
              </button>
              <button type="button" role="tab" className="gx-tab" aria-selected>
                Prévia
              </button>
            </nav>
          }
        />
        {error ? <Banner>{error}</Banner> : null}
        <section className="gx-card" aria-label="Configuração de geração">
          <h2>Configuração de geração</h2>
          <dl className="gx-info">
            {summary.map((it) => (
              <div key={it.k}>
                <dt>{it.k}</dt>
                <dd>{it.v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="gx-card" aria-label="Atividades da prévia">
          <div className="gx-card__head">
            <div>
              <h2>Prévia da trilha</h2>
              <p className="gx-muted">
                {useAi
                  ? 'Atividades geradas pela IA com a configuração acima.'
                  : 'Sem habilidades, orientações ou arquivos: a trilha começa com a Atividade 1 em branco.'}
              </p>
            </div>
            <button type="button" className="gx-btn" onClick={() => setPreview(null)}>
              Voltar e ajustar
            </button>
          </div>
          <ol className="gx-list">
            {preview.map((a, i) => {
              const isOpen = previewOpen.has(i)
              return (
                <li className="gx-acc" key={a.number}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setPreviewOpen((s) => {
                        const n = new Set(s)
                        if (n.has(i)) n.delete(i)
                        else n.add(i)
                        return n
                      })
                    }
                  >
                    <span className="gx-num">{a.number}</span>
                    <strong data-fade="1" style={{ flex: 1, minWidth: 0, fontSize: 15 }}>
                      {a.title || `Atividade ${a.number}`}
                    </strong>
                    <span style={{ display: 'flex', gap: 3 }} aria-hidden="true">
                      {a.steps.map((s, k) => (
                        <span key={k} className={`gx-swatch gx-swatch--${s.kind}`} style={{ width: 9, height: 9 }} />
                      ))}
                    </span>
                    {useAi ? <span className="gx-tag gx-tag--ai">IA</span> : null}
                    <Icon name={isOpen ? 'chev-up' : 'chev-down'} />
                  </button>
                  {isOpen ? (
                    <div>
                      {a.steps.map((s, k) => (
                        <div className="gx-step" key={k}>
                          <div className="gx-step__top">
                            <span>Etapa {k + 1}</span>
                            <span className={s.kind === 'e' ? 'gx-pill gx-pill--warn' : 'gx-pill'}>
                              {s.kind === 'e' ? 'Exercício' : 'Conteúdo'}
                            </span>
                          </div>
                          <strong className="gx-step__title">{stepLabel(a.steps, k)}</strong>
                          <p className="gx-step__body">
                            {s.content ||
                              (useAi ? 'N/A' : 'Conteúdo em branco. Preencha depois, na aba Conteúdo.')}
                          </p>
                          {s.kind === 'e' && s.options.some(Boolean) ? (
                            <ul className="gx-list">
                              {s.options.map((o, oi) => (
                                <li key={oi} className="gx-step__body">
                                  {letterOf(oi)}) {o}
                                  {s.correct === letterOf(oi) ? ' ✓' : ''}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    )
  }

  /* ---------- Passos ---------- */
  const bar = (n: number, title: string, small?: string, ai?: boolean) => (
    <StepBar
      n={n}
      title={title}
      small={small}
      ai={ai}
      open={open.has(n)}
      onToggle={() => setStep(n, true)}
      onUp={() => setStep(n, false)}
      onDown={() => setStep(n + 1, true)}
      last={n === 6}
    />
  )

  return (
    <div className="gx-page">
      <PageHead
        title="Nova trilha"
        subtitle={`Crie em poucos passos · ${institution.name || institution.id}`}
        titleAction={
          <button
            type="button"
            className={ready && !generating ? 'gx-btn gx-btn--primary gx-btn--pulse' : 'gx-btn gx-btn--primary'}
            disabled={!ready || generating}
            onClick={() => void generate()}
          >
            {generating ? 'Gerando…' : 'Gerar prévia'}
          </button>
        }
      />
      {error ? <Banner>{error}</Banner> : null}

      <CadastroSection
        value={cad}
        onChange={setCad}
        readOnly={false}
        editing={false}
        hideHeader
        bar={bar(1, 'Cadastro')}
      />
      {open.has(2) ? (
        <ObjetivoSection value={objective} onChange={setObjective} readOnly={false} locked={false} editing={false} bar={bar(2, 'Objetivo', 'recomendado')} />
      ) : (
        <section className="gx-card">{bar(2, 'Objetivo', 'recomendado')}</section>
      )}
      {open.has(3) ? (
        <EstruturaSection
          value={structure}
          onChange={setStructure}
          locked={false}
          bar={bar(3, 'Estrutura', 'padrão')}
          extra={<NumberOfActivities value={activities} onChange={setActivities} />}
        />
      ) : (
        <section className="gx-card">{bar(3, 'Estrutura', 'padrão')}</section>
      )}
      <section className="gx-card" aria-label="Habilidades">
        {bar(4, 'Habilidades', 'opcional', true)}
        {open.has(4) ? (
          <label className="gx-field">
            <span>Habilidades ou conteúdos que as atividades devem trabalhar</span>
            <textarea
              className="gx-textarea"
              rows={4}
              value={skills}
              placeholder="Ex.: Calcular porcentagem de um valor. Resolver problemas com frações."
              onChange={(e) => setSkills(e.target.value)}
            />
          </label>
        ) : null}
      </section>
      {open.has(5) ? (
        <OrientacoesSection
          value={guidelines}
          onChange={setGuidelines}
          locked={false}
          bar={bar(5, 'Orientações', 'opcional', true)}
        />
      ) : (
        <section className="gx-card">{bar(5, 'Orientações', 'opcional', true)}</section>
      )}
      <section className="gx-card" aria-label="Arquivos">
        {bar(6, 'Arquivos', 'opcional', true)}
        {open.has(6) ? <FilesPicker files={files} onChange={setFiles} /> : null}
      </section>
      <p className="gx-muted">
        {useAi
          ? 'A prévia será gerada por IA com o que você preencheu. Nada é gravado até "Salvar trilha".'
          : 'Sem habilidades, orientações ou arquivos a prévia começa em branco, só com a Atividade 1.'}
      </p>
    </div>
  )
}
