import { describe, expect, it } from 'vitest'
import { MONITORIA_OFFER, pickOffer } from './monitorOffers'

describe('ofertas do monitor (iguais ao protótipo)', () => {
  it('primeira etapa: 2 trechos de ajuda e 1 de continuar', () => {
    for (let n = 1; n <= 8; n++) {
      const o = pickOffer('first', n)
      expect(o.filter((p) => p.ask)).toHaveLength(2)
      expect(o.filter((p) => p.go)).toHaveLength(1)
    }
  })
  it('atividades seguidas não repetem a frase', () => {
    for (const kind of ['first', 'last'] as const) {
      for (let n = 1; n <= 6; n++) {
        expect(pickOffer(kind, n).map((p) => p.text).join('')).not.toBe(pickOffer(kind, n + 1).map((p) => p.text).join(''))
      }
    }
  })
  it('Monitoria: três sugestões tocáveis, sem continuar', () => {
    expect(MONITORIA_OFFER.filter((p) => p.ask)).toHaveLength(3)
    expect(MONITORIA_OFFER.some((p) => p.go)).toBe(false)
  })
  it('sem travessão', () => {
    expect(JSON.stringify([pickOffer('first', 1), pickOffer('last', 1), pickOffer('trail', 1), MONITORIA_OFFER])).not.toMatch(/[—–]/)
  })
})
