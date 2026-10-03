/**
 * Espelha o script Chatis 37 `formatarRespostaIA`:
 * marcador `|||` → parágrafo (`\n\n`), colapsa newlines extras.
 */
export function formatAiAnswer(raw: unknown): string {
  const resposta =
    raw === null || raw === undefined ? '' : String(raw)

  return resposta
    .replace(/\s*\|\|\|\s*/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Instrução tipográfica partilhada com tutores Chatis (espaçamento `|||`). */
export const TRAIL_AI_SPACING_RULES = `ESPAÇAMENTO OBRIGATÓRIO

Separe o título, cada parágrafo, cada lista completa e o fechamento utilizando exatamente o marcador |||.

O marcador ||| representa uma linha vazia e será convertido posteriormente pelo sistema.

Não coloque espaços antes ou depois do marcador.

Não utilize quebras de linha para separar os blocos.

Exemplo obrigatório:

*Título*|||Primeiro parágrafo.|||Segundo parágrafo.|||➡️ _Fechamento._

- todos os blocos estão separados pelo marcador |||;
- não existem espaços antes ou depois do marcador;
- o marcador ||| não foi usado dentro de uma frase.`
