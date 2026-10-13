/**
 * Tema do app do aluno (v6).
 * Claro é o padrão ao abrir. Escuro só pelo botão do menu.
 * Escuro = html[data-v2=dark]. A escolha fica em localStorage (chave abaixo).
 */

export type Tema = 'claro' | 'escuro'

export const TEMA_CHAVE = 'crias-aluno-v2-tema'

export function temaAtual(): Tema {
  return document.documentElement.dataset.v2 === 'dark' ? 'escuro' : 'claro'
}

export function aplicarTema(tema: Tema): void {
  const escuro = tema === 'escuro'
  document.documentElement.dataset.v2 = escuro ? 'dark' : 'light'
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', escuro ? '#000000' : '#ffffff')
  try {
    localStorage.setItem(TEMA_CHAVE, tema)
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}
