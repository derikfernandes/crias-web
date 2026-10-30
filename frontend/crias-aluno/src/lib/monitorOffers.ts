/**
 * Ofertas do monitor em destaque (1.2.5.3 e 1.2.5.7). Textos iguais aos do protótipo `Crias Aluno.dc.html`
 * (OFFERS, END_OFF e MON_OFF). Conjuntos fixos do frontend, sem repetir o anterior (atividades seguidas usam
 * frases diferentes). Os trechos grifados são tocáveis: `ask` envia a pergunta ao monitor e `go` continua.
 */
export type OfferPart = { text: string; ask?: string; go?: true }

type Kind = 'exp' | 'ex' | 'pra' | 'duv' | 'go'
/** Pergunta enviada ao monitor quando o aluno toca no trecho grifado. */
const ASK: Record<Exclude<Kind, 'go'>, string> = {
  exp: 'Pode explicar melhor, de outro jeito?',
  ex: 'Pode me dar um exemplo?',
  pra: 'Pode propor um exercício para eu praticar?',
  duv: 'Tenho uma dúvida sobre esta parte.',
}

type Raw = Array<string | [string, Kind]>

function build(raw: Raw): OfferPart[] {
  return raw.map((p) =>
    typeof p === 'string' ? { text: p } : p[1] === 'go' ? { text: p[0], go: true } : { text: p[0], ask: ASK[p[1]] },
  )
}

/** Primeira etapa de cada atividade: 2 trechos de ajuda + 1 de continuar. */
const FIRST: Raw[] = [
  ['Ficou alguma dúvida? Posso ', ['explicar melhor', 'exp'], ' ou ', ['dar exemplos', 'ex'], '. Se estiver tudo claro, é só ', ['continuar', 'go'], '.'],
  ['Quer ver isso na prática? Posso ', ['mostrar um exemplo', 'ex'], ' ou ', ['propor um exercício', 'pra'], '. Ou, se preferir, ', ['siga para a próxima etapa', 'go'], '.'],
  ['Se alguma parte ', ['não ficou clara', 'duv'], ', me conte. Também posso ', ['explicar de outro jeito', 'exp'], '. Quando quiser, ', ['continue', 'go'], '.'],
  ['Que tal testar o que você viu? Posso ', ['fazer um exercício rápido', 'pra'], ' com você ou ', ['dar um exemplo do dia a dia', 'ex'], '. Se já estiver seguro, ', ['avance', 'go'], '.'],
  ['Tudo certo até aqui? Se ', ['não entendeu', 'duv'], ' alguma parte, eu ', ['explico melhor', 'exp'], '. Senão, vamos ', ['continuar', 'go'], '.'],
  ['Antes de seguir, posso ', ['dar mais um exemplo', 'ex'], ' ou ', ['explicar de outro jeito', 'exp'], '. Ou ', ['continue para a próxima etapa', 'go'], '.'],
]

/** Fim da atividade, logo abaixo da caixa "Atividade concluída". */
const LAST: Raw[] = [
  ['Se quiser, posso ', ['revisar o que você estudou', 'exp'], ' ou ', ['propor um exercício extra', 'pra'], '. Quando estiver pronto, ', ['siga para a próxima atividade', 'go'], '.'],
  ['Antes da próxima, posso ', ['dar mais um exemplo', 'ex'], ' ou ', ['tirar uma dúvida', 'duv'], ' sobre esta atividade. Se preferir, ', ['comece a próxima', 'go'], '.'],
  ['Ficou alguma parte solta? Eu ', ['explico de novo', 'exp'], ' ou ', ['faço um exercício com você', 'pra'], '. Senão, ', ['vamos para a próxima atividade', 'go'], '.'],
]

/** Fim da trilha (1.2.5.10): convite e "volte para a página inicial" (o `go` leva ao Início). */
const TRAIL: Raw[] = [
  ['Você concluiu a trilha! Se quiser, posso ', ['revisar o que você estudou', 'exp'], ' ou ', ['tirar uma dúvida', 'duv'], '. Quando quiser, ', ['volte para a página inicial', 'go'], '.'],
]

/** Monitoria, primeira abertura (1.2.5.7): tirar uma dúvida, explicar de outro jeito, fazer um exercício. */
export const MONITORIA_OFFER: OfferPart[] = build([
  'Posso ',
  ['tirar uma dúvida', 'duv'],
  ', ',
  ['explicar um conteúdo de outro jeito', 'exp'],
  ' ou ',
  ['fazer um exercício com você', 'pra'],
  '.',
])

export function pickOffer(kind: 'first' | 'last' | 'trail', activityNumber: number): OfferPart[] {
  const set = kind === 'first' ? FIRST : kind === 'trail' ? TRAIL : LAST
  return build(set[Math.abs(activityNumber) % set.length])
}
