/**
 * Ofertas do monitor em destaque (1.2.5.3 e 1.2.5.7). Conjuntos fixos do frontend, sem repetir o anterior.
 * Uma oferta é uma lista de trechos; os grifados são tocáveis: `ask` envia a pergunta ao monitor e `go` continua.
 */
export type OfferPart = { text: string; ask?: string; go?: true }

/** Primeira etapa de cada atividade: 2 trechos de ajuda + 1 de continuar. */
const FIRST: OfferPart[][] = [
  [
    { text: 'Tudo certo até aqui? Se ' },
    { text: 'não entendeu', ask: 'Não entendi alguma parte. Pode explicar melhor?' },
    { text: ' alguma parte, eu ' },
    { text: 'explico melhor', ask: 'Explique melhor, por favor.' },
    { text: '. Senão, vamos ' },
    { text: 'continuar', go: true },
    { text: '.' },
  ],
  [
    { text: 'Ficou claro? Posso ' },
    { text: 'explicar de outro jeito', ask: 'Explique de outro jeito.' },
    { text: ' ou ' },
    { text: 'dar um exemplo', ask: 'Pode dar um exemplo?' },
    { text: '. Quando quiser, é só ' },
    { text: 'continuar', go: true },
    { text: '.' },
  ],
  [
    { text: 'Alguma dúvida? Eu ' },
    { text: 'tiro a dúvida', ask: 'Tenho uma dúvida sobre esta etapa.' },
    { text: ' ou ' },
    { text: 'explico passo a passo', ask: 'Explique passo a passo.' },
    { text: '. Se estiver tudo claro, ' },
    { text: 'continue', go: true },
    { text: '.' },
  ],
]

/** Fim da atividade, logo abaixo do fechamento. */
const LAST: OfferPart[][] = [
  [
    { text: 'Mandou bem! Se quiser ' },
    { text: 'rever alguma parte', ask: 'Pode me ajudar a rever alguma parte desta atividade?' },
    { text: ' ou ' },
    { text: 'tirar uma dúvida', ask: 'Tenho uma dúvida sobre esta atividade.' },
    { text: ', estou aqui. Quando estiver pronto, ' },
    { text: 'siga para a próxima atividade', go: true },
    { text: '.' },
  ],
  [
    { text: 'Terminamos esta atividade! Posso ' },
    { text: 'resumir o que vimos', ask: 'Faça um resumo do que vimos nesta atividade.' },
    { text: ' ou ' },
    { text: 'explicar de novo', ask: 'Explique de novo o ponto principal desta atividade.' },
    { text: '. Para seguir, ' },
    { text: 'vá para a próxima atividade', go: true },
    { text: '.' },
  ],
]

/** Escolhe a oferta pelo número da atividade, sem repetir a anterior (atividades seguidas usam frases diferentes). */
export function pickOffer(kind: 'first' | 'last', activityNumber: number): OfferPart[] {
  const set = kind === 'first' ? FIRST : LAST
  return set[Math.abs(activityNumber) % set.length]
}
