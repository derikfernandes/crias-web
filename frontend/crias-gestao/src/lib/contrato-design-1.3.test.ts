/**
 * CONTRATO DO DESIGN 1.3 (Crias Educação). Leia antes de mexer.
 * Se um teste daqui falhar, um item do design 1.3 foi removido ou trocado. NÃO apague o teste: volte o item ou
 * combine a mudança com o Thiago e atualize INTERFACE.md e este arquivo juntos.
 * Mapa completo: frontend/crias-aluno/design/RELATORIO-1.3.md.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PROFILE_LABEL, PROFILE_MENU } from './adminProfiles'

const src = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (f: string) => readFileSync(join(src, f), 'utf8')

describe('contrato 1.3: Educação', () => {
  it('1.3.6 sem tela cheia e 1.3.7 menu lateral (sem barra de menu no topo)', () => {
    const layout = read('layouts/AdminLayout.tsx')
    expect(layout).not.toMatch(/Fullscreen/)
    expect(layout).toMatch(/className="gx-side"/)
    expect(layout).not.toMatch(/className="gx-tb"/)
    expect(read('main.tsx')).not.toMatch(/bindFullscreen/)
  })
  it('1.3.14 perfis Super admin, Gestão e Professor; Professor sem Configurações', () => {
    expect(PROFILE_LABEL).toEqual({ super: 'Super admin', admin: 'Gestão', basico: 'Professor' })
    expect(PROFILE_MENU.basico).toEqual(['home', 'dash', 'trilhas', 'alunos'])
  })
  it('1.3.9 filtros do topo: matéria, turma, trilhas (Dados e Trilhas)', () => {
    for (const f of ['design/views/DashboardPageView.tsx', 'pages/TrailsListPage.tsx']) {
      const s = read(f)
      const a = s.indexOf('label="Filtrar matéria"')
      const b = s.indexOf('label="Filtrar turma"')
      const c = s.indexOf('label="Filtrar trilhas"')
      expect(a, f).toBeGreaterThan(-1)
      expect(a < b && b < c, f).toBe(true)
    }
  })
  it('1.3.11 Alunos: Exportar base e colunas de desempenho; 1.3.12.a sem "Filtrar por ID"', () => {
    const s = read('pages/StudentsListPage.tsx')
    expect(s).toMatch(/Exportar base/)
    expect(s).toMatch(/'% de acerto'/)
    expect(s).not.toMatch(/label="Filtrar por ID"/)
  })
  it('1.3.15 e 1.3.16 usuários: tabela só leitura e perfil do usuário com Matérias, Turmas e Trilhas vinculadas', () => {
    expect(read('pages/admin/UsersReadTable.tsx')).toMatch(/'Matérias'/)
    const p = read('pages/UserProfilePage.tsx')
    expect(p).toMatch(/Trilhas vinculadas/)
    expect(p).toMatch(/Vincular trilha/)
  })
})
