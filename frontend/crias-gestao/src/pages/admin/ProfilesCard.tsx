import { MENU_ITEMS, PROFILE_LABEL, type EditableProfileId } from '../../lib/adminProfiles'
import type { ProfileMenus } from '../../lib/adminProfileOps'

/**
 * Perfis (1.1.1.b): Super admin acessa tudo; Admin e Básico têm o menu marcado abaixo. Só o Super admin edita
 * (as mudanças pedem o Salvar do topo); a escola só visualiza. Início fica sempre marcado.
 */
export function ProfilesCard({
  menus,
  canEdit,
  onToggle,
}: {
  menus: ProfileMenus
  canEdit: boolean
  onToggle: (profile: EditableProfileId, key: (typeof MENU_ITEMS)[number]['key']) => void
}) {
  return (
    <section className="gx-card" aria-label="Perfis">
      <h2>Perfis</h2>
      <div className="gx-profilerow">
        <strong>{PROFILE_LABEL.super}</strong>
        <span className="gx-muted">Acessa todas as instituições e todo o menu.</span>
      </div>
      {(['admin', 'basico'] as const).map((p) => (
        <div key={p} className="gx-profilerow">
          <strong>{PROFILE_LABEL[p]}</strong>
          {MENU_ITEMS.map((m) => (
            <label key={m.key} className="gx-check">
              <input
                type="checkbox"
                checked={menus[p].includes(m.key)}
                disabled={!canEdit || m.key === 'home'}
                onChange={() => onToggle(p, m.key)}
              />
              {m.label === 'Permissões' ? 'Usuários' : m.label}
            </label>
          ))}
        </div>
      ))}
      <p className="gx-muted" style={{ fontSize: 12 }}>
        {canEdit
          ? 'Marque o menu de cada perfil e use Salvar. A mudança vale para todos os usuários do perfil.'
          : 'Só o Super admin edita os perfis.'}
      </p>
    </section>
  )
}
