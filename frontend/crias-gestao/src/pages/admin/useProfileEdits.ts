import { useEffect, useMemo, useState } from 'react'
import { useCollection } from '../../hooks/useCollection'
import {
  ADMIN_PROFILES_COLLECTION,
  resolveProfileMenus,
  saveProfileMenus,
  snapshotToProfileMenu,
  type ProfileMenus,
} from '../../lib/adminProfileOps'
import { setActiveProfileMenus, type EditableProfileId, type MenuKey } from '../../lib/adminProfiles'
import type { AdminUser } from '../../types/adminUser'

/**
 * Menus dos perfis Admin e Básico (1.1.1.b). O Super admin marca e desmarca; as mudanças ficam pendentes e o
 * Salvar do topo grava (coleção `admin_profiles` + `nav_permissions` dos usuários do perfil).
 */
export function useProfileEdits(users: AdminUser[], canEdit: boolean) {
  const stored = useCollection(ADMIN_PROFILES_COLLECTION, snapshotToProfileMenu)
  const saved = useMemo(() => resolveProfileMenus(stored.rows), [stored.rows])
  const [draft, setDraft] = useState<Partial<ProfileMenus>>({})

  useEffect(() => setActiveProfileMenus(saved), [saved])

  const effective: ProfileMenus = { admin: draft.admin ?? saved.admin, basico: draft.basico ?? saved.basico }
  const changed = (Object.keys(draft) as EditableProfileId[]).filter(
    (p) => JSON.stringify([...(draft[p] ?? [])].sort()) !== JSON.stringify([...saved[p]].sort()),
  )

  function toggle(profile: EditableProfileId, key: MenuKey) {
    if (!canEdit || key === 'home') return
    setDraft((d) => {
      const cur = d[profile] ?? saved[profile]
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
      return { ...d, [profile]: next }
    })
  }

  async function save() {
    const payload: Partial<ProfileMenus> = {}
    for (const p of changed) payload[p] = draft[p]
    await saveProfileMenus(payload, users)
    setDraft({})
  }

  return { menus: effective, toggle, dirty: changed.length > 0, cancel: () => setDraft({}), save, ready: stored.ready }
}
