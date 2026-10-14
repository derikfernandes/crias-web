/**
 * Conversão defensiva do marcador legado Chatis `|||` → parágrafo (`\n\n`).
 * O modelo já deve usar linhas vazias reais; isto só limpa resíduos.
 */
export function formatAiAnswer(raw: unknown): string {
  const resposta =
    raw === null || raw === undefined ? '' : String(raw)

  return resposta
    .replace(/\s*\|\|\|\s*/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
