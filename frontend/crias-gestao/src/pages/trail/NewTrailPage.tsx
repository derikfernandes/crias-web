import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Banner, BootSymbol, ConfirmDialog, Icon, PageHead, Switch } from '../../design/gx/ui'
import { useCollection } from '../../hooks/useCollection'
import { useGestao } from '../../hooks/useGestao'
import { useGuardedNavigate, useUnsavedChanges } from '../../contexts/UnsavedContext'
import { snapshotToStudent } from '../../lib/studentFirestore'
import { blankActivity, type ActivityDraft } from '../../lib/trailActivities'
import { generateActivitiesWithAi } from '../../lib/trailAiApi'
import {
  DEFAULT_OBJECTIVE,
  DEFAULT_STRUCTURE,
  effectiveOrder,
  phasesFromConfig,
  type GenerationConfig,
  type StructureConfig,
} from '../../lib/trailConfig'
import { applyTrailStudentChanges, createTrailFromPreview } from '../../lib/trailOps'
import {
  CadastroSection,
  EstruturaSection,
  NumberOfActivities,
  ObjetivoSection,
  OrientacoesSection,
  Pencil,
  type CadastroValue,
} from './ConfigSections'
import { FilesPicker, type PickedFile } from './FilesPicker'
import { PreviewPanel } from './PreviewPanel'

type Stage = 'config' | 'preview' | 'students'

/** Linha só de uma linha, com o fim esmaecendo: resumo dos blocos recolhidos. */
function Summary({ children }: { children: string }) {
  return (
    <span data-fade="1" className="gx-muted" style={{ display: 'block', minWidth: 0 }}>
      {children}
    </span>
  )
}

/** Cabeçalho de bloco da Configuração: número, título e lápis quando recolhido (1.1.1.b, F). */
function BlockBar({
  n,
  title,
  ai,
  open,
  onToggle,
}: {
  n: string
  title: string
  ai?: boolean
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="gx-stepbar">
      <button type="button" className="gx-stepbar__title" onClick={onToggle} aria-expanded={open}>
        <span className="gx-stepbar__num">{n}</span>
        <strong>{title}</strong>
      </button>
      {ai ? <span className="gx-tag gx-tag--ai">IA</span> : null}
      {!open ? (
        <Pencil label={`Editar ${title}`} onClick={onToggle} />
      ) : (
        <button type="button" className="gx-roundarrow" aria-label={`Recolher ${title}`} title="Recolher" onClick={onToggle}>
          <Icon name="chev-up" size={16} />
        </button>
      )}
    </div>
  )
}

/**
 * Nova trilha (1.1.1.b): três etapas. Configuração (blocos Cadastro, Estrutura e Criar com IA), Prévia e
 * Adicionar alunos (opcional). "Criar trilha" gera a prévia; na Prévia "Salvar trilha" grava direto e "Adicionar alunos" (opcional) fica com contorno verde; só
 * "Salvar trilha" grava (trilha, atividades e alunos marcados). Cancelar pergunta "Tem certeza que deseja sair?".
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
  const [stage, setStage] = useState<Stage>('config')
  const [createConfirm, setCreateConfirm] = useState(false)
  const [open, setOpen] = useState<Set<number>>(new Set([1, 2, 3]))
  const [studentChanges, setStudentChanges] = useState<Map<string, boolean>>(new Map())
  const guardedNavigate = useGuardedNavigate()
  const allStudents = useCollection('students', snapshotToStudent)
  const [preview, setPreview] = useState<ActivityDraft[] | null>(null)
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
    feedback: structure.feedback,
    conclusive: structure.conclusive,
    activities,
    options: structure.options,
    skills,
    guidelines,
    filesText: files.length > 0 ? 'enviados' : '',
  }

  function toggleBlock(k: number) {
    seenRef.current[k] = false
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  }

  async function generate() {
    setError(null)
    if (!ready) return
    if (!useAi) {
      setPreview([blankActivity(1, phases, structure.options)])
      setStage('preview')
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
      setStage('preview')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'Não foi possível gerar a prévia.')
      }
    } finally {
      setGenerating(false)
    }
  }

  /** Grava a trilha, as atividades da prévia e os alunos marcados. Lança erro se falhar. */
  async function persistTrail(): Promise<void> {
    if (!preview || !institution) throw new Error('Crie a trilha antes de salvar.')
    const id = await createTrailFromPreview({
      institutionId: institution.id,
      name: cad.name,
      subject: cad.subject,
      description: cad.description,
      phases,
      activities: preview,
    })
    if (studentChanges.size > 0) {
      await applyTrailStudentChanges({ trailId: id, institutionId: institution.id, changes: studentChanges, links: [] })
    }
    navigate(`/trilhas/${id}?aba=content`, { replace: true })
  }

  async function saveTrail() {
    setSaving(true)
    setError(null)
    try {
      await persistTrail()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a trilha.')
      setSaving(false)
    }
  }

  const dirty = Boolean(cad.name.trim() || cad.subject.trim() || cad.description.trim() || skills.trim() || guidelines.trim() || files.length > 0 || preview)
  useUnsavedChanges(dirty && !saving, preview ? persistTrail : undefined)

  /*
   * Recolhimento pela rolagem (1.1.1.b, F): Cadastro e Estrutura recolhem quando a pessoa passou por eles inteiros
   * (a linha de baixo do bloco entrou na tela) e depois eles saíram inteiros pelo topo, sob o cabeçalho fixo.
   * Criar com IA recolhe quando a pessoa sobe e o bloco sai inteiro pela base da tela. A tela não pula: o que
   * o bloco recolhido deixou de ocupar é descontado da rolagem.
   */
  const seenRef = useRef<Record<number, boolean>>({})
  const pendingShift = useRef<number | null>(null)
  const lastTop = useRef(0)
  useEffect(() => {
    if (stage !== 'config') return
    const main = document.querySelector('.gx-main') as HTMLElement | null
    if (!main) return
    const onScroll = () => {
      const goingUp = main.scrollTop < lastTop.current
      lastTop.current = main.scrollTop
      if (pendingShift.current !== null) return
      const head = document.querySelector('.gx-head') as HTMLElement | null
      const headBottom = head ? head.getBoundingClientRect().bottom : main.getBoundingClientRect().top
      const viewBottom = main.getBoundingClientRect().bottom
      for (const n of [1, 2, 3]) {
        const el = document.getElementById(`bloco-${n}`)
        if (!el || !open.has(n)) continue
        const r = el.getBoundingClientRect()
        if (n < 3) {
          if (r.bottom <= viewBottom && r.bottom > headBottom) seenRef.current[n] = true
          if (seenRef.current[n] && r.bottom <= headBottom - 8) {
            seenRef.current[n] = false
            pendingShift.current = r.height
            setOpen((cur) => {
              const next = new Set(cur)
              next.delete(n)
              return next
            })
            return
          }
        } else {
          if (r.top < viewBottom) seenRef.current[3] = true
          if (goingUp && seenRef.current[3] && r.top >= viewBottom + 8) {
            seenRef.current[3] = false
            setOpen((cur) => {
              const next = new Set(cur)
              next.delete(3)
              return next
            })
            return
          }
        }
      }
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [stage, open])

  useLayoutEffect(() => {
    if (pendingShift.current === null) return
    const main = document.querySelector('.gx-main') as HTMLElement | null
    const before = pendingShift.current
    pendingShift.current = null
    if (!main) return
    // Altura que o bloco recolhido deixou de ocupar: só sobra o cabeçalho e o resumo.
    const collapsedBlocks = [1, 2].filter((n) => !open.has(n))
    const el = collapsedBlocks.length ? document.getElementById(`bloco-${collapsedBlocks[collapsedBlocks.length - 1]}`) : null
    const delta = before - (el?.getBoundingClientRect().height ?? 0)
    if (delta > 0) main.scrollTop = Math.max(0, main.scrollTop - delta)
  }, [open])

  if (g.institutionsLoading) return <BootSymbol />

  if (!institution) {
    return (
      <div className="gx-page">
        <PageHead title="Nova trilha" subtitle="Crie em poucos passos" />
        <Banner>Selecione uma instituição para criar a trilha.</Banner>
      </div>
    )
  }

  const trailName = cad.name.trim() || 'Nova trilha'

  /* Etapas do topo: Configuração e Prévia levam seta verde (só continuidade); Adicionar alunos só depois da Prévia. */
  const stageNav = (
    <nav className="gx-newstages" aria-label="Etapas da nova trilha">
      <button
        type="button"
        className="gx-newstage"
        aria-current={stage === 'config'}
        onClick={() => {
          // Voltar para a Configuração não pede confirmação; a Prévia fica inativa até tocar em Criar trilha de novo.
          setPreview(null)
          setStudentChanges(new Map())
          setStage('config')
        }}
      >
        Configuração
        <Icon name="chev-right" />
      </button>
      <button
        type="button"
        className="gx-newstage"
        aria-current={stage === 'preview'}
        disabled={!preview && !ready}
        onClick={() => (preview ? setStage('preview') : void generate())}
      >
        Prévia
        <Icon name="chev-right" />
      </button>
      <button type="button" className={stage === 'preview' ? 'gx-newstage gx-newstage--opt' : 'gx-newstage'} aria-current={stage === 'students'} disabled={!preview} onClick={() => setStage('students')}>
        Adicionar alunos <span className="gx-muted">(opcional)</span>
      </button>
    </nav>
  )

  const mainAction =
    stage === 'config' ? (
      <button
        type="button"
        className={ready && !generating ? 'gx-btn gx-btn--primary gx-btn--pulse' : 'gx-btn gx-btn--primary'}
        disabled={!ready || generating}
        onClick={() => void generate()}
      >
        {generating ? 'Gerando…' : 'Criar trilha'}
      </button>
    ) : stage === 'preview' ? (
      <button type="button" className="gx-btn gx-btn--primary gx-btn--pulse" disabled={saving} onClick={() => setCreateConfirm(true)}>
        {saving ? 'Salvando…' : 'Salvar trilha'}
      </button>
    ) : (
      <button type="button" className="gx-btn gx-btn--primary gx-btn--pulse" disabled={saving} onClick={() => setCreateConfirm(true)}>
        {saving ? 'Salvando…' : 'Salvar trilha'}
      </button>
    )

  const head = (
    <PageHead
      title={trailName}
      subtitle={`Crie em poucos passos · ${institution.name || institution.id}`}
      titleAction={
        <span className="gx-editbar">
          <button type="button" className="gx-btn" disabled={saving} onClick={() => guardedNavigate('/trilhas')}>
            Cancelar
          </button>
          {mainAction}
        </span>
      }
      tools={stageNav}
    />
  )
  const createDialog = (
    <ConfirmDialog
      open={createConfirm}
      title="Tem certeza que deseja criar a trilha?"
      text="A configuração de estrutura não poderá ser alterada depois."
      cancelLabel="Continuar editando"
      confirmLabel="Salvar"
      busy={saving}
      onCancel={() => setCreateConfirm(false)}
      onConfirm={() => {
        setCreateConfirm(false)
        void saveTrail()
      }}
    />
  )

  /* ---------- Prévia: lista de atividades e Resumo (1.1.1.b.41 a 1.1.1.b.43) ---------- */
  if (stage === 'preview' && preview) {
    const sub = [cad.subject.trim(), objective.trim()].filter(Boolean).join(' · ') || 'N/A'
    return (
      <div className="gx-page">
        {head}
        {createDialog}
        {error ? <Banner>{error}</Banner> : null}
        <PreviewPanel
          activities={preview}
          opts={{ feedback: structure.feedback !== false, conclusive: structure.conclusive !== false }}
          options={structure.options}
          name={cad.name.trim() || 'N/A'}
          sub={sub}
          title="Prévia da trilha"
          lede={
            useAi
              ? 'Confira as atividades geradas antes de salvar'
              : 'Sem habilidades, orientações ou arquivos: a trilha começa com a Atividade 1 em branco'
          }
        />
      </div>
    )
  }

  /* ---------- Adicionar alunos (opcional) ---------- */
  if (stage === 'students' && preview) {
    const list = allStudents.rows
      .filter((s) => s.institution_id === institution.id && s.active)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
    const on = (id: string) => studentChanges.get(id) === true
    const setAll = (value: boolean) => setStudentChanges(value ? new Map(list.map((s) => [s.id, true])) : new Map())
    return (
      <div className="gx-page">
        {head}
        {createDialog}
        {error ? <Banner>{error}</Banner> : null}
        <section className="gx-card" aria-label="Alunos da trilha">
          <div className="gx-card__head">
            <div>
              <h2>Ativar ou inativar alunos</h2>
              <p className="gx-muted">
                Os alunos ativados terão acesso à trilha assim que ela for salva. Você também pode fazer isso depois, na aba Alunos.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="gx-btn" onClick={() => setAll(true)}>
                Ativar todos
              </button>
              <button type="button" className="gx-btn" onClick={() => setAll(false)}>
                Inativar todos
              </button>
            </div>
          </div>
          <p className="gx-muted">
            {[...studentChanges.values()].filter(Boolean).length} de {list.length} ativados.
          </p>
          <div className="gx-scrollbox" data-sfade="y">
            {list.map((s) => (
              <div className="gx-togglerow" key={s.id}>
                <strong data-fade="1">{s.name || s.id}</strong>
                <span className="gx-muted" style={{ minWidth: 56 }}>
                  {s.id}
                </span>
                <Switch
                  checked={on(s.id)}
                  label={on(s.id) ? 'Ativo' : 'Inativo'}
                  onChange={(v) =>
                    setStudentChanges((prev) => {
                      const next = new Map(prev)
                      if (v) next.set(s.id, true)
                      else next.delete(s.id)
                      return next
                    })
                  }
                />
              </div>
            ))}
            {list.length === 0 ? <p className="gx-muted">Nenhum aluno ativo nesta instituição.</p> : null}
          </div>
        </section>
      </div>
    )
  }

  /* ---------- Configuração: três blocos ---------- */
  const cadSummary = [cad.name, cad.subject, cad.description].filter((x) => x.trim()).join(' · ')
  const structSummary = `${config.contents} conteúdo(s) + ${config.exercises} exercício(s) · ${structure.options} alternativas · ${activities} atividades`
  const aiSummary = [skills.trim() && `Habilidades: ${skills.trim()}`, guidelines.trim() && `Orientações: ${guidelines.trim()}`, files.length > 0 && `Arquivos: ${files.map((f) => f.file.name).join(', ')}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="gx-page">
      {head}
      {error ? <Banner>{error}</Banner> : null}

      <div className="gx-newblocks">
        <nav className="gx-newindex" aria-label="Índice">
          {[
            [1, 'Cadastro'],
            [2, 'Estrutura'],
            [3, 'Criar com IA'],
          ].map(([n, t]) => (
            <a
              key={n}
              href={`#bloco-${n}`}
              onClick={(e) => {
                e.preventDefault()
                setOpen((s) => new Set(s).add(n as number))
                document.getElementById(`bloco-${n}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
              }}
            >
              <span className="gx-stepbar__num">{`0${n}`}</span>
              {t}
            </a>
          ))}
          <p className="gx-muted">Defina as informações para criar com inteligência artificial.</p>
        </nav>

        <div className="gx-newcol">
          <section id="bloco-1" className="gx-card gx-cfgblock" aria-label="Cadastro">
            <BlockBar n="01" title="Cadastro" open={open.has(1)} onToggle={() => toggleBlock(1)} />
            {open.has(1) ? (
              <>
                <CadastroSection value={cad} onChange={setCad} readOnly={false} editing={false} hideHeader bar={null} />
                <ObjetivoSection value={objective} onChange={setObjective} readOnly={false} locked={false} editing={false} bar={null} />
              </>
            ) : (
              <Summary>{cadSummary}</Summary>
            )}
          </section>

          <section id="bloco-2" className="gx-card gx-cfgblock" aria-label="Estrutura">
            <BlockBar n="02" title="Estrutura" open={open.has(2)} onToggle={() => toggleBlock(2)} />
            {open.has(2) ? (
              <EstruturaSection
                value={structure}
                onChange={setStructure}
                locked={false}
                bar={null}
                extra={<NumberOfActivities value={activities} onChange={setActivities} />}
              />
            ) : (
              <Summary>{structSummary}</Summary>
            )}
          </section>

          <section id="bloco-3" className="gx-card gx-cfgblock" aria-label="Criar com IA">
            <BlockBar n="03" title="Criar com IA" ai open={open.has(3)} onToggle={() => toggleBlock(3)} />
            {open.has(3) ? (
              <>
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
                <OrientacoesSection value={guidelines} onChange={setGuidelines} locked={false} bar={<h3 className="gx-h">Orientações (opcional)</h3>} />
                <div>
                  <h3 className="gx-h">Arquivos (opcional)</h3>
                  <FilesPicker files={files} onChange={setFiles} />
                </div>
              </>
            ) : (
              <Summary>{aiSummary}</Summary>
            )}
          </section>

          <p className="gx-muted">
            {useAi
              ? 'A prévia será gerada por IA com o que você preencheu. Nada é gravado até "Salvar trilha".'
              : 'Sem habilidades, orientações ou arquivos a prévia começa em branco, só com a Atividade 1.'}
          </p>
        </div>
      </div>
    </div>
  )
}
