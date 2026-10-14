import { describe, expect, it } from 'vitest'
import { paginateList } from './listPagination'

describe('paginateList', () => {
  it('fatia e calcula totalPages', () => {
    const r = paginateList([1, 2, 3, 4, 5], 2, 2)
    expect(r.items).toEqual([3, 4])
    expect(r.page).toBe(2)
    expect(r.totalPages).toBe(3)
  })

  it('limita página acima do máximo', () => {
    const r = paginateList(['a', 'b'], 99, 1)
    expect(r.page).toBe(2)
    expect(r.items).toEqual(['b'])
  })

  it('pageForIndex aponta página correta', () => {
    const r = paginateList(Array.from({ length: 10 }, (_, i) => i), 1, 3)
    expect(r.pageForIndex(0)).toBe(1)
    expect(r.pageForIndex(3)).toBe(2)
    expect(r.pageForIndex(9)).toBe(4)
  })
})
