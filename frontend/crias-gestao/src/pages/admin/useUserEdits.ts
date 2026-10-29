import { useCallback, useMemo, useState } from 'react'
import type { UserDraft } from '../../lib/adminUsersOps'
import type { UserRowModel } from './UsersTable'

/**
 * Edição da tabela de usuários (1.1.1.b, E): a página abre só para leitura; "Editar" libera os campos. As
 * alterações das linhas já salvas ficam pendentes e o Salvar do topo grava tudo de uma vez.
 */
export function useUserEdits(rows: UserRowModel[]) {
  const [editing, setEditing] = useState(false)
  const [edits, setEdits] = useState<Map<string, UserDraft>>(new Map())
  const original = useMemo(() => new Map(rows.filter((r) => !r.isNew).map((r) => [r.id, r])), [rows])

  const onChangeDraft = useCallback(
    (row: UserRowModel, draft: UserDraft) => {
      setEdits((prev) => {
        const next = new Map(prev)
        if (JSON.stringify(draft) === JSON.stringify(row.draft)) next.delete(row.id)
        else next.set(row.id, draft)
        return next
      })
    },
    [],
  )

  /** Só conta o que ainda existe e de fato mudou. */
  const changed = useMemo(
    () => [...edits.entries()].filter(([id, d]) => original.has(id) && JSON.stringify(d) !== JSON.stringify(original.get(id)!.draft)),
    [edits, original],
  )

  function cancel() {
    setEdits(new Map())
    setEditing(false)
  }

  /** Grava cada usuário alterado. Para no primeiro erro (o que já gravou sai da lista de pendentes). */
  async function saveAll(save: (row: UserRowModel, draft: UserDraft) => Promise<void>) {
    for (const [id, draft] of changed) {
      await save(original.get(id)!, draft)
      setEdits((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
    }
    setEditing(false)
  }

  return { editing, setEditing, edits, onChangeDraft, dirty: changed.length > 0, cancel, saveAll }
}
