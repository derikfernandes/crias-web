import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { StudentPasswordsPageView } from '../design/views/StudentPasswordsPageView'
import type { StudentPasswordsRow } from '../design/types/studentPasswordsPageView'
import { usePermissions } from '../hooks/usePermissions'
import { db } from '../lib/firebase'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import {
  bulkGenerateStudentPasswords,
  countMissingStudentPasswords,
  downloadBlob,
  downloadTextFile,
  exportStudentPasswordsCsv,
  fetchStudentPasswords,
  importStudentsCsv,
  regenerateStudentPassword,
} from '../lib/studentPasswordsApi'
import type { Institution } from '../types/institution'

const PAGE_SIZE = 50
/** Lotes no servidor — evita timeout Vercel em escolas ~1000. */
const BULK_BATCH_LIMIT = 100

export function StudentPasswordsPage() {
  const { isMaster, filterInstitutions } = usePermissions()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('')
  const [rows, setRows] = useState<StudentPasswordsRow[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [bulkResultMessage, setBulkResultMessage] = useState<string | null>(
    null,
  )
  const [importCsvText, setImportCsvText] = useState('')
  const [importResultMessage, setImportResultMessage] = useState<string | null>(
    null,
  )
  const [importErrors, setImportErrors] = useState<
    Array<{ line: number; nome?: string; celular?: string; error: string }>
  >([])
  const [generatedCsv, setGeneratedCsv] = useState<string | null>(null)

  const institutionOptions = useMemo(() => {
    return filterInstitutions(institutions)
      .slice()
      .sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR', {
          sensitivity: 'base',
        }),
      )
      .map((inst) => ({
        id: inst.id,
        label: inst.name || inst.id,
      }))
  }, [institutions, filterInstitutions])

  const selectedSchoolName = useMemo(() => {
    const found = institutions.find((i) => i.id === selectedInstitutionId)
    return found?.name || selectedInstitutionId
  }, [institutions, selectedInstitutionId])

  useEffect(() => {
    if (!db || !isMaster) return
    const unsub = onSnapshot(
      collection(db, INSTITUTIONS_COLLECTION),
      (snap) => {
        setInstitutions(snap.docs.map((d) => snapshotToInstitution(d)))
      },
      () => setError('Falha ao carregar instituições.'),
    )
    return () => unsub()
  }, [isMaster])

  const loadPasswords = useCallback(async (institutionId: string) => {
    if (!institutionId) {
      setRows([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await fetchStudentPasswords(institutionId)
      setRows(
        list.map((r) => ({
          id: r.id,
          name: r.name,
          phone_number: r.phone_number,
          password: r.password,
          has_password_hash: r.has_password_hash,
          has_password_encrypted: r.has_password_encrypted,
        })),
      )
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Erro ao listar senhas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMaster || !selectedInstitutionId) {
      setRows([])
      return
    }
    void loadPasswords(selectedInstitutionId)
  }, [isMaster, selectedInstitutionId, loadPasswords])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE).map((r) => ({
      ...r,
      regenerating: regeneratingId === r.id,
    }))
  }, [rows, safePage, regeneratingId])

  const pageStart = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(safePage * PAGE_SIZE, rows.length)

  function handleSelectInstitution(id: string) {
    setSelectedInstitutionId(id)
    setPage(1)
    setBulkResultMessage(null)
  }

  async function handleExportCsv() {
    if (!selectedInstitutionId) return
    setBusy(true)
    setError(null)
    try {
      const blob = await exportStudentPasswordsCsv(
        selectedInstitutionId,
        selectedSchoolName,
      )
      downloadBlob(`senhas-${selectedInstitutionId}.csv`, blob)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar.')
    } finally {
      setBusy(false)
    }
  }

  async function handleBulkGenerateMissing() {
    if (!selectedInstitutionId) return
    setBulkBusy(true)
    setError(null)
    setBulkResultMessage(null)
    try {
      const preview = await countMissingStudentPasswords(selectedInstitutionId)
      const count = preview.would_update
      if (count <= 0) {
        setBulkResultMessage(
          'Nenhum aluno sem senha nesta escola. Nada foi alterado.',
        )
        return
      }
      const ok = window.confirm(
        `Gerar senhas para ${count} aluno${count === 1 ? '' : 's'} sem senha nesta escola?\n\nAlunos que já têm senha não serão alterados.`,
      )
      if (!ok) return

      let cursor: string | null = null
      let totalUpdated = 0
      let done = false
      let guard = 0
      while (!done && guard < 50) {
        guard += 1
        const batch = await bulkGenerateStudentPasswords({
          institutionId: selectedInstitutionId,
          dryRun: false,
          limit: BULK_BATCH_LIMIT,
          cursor,
        })
        totalUpdated += batch.updated
        done = batch.done
        cursor = batch.next_cursor
        if (batch.updated === 0 && !batch.done) {
          // Evita loop infinito se o servidor não avançar.
          break
        }
      }

      setBulkResultMessage(
        `${totalUpdated} senha${totalUpdated === 1 ? '' : 's'} gerada${totalUpdated === 1 ? '' : 's'}. Você pode exportar o CSV da escola inteira.`,
      )
      await loadPasswords(selectedInstitutionId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na geração em lote.')
    } finally {
      setBulkBusy(false)
    }
  }

  async function handleRegenerate(studentId: string) {
    const ok = window.confirm(
      'Gerar nova senha para este aluno? A senha anterior deixará de funcionar.',
    )
    if (!ok) return
    setRegeneratingId(studentId)
    setError(null)
    try {
      const result = await regenerateStudentPassword(studentId)
      setRows((prev) =>
        prev.map((r) =>
          r.id === studentId
            ? {
                ...r,
                password: result.password,
                has_password_hash: true,
                has_password_encrypted: true,
              }
            : r,
        ),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao regenerar.')
    } finally {
      setRegeneratingId(null)
    }
  }

  async function handleImportFile(file: File | null) {
    if (!file) return
    const text = await file.text()
    setImportCsvText(text)
  }

  async function handleSubmitImport() {
    if (!importCsvText.trim()) return
    setBusy(true)
    setError(null)
    setImportResultMessage(null)
    setImportErrors([])
    setGeneratedCsv(null)
    try {
      const result = await importStudentsCsv(importCsvText)
      setImportErrors(result.errors)
      setImportResultMessage(
        `Import concluído: ${result.created} criados, ${result.updated} atualizados, ${result.errors.length} erros, ${result.generated.length} senhas geradas.`,
      )
      if (result.generated_csv) setGeneratedCsv(result.generated_csv)
      if (selectedInstitutionId) {
        await loadPasswords(selectedInstitutionId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no import.')
    } finally {
      setBusy(false)
    }
  }

  const bulkGenerateLabel = bulkBusy
    ? 'Gerando senhas…'
    : 'Gerar senhas para alunos sem senha'

  return (
    <StudentPasswordsPageView
      isMaster={isMaster}
      institutionOptions={institutionOptions}
      selectedInstitutionId={selectedInstitutionId}
      onSelectInstitution={handleSelectInstitution}
      rows={pageRows}
      loading={loading}
      error={error}
      busy={busy || bulkBusy || Boolean(regeneratingId)}
      onExportCsv={() => void handleExportCsv()}
      onBulkGenerateMissing={() => void handleBulkGenerateMissing()}
      bulkGenerateLabel={bulkGenerateLabel}
      bulkResultMessage={bulkResultMessage}
      onRegenerate={(id) => void handleRegenerate(id)}
      page={safePage}
      totalPages={totalPages}
      totalRows={rows.length}
      pageStart={pageStart}
      pageEnd={pageEnd}
      onPageChange={setPage}
      importCsvText={importCsvText}
      onImportCsvTextChange={setImportCsvText}
      onImportFile={(file) => void handleImportFile(file)}
      onSubmitImport={() => void handleSubmitImport()}
      importResultMessage={importResultMessage}
      importErrors={importErrors}
      onDownloadGeneratedCsv={
        generatedCsv
          ? () => downloadTextFile('senhas-geradas.csv', generatedCsv)
          : null
      }
    />
  )
}
