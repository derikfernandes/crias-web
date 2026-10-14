import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrailAiCreateWizard } from '../components/TrailAiCreateWizard'
import { TrailForm } from '../components/TrailForm'
import { TrailNewPageView } from '../design/views/TrailNewPageView'
import { usePermissions } from '../hooks/usePermissions'
import { db } from '../lib/firebase'
import { INSTITUTIONS_COLLECTION } from '../lib/institutionFirestore'
import { collection, onSnapshot } from 'firebase/firestore'

const LAST_INSTITUTION_ID_STORAGE_KEY = 'trilha_admin_selected_institution_id'

type CreateMode = 'choose' | 'manual' | 'ai'

export function TrailNewPage() {
  const { filterInstitutions } = usePermissions()
  const [searchParams] = useSearchParams()
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>(
    [],
  )
  const [mode, setMode] = useState<CreateMode>('choose')

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(collection(db, INSTITUTIONS_COLLECTION), (snap) => {
      const next = snap.docs.map((d) => {
        const data = d.data()
        const nm =
          typeof (data as Record<string, unknown>).name === 'string'
            ? ((data as Record<string, unknown>).name as string)
            : ''
        return { id: d.id, name: nm }
      })
      next.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      setInstitutions(filterInstitutions(next))
    })

    return () => unsub()
  }, [filterInstitutions])

  const effectiveInstitutionId = useMemo(() => {
    const fromQuery = (searchParams.get('institution_id') ?? '').trim()
    if (fromQuery) return fromQuery

    const fromStorage = window.localStorage
      .getItem(LAST_INSTITUTION_ID_STORAGE_KEY)
      ?.trim()
    if (fromStorage) return fromStorage

    return institutions.length === 1 ? institutions[0].id : ''
  }, [institutions, searchParams])

  useEffect(() => {
    if (!effectiveInstitutionId) return
    window.localStorage.setItem(
      LAST_INSTITUTION_ID_STORAGE_KEY,
      effectiveInstitutionId,
    )
  }, [effectiveInstitutionId])

  const selectedInstitution = useMemo(
    () => institutions.find((i) => i.id === effectiveInstitutionId) ?? null,
    [effectiveInstitutionId, institutions],
  )

  const institutionLabel = effectiveInstitutionId
    ? `${selectedInstitution?.name?.trim() || 'Sem nome'} (${effectiveInstitutionId})`
    : 'não selecionada'

  const modeSlot =
    effectiveInstitutionId && mode === 'choose' ? (
      <section className="panel trail-create-mode" data-testid="trail-create-mode">
        <h2>Como deseja criar?</h2>
        <p className="muted">
          Escolha o fluxo manual (como hoje) ou gere uma trilha completa a partir
          de documentos com IA.
        </p>
        <div className="trail-create-mode__cards">
          <button
            type="button"
            className="trail-create-mode__card"
            onClick={() => setMode('manual')}
          >
            <strong>Criar manualmente</strong>
            <span className="muted">
              Defina base, estrutura de fases e conteúdos passo a passo.
            </span>
          </button>
          <button
            type="button"
            className="trail-create-mode__card trail-create-mode__card--ai"
            onClick={() => setMode('ai')}
            data-testid="trail-create-mode-ai"
          >
            <strong>Criar trilha com IA</strong>
            <span className="muted">
              Envie PDFs/DOCX/TXT, revise o prompt e confira a prévia antes de
              salvar.
            </span>
          </button>
        </div>
      </section>
    ) : null

  let formSlot = null
  if (effectiveInstitutionId && mode === 'manual') {
    formSlot = (
      <>
        <p className="trail-create-mode__back">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setMode('choose')}
          >
            ← Outra forma de criar
          </button>
        </p>
        <TrailForm fixedInstitutionId={effectiveInstitutionId} />
      </>
    )
  } else if (effectiveInstitutionId && mode === 'ai') {
    formSlot = (
      <TrailAiCreateWizard
        institutionId={effectiveInstitutionId}
        onCancel={() => setMode('choose')}
      />
    )
  }

  return (
    <TrailNewPageView
      institutionLabel={institutionLabel}
      hasInstitution={Boolean(effectiveInstitutionId)}
      modeSlot={modeSlot}
      formSlot={formSlot}
    />
  )
}
