/**
 * CONTRATO DO DESIGN 1.3 (Crias Aluno). Leia antes de mexer.
 *
 * Estes testes conferem, no código-fonte, os itens do design que já se perderam em merges anteriores
 * (troca de mensagens do 1.2.5, monitor, régua, Início, tela cheia, exercício). Se um deles falhar, um item do
 * design foi removido ou trocado: NÃO apague o teste; volte o item ou combine a mudança com o Thiago e atualize
 * INTERFACE.md e este arquivo juntos. Mapa completo: frontend/crias-aluno/design/RELATORIO-1.3.md.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (f: string) => readFileSync(join(src, f), 'utf8')

describe('contrato 1.2.5 e 1.3: troca de mensagens', () => {
  const parts = read('components/ConversationParts.tsx')
  const player = read('pages/PlayerPage.tsx')
  const css = read('styles/crias-v1-0.css')

  it('espera do conteúdo = símbolo do Crias com três pontos, no lugar final (sem esqueleto cinza nem "Carregando…")', () => {
    expect(parts).toMatch(/export function TypingRow/)
    expect(parts).toMatch(/v125-wait/)
    expect(parts).toMatch(/v125-dots/)
    expect(player).not.toMatch(/className="v1-0-skel"/)
    expect(player).not.toMatch(/v1-0-skel__label/)
  })
  it('espera e mensagem do monitor ficam na caixa do monitor (personagem de 52px + linhas de espera)', () => {
    expect(parts).toMatch(/className="v125-mon"/)
    expect(parts).toMatch(/v125-mon__wait/)
    expect(parts).toMatch(/MonitorAvatar size=\{52\}/)
    expect(parts).not.toMatch(/está digitando/)
  })
  it('entrada única: esmaecimento de 0,5s subindo 6px', () => {
    expect(css).toMatch(/@keyframes v125In\{from\{opacity:0;transform:translateY\(6px\)\}/)
    expect(css).toMatch(/animation:v125In \.5s/)
  })
  it('conteúdo sem título, NOVA ATIVIDADE entre atividades, caixa de conclusão e Aguarde no fechamento', () => {
    expect(player).toMatch(/NOVA ATIVIDADE/)
    expect(player).toMatch(/<ActivityDoneCard/)
    expect(player).toMatch(/kind="trail"/)
    expect(player).toMatch(/closingWaiting/)
    expect(player).not.toMatch(/Você concluiu as \$\{totalActivitiesHere\} atividades/)
  })
  it('rolagem: o bloco novo começa no topo e a tela não rola sozinha (startPin + data-pin-space)', () => {
    expect(player).toMatch(/function startPin\(\)/)
    expect(player).toMatch(/data-pin-space/)
    expect(player).toMatch(/data-pending-answer/)
  })
  it('trilha concluída: botão "Início" sem ícone', () => {
    expect(player).toMatch(/Início\n\s*<\/button>/)
  })
})

describe('contrato 1.3: Aluno', () => {
  it('1.3.4 monitor sem símbolo do Crias enquanto carrega, e pré-carregado', () => {
    const avatar = read('components/monitor/MonitorAvatar.tsx')
    expect(avatar).not.toMatch(/CriasSymbol/)
    expect(avatar).toMatch(/export function preloadMonitor/)
    expect(read('main.tsx')).toMatch(/preloadMonitor\(\)/)
  })
  it('1.3.3 tela cheia detectada por requestFullscreen (não só fullscreenEnabled)', () => {
    const fs = read('lib/fullscreen.ts')
    expect(fs).toMatch(/requestFullscreen === 'function'/)
    expect(fs).toMatch(/webkitRequestFullscreen === 'function'/)
  })
  it('1.3.2 trilha concluída continua no Início ("REVEJA A ATIVIDADE")', () => {
    const home = read('pages/TrailsPage.tsx')
    expect(home).toMatch(/REVEJA A ATIVIDADE/)
    expect(home).not.toMatch(/filter\(\(r\) => r\.status !== 'completed'\)/)
  })
  it('1.3.1 esmaecimento de 24px abaixo da régua', () => {
    expect(read('styles/crias-v1-0.css')).toMatch(/\.v125-ruler__fade\{[^}]*height:24px/)
  })
  it('1.3.F exercício: o enunciado sempre passa pela separação única (sem alternativas no texto)', () => {
    const api = read('lib/api.ts')
    expect(api).toMatch(/parsed\.statement \|\| c\.content/)
  })
})
