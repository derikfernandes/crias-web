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
  downloadBlob,
  downloadTextFile,
  exportStudentPasswordsCsv,
  fetchStudentPasswords,
  importStudentsCsv,
  regenerateStudentPassword,
} from '../lib/studentPasswordsApi'
import type { Institution } from '../types/institution'

export function StudentPasswordsPage() {
  const { isMaster, filterInstitutions } = usePermissions()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('')
  const [rows, setRows] = useState<StudentPasswordsRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
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

  const displayRows = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        regenerating: regeneratingId === r.id,
      })),
    [rows, regeneratingId],
  )

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

  return (
    <StudentPasswordsPageView
      isMaster={isMaster}
      institutionOptions={institutionOptions}
      selectedInstitutionId={selectedInstitutionId}
      onSelectInstitution={setSelectedInstitutionId}
      rows={displayRows}
      loading={loading}
      error={error}
      busy={busy || Boolean(regeneratingId)}
      onExportCsv={() => void handleExportCsv()}
      onRegenerate={(id) => void handleRegenerate(id)}
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
