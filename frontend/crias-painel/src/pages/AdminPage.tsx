import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { AdminPageView } from '../design/views/AdminPageView'
import type { AdminUserRow } from '../design/types/adminPageView'
import { db } from '../lib/firebase'
import {
  adminUserDocId,
  defaultNavPermissions,
  NAV_ITEMS,
  normalizeAdminEmail,
} from '../lib/adminPermissions'
import {
  ADMIN_USERS_COLLECTION,
  snapshotToAdminUser,
} from '../lib/adminUserFirestore'
import {
  INSTITUTIONS_COLLECTION,
  snapshotToInstitution,
} from '../lib/institutionFirestore'
import { usePermissions } from '../hooks/usePermissions'
import type { AdminUser, NavPermission } from '../types/adminUser'
import type { Institution } from '../types/institution'

type FormState = {
  email: string
  active: boolean
  is_super_admin: boolean
  all_institutions: boolean
  nav_permissions: NavPermission[]
  institution_ids: string[]
}

function emptyForm(): FormState {
  return {
    email: '',
    active: true,
    is_super_admin: false,
    all_institutions: false,
    nav_permissions: defaultNavPermissions(),
    institution_ids: [],
  }
}

function formFromUser(user: AdminUser): FormState {
  return {
    email: user.email,
    active: user.active,
    is_super_admin: user.is_super_admin,
    all_institutions: user.all_institutions,
    nav_permissions: [...user.nav_permissions],
    institution_ids: [...user.institution_ids],
  }
}

export function AdminPage() {
  const { canNav, permissionsLoading } = usePermissions()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.email.localeCompare(b.email, 'pt-BR'))
  }, [users])

  const sortedInstitutions = useMemo(() => {
    return [...institutions].sort((a, b) =>
      (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR', {
        sensitivity: 'base',
      }),
    )
  }, [institutions])

  useEffect(() => {
    if (!db) {
      setLoadingUsers(false)
      return
    }

    const unsubUsers = onSnapshot(
      collection(db, ADMIN_USERS_COLLECTION),
      (snap) => {
        setUsers(snap.docs.map(snapshotToAdminUser))
        setListError(null)
        setLoadingUsers(false)
      },
      (err) => {
        const message = err.message
        if (/permission/i.test(message)) {
          setListError(
            'Permissão negada no Firestore. Publique as regras do arquivo firestore.rules (Firebase Console → Firestore → Regras).',
          )
        } else {
          setListError(message)
        }
        setLoadingUsers(false)
      },
    )

    const unsubInst = onSnapshot(collection(db, INSTITUTIONS_COLLECTION), (snap) => {
      setInstitutions(snap.docs.map(snapshotToInstitution))
    })

    return () => {
      unsubUsers()
      unsubInst()
    }
  }, [])

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
  }

  function startEdit(user: AdminUser) {
    setEditingId(user.id)
    setForm(formFromUser(user))
    setFormError(null)
  }

  function toggleNav(key: NavPermission) {
    setForm((prev) => {
      const has = prev.nav_permissions.includes(key)
      return {
        ...prev,
        nav_permissions: has
          ? prev.nav_permissions.filter((item) => item !== key)
          : [...prev.nav_permissions, key],
      }
    })
  }

  function toggleInstitution(id: string) {
    setForm((prev) => {
      const has = prev.institution_ids.includes(id)
      return {
        ...prev,
        institution_ids: has
          ? prev.institution_ids.filter((item) => item !== id)
          : [...prev.institution_ids, id],
      }
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!db) return

    const email = normalizeAdminEmail(form.email)
    if (!email || !email.includes('@')) {
      setFormError('Informe um e-mail válido (o mesmo usado no login Firebase).')
      return
    }

    if (
      !form.is_super_admin &&
      !form.all_institutions &&
      form.institution_ids.length === 0
    ) {
      setFormError(
        'Selecione ao menos uma instituição ou marque "Todas as instituições".',
      )
      return
    }

    if (!form.is_super_admin && form.nav_permissions.length === 0) {
      setFormError('Selecione ao menos um tópico do menu ou marque Super admin.')
      return
    }

    const docId = editingId ?? adminUserDocId(email)
    setSaving(true)
    setFormError(null)

    try {
      const payload = {
        email,
        active: form.active,
        is_super_admin: form.is_super_admin,
        all_institutions: form.is_super_admin ? true : form.all_institutions,
        nav_permissions: form.is_super_admin
          ? NAV_ITEMS.map((item) => item.key)
          : form.nav_permissions,
        institution_ids: form.is_super_admin || form.all_institutions ? [] : form.institution_ids,
        updated_at: serverTimestamp(),
      }

      if (editingId) {
        await updateDoc(doc(db, ADMIN_USERS_COLLECTION, docId), payload)
      } else {
        await setDoc(doc(db, ADMIN_USERS_COLLECTION, docId), {
          ...payload,
          created_at: serverTimestamp(),
        })
      }

      setEditingId(docId)
      setForm((prev) => ({ ...prev, email }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar.'
      if (/permission/i.test(message)) {
        setFormError(
          'Permissão negada no Firestore. Publique as regras do arquivo firestore.rules na raiz do projeto (Firebase Console → Firestore → Regras, ou firebase deploy --only firestore:rules).',
        )
      } else {
        setFormError(message)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user: AdminUser) {
    if (!db) return
    const ok = window.confirm(`Remover permissões de ${user.email}?`)
    if (!ok) return

    setDeletingId(user.id)
    try {
      await deleteDoc(doc(db, ADMIN_USERS_COLLECTION, user.id))
      if (editingId === user.id) {
        startCreate()
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Erro ao remover.')
    } finally {
      setDeletingId(null)
    }
  }

  if (permissionsLoading) {
    return <AdminPageView status="loading" />
  }

  if (!canNav('admin')) {
    return <AdminPageView status="forbidden" />
  }

  const userRows: AdminUserRow[] = sortedUsers.map((user) => ({
    id: user.id,
    email: user.email,
    activeLabel: user.active ? 'Sim' : 'Não',
    scopeLabel: user.is_super_admin
      ? 'Super admin'
      : user.all_institutions
        ? 'Todas instituições'
        : `${user.institution_ids.length} instituição(ões)`,
    menuLabel: user.is_super_admin
      ? 'Todos'
      : user.nav_permissions.length > 0
        ? String(user.nav_permissions.length)
        : '—',
    deleting: deletingId === user.id,
  }))

  return (
    <AdminPageView
      status="ok"
      listError={listError}
      editingId={editingId}
      form={form}
      formError={formError}
      saving={saving}
      loadingUsers={loadingUsers}
      navItems={NAV_ITEMS.map((item) => ({ key: item.key, label: item.label }))}
      institutions={sortedInstitutions.map((inst) => ({
        id: inst.id,
        label: inst.name || inst.id,
      }))}
      users={userRows}
      onStartCreate={startCreate}
      onEmailChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
      onActiveChange={(checked) =>
        setForm((prev) => ({ ...prev, active: checked }))
      }
      onSuperAdminChange={(checked) =>
        setForm((prev) => ({
          ...prev,
          is_super_admin: checked,
          all_institutions: checked ? true : prev.all_institutions,
        }))
      }
      onAllInstitutionsChange={(checked) =>
        setForm((prev) => ({
          ...prev,
          all_institutions: checked,
          institution_ids: checked ? [] : prev.institution_ids,
        }))
      }
      onToggleNav={(key) => toggleNav(key as NavPermission)}
      onToggleInstitution={toggleInstitution}
      onSubmit={(e) => void handleSubmit(e)}
      onEditUser={(userId) => {
        const user = users.find((u) => u.id === userId)
        if (user) startEdit(user)
      }}
      onDeleteUser={(userId) => {
        const user = users.find((u) => u.id === userId)
        if (user) void handleDelete(user)
      }}
    />
  )
}
