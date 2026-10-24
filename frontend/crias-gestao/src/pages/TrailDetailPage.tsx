import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Banner,
  BootSymbol,
  DeletarDialog,
  Dialog,
  PageHead,
} from '../design/gx/ui'
import { deleteTrailCascade } from '../lib/trailApi'
import {
  phasesFromConfig,
  type GenerationConfig,
  type StructureConfig,
} from '../lib/trailConfig'
import {
  applyTrailStudentChanges,
  patchTrail,
  saveCorrectOptions,
  saveTrailConfig,
} from '../lib/trailOps'
import { usePermissions } from '../hooks/usePermissions'
import { useGestao } from '../hooks/useGestao'
import {
  CadastroSection,
  EstruturaSection,
  type CadastroValue,
} from './trail/ConfigSections'
import { ContentTab } from './trail/ContentTab'
import { GabaritoTab, type GabaritoDrafts } from './trail/GabaritoTab'
import { StudentsTab, type StudentChanges } from './trail/StudentsTab'
import { useTrailData } from './trail/useTrailData'
import { NewTrailPage } from './trail/NewTrailPage'

type Tab = 'config' | 'content' | 'students' | 'gabarito'

const TABS: Array<[Tab, string]> = [
  ['config', 'Configuração'],
  ['content', 'Conteúdo'],
  ['students', 'Alunos'],
  ['gabarito', 'Gabarito'],
]

function sameStructure(a: StructureConfig, b: StructureConfig): boolean {
  return (
    a.options === b.options &&
    JSON.stringify(phasesFromConfig(a).map((p) => p.stage_type)) ===
      JSON.stringify(phasesFromConfig(b).map((p) => p.stage_type))
  )
}

/** Trilha aberta: Configuração, Conteúdo, Alunos e Gabarito (INTERFACE.md 1.1.9). */
export function TrailDetailPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <NewTrailPage />
  return <OpenTrail key={id} id={id} />
}

function OpenTrail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const g = useGestao()
  const { canNav } = usePermissions()
  const data = useTrailData(id)
  const { trail } = data
  const tab = (search.get('aba') as Tab) || 'config'
  const setTab = (t: Tab) => setSearch({ aba: t }, { replace: true })

  const [cad, setCad] = useState<CadastroValue>({ name: '', subject: '', description: '', active: false })
  const [cadEditing, setCadEditing] = useState(false)
  const [structure, setStructure] = useState<StructureConfig>(data.config)
  const [studentChanges, setStudentChanges] = useState<StudentChanges>(new Map())
  const [drafts, setDrafts] = useState<GabaritoDrafts>(new Map())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [activateConfirm, setActivateConfirm] = useState(false)

  // Sincroniza os rascunhos com o que está salvo, enquanto o usuário não está editando.
  useEffect(() => {
    if (!trail) return
    if (!cadEditing) {
      setCad({ name: trail.name, subject: trail.subject, description: trail.description, active: trail.active })
    }
  }, [trail, cadEditing])
  useEffect(() => {
    if (!trail) return
    setStructure(data.config)
  }, [trail?.updated_at?.toMillis?.(), data.config.options, data.stages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const locked = Boolean(trail?.active)
  const cfgDirty = !sameStructure(structure, data.config)

  const headerDirty =
    tab === 'config' ? cfgDirty && !locked : tab === 'students' ? studentChanges.size > 0 : tab === 'gabarito' ? drafts.size > 0 : false

  async function guard(fn: () => Promise<void>, ok?: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await fn()
      if (ok) setNotice(ok)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  function headerSave() {
    if (!trail || !headerDirty) return
    if (tab === 'config') {
      void guard(async () => {
        await saveTrailConfig({
          trailId: id,
          phases: phasesFromConfig(structure),
          existingCells: data.cells,
        })
      }, 'Configuração salva.')
    } else if (tab === 'students') {
      void guard(async () => {
        const r = await applyTrailStudentChanges({
          trailId: id,
          institutionId: trail.institution_id,
          changes: studentChanges,
          links: data.links,
        })
        setStudentChanges(new Map())
        setNotice(`Alunos atualizados: ${r.created + r.activated} ativado(s), ${r.deactivated} inativado(s).`)
      })
    } else if (tab === 'gabarito') {
      void guard(async () => {
        await saveCorrectOptions(drafts)
        setDrafts(new Map())
      }, 'Gabarito salvo.')
    }
  }

  const buildConfig = useMemo(
    () =>
      (extra: { activities: number; objective: string; skills: string; guidelines: string; filesText: string }): GenerationConfig => {
        const order = phasesFromConfig(data.config).map((p) => (p.stage_type === 'exercise' ? ('e' as const) : ('c' as const)))
        return {
          name: trail?.name ?? '',
          subject: trail?.subject ?? '',
          description: trail?.description ?? '',
          objective: extra.objective,
          contents: order.filter((k) => k === 'c').length,
          exercises: order.filter((k) => k === 'e').length,
          order,
          activities: extra.activities,
          options: data.config.options,
          skills: extra.skills,
          guidelines: extra.guidelines,
          filesText: extra.filesText,
        }
      },
    [data.config, trail],
  )

  if (!data.ready || g.institutionsLoading) return <BootSymbol />
  if (!trail) {
    return (
      <div className="gx-page">
        <PageHead title="Trilha não encontrada" subtitle="A trilha não existe mais ou foi excluída." />
      </div>
    )
  }
  if (!g.institutions.some((i) => i.id === trail.institution_id) && !canNav('trail_new')) {
    return (
      <div className="gx-page">
        <PageHead title="Sem acesso" subtitle="Você não tem acesso a esta trilha." />
      </div>
    )
  }

  const saveLabel = tab === 'gabarito' ? 'Salvar' : 'Salvar'
  // Configuração ativa = somente visualização: sem Salvar no topo.
  const showSave = tab !== 'content' && !(tab === 'config' && locked)
  const cadChanged =
    cad.name.trim() !== trail.name.trim() ||
    cad.subject.trim() !== trail.subject.trim() ||
    cad.description.trim() !== trail.description.trim() ||
    cad.active !== trail.active

  async function saveCadastro() {
    if (!trail) return
    await guard(async () => {
      await patchTrail(id, {
        name: cad.name.trim(),
        subject: cad.subject.trim(),
        description: cad.description.trim(),
        active: cad.active,
      })
      setCadEditing(false)
    }, 'Cadastro salvo.')
  }

  return (
    <div className="gx-page">
      <PageHead
        title={trail.name || trail.id}
        subtitle={`${g.institutionName(trail.institution_id)}${trail.subject ? ` · ${trail.subject}` : ''}`}
        titleAction={
          showSave ? (
            <button
              type="button"
              className={headerDirty ? 'gx-btn gx-btn--primary gx-btn--pulse' : 'gx-btn gx-btn--primary'}
              disabled={!headerDirty || busy}
              onClick={headerSave}
            >
              {saveLabel}
            </button>
          ) : null
        }
        tools={
          <nav role="tablist" aria-label="Seções da trilha" className="gx-tabs">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                role="tab"
                type="button"
                className="gx-tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        }
      />
      {data.error ? <Banner>{data.error}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}

      {tab === 'config' ? (
        <>
          <CadastroSection
            value={cad}
            onChange={setCad}
            readOnly={!cadEditing}
            editing={cadEditing}
            onEdit={() => setCadEditing(true)}
            onCancel={() => {
              setCad({ name: trail.name, subject: trail.subject, description: trail.description, active: trail.active })
              setCadEditing(false)
            }}
            onSave={() => {
              if (cad.active && !trail.active) setActivateConfirm(true)
              else void saveCadastro()
            }}
            saveDisabled={!cadChanged || !cad.name.trim() || busy}
            meta={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 13, color: 'var(--v-t3)' }}>
                <span>Criada em {trail.created_at?.toDate?.().toLocaleDateString('pt-BR') ?? 'N/A'}</span>
                <span>Atualizada em {trail.updated_at?.toDate?.().toLocaleDateString('pt-BR') ?? 'N/A'}</span>
                <button
                  type="button"
                  className="gx-linkbtn"
                  style={{ color: 'var(--v-err)', marginLeft: 'auto' }}
                  onClick={() => setDeleteOpen(true)}
                >
                  Excluir trilha
                </button>
              </div>
            }
          />
          <EstruturaSection value={structure} onChange={setStructure} locked={locked} />
        </>
      ) : null}

      {tab === 'content' ? (
        <ContentTab
          trail={trail}
          trailId={id}
          activities={data.activities}
          cells={data.cells}
          phases={data.phases}
          optionCount={data.config.options}
          buildConfig={buildConfig}
        />
      ) : null}

      {tab === 'students' ? (
        <StudentsTab
          trailId={id}
          students={data.students}
          links={data.links}
          activities={data.activities}
          phases={data.phases}
          changes={studentChanges}
          onChanges={setStudentChanges}
          busy={busy}
          onApplyMass={async (mass) => {
            await guard(async () => {
              const r = await applyTrailStudentChanges({
                trailId: id,
                institutionId: trail.institution_id,
                changes: mass,
                links: data.links,
              })
              setNotice(`Alunos da trilha alterados em lote: ${r.created + r.activated} ativado(s), ${r.deactivated} inativado(s).`)
            })
          }}
        />
      ) : null}

      {tab === 'gabarito' ? (
        <GabaritoTab
          cells={data.cells}
          phases={data.phases}
          optionCount={data.config.options}
          drafts={drafts}
          onDrafts={setDrafts}
        />
      ) : null}

      <DeletarDialog
        open={deleteOpen}
        title="Deseja mesmo excluir a trilha?"
        busy={busy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() =>
          void guard(async () => {
            await deleteTrailCascade(id)
            setDeleteOpen(false)
            navigate('/trilhas', { replace: true })
          })
        }
      />
      <Dialog
        open={activateConfirm}
        title="Ativar a trilha?"
        onClose={() => setActivateConfirm(false)}
        actions={
          <>
            <button type="button" className="gx-btn" onClick={() => setActivateConfirm(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="gx-btn gx-btn--primary"
              onClick={() => {
                setActivateConfirm(false)
                void saveCadastro()
              }}
            >
              Ativar
            </button>
          </>
        }
      >
        <p>Com a trilha ativa, Objetivo, Estrutura e Orientações ficam bloqueados (somente visualização).</p>
      </Dialog>
    </div>
  )
}
