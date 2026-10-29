import { describe, expect, it } from 'vitest'
import { pickOffer } from './monitorOffers'

describe('ofertas do monitor', () => {
  it('2 trechos de ajuda e 1 de continuar na primeira etapa', () => {
    for (let n = 1; n <= 6; n++) {
      const o = pickOffer('first', n)
      expect(o.filter((p) => p.ask)).toHaveLength(2)
      expect(o.filter((p) => p.go)).toHaveLength(1)
    }
  })
  it('atividades seguidas não repetem a frase', () => {
    for (const kind of ['first', 'last'] as const) {
      for (let n = 1; n <= 6; n++) expect(pickOffer(kind, n)).not.toBe(pickOffer(kind, n + 1))
    }
  })
  it('sem travessão', () => {
    for (const kind of ['first', 'last'] as const) {
      expect(JSON.stringify(pickOffer(kind, 1))).not.toMatch(/[—–]/)
    }
  })
})
