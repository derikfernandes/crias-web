import { describe, expect, it } from 'vitest'
import { pageNumbers } from './ui'

describe('pageNumbers', () => {
  it('sem números com uma página', () => {
    expect(pageNumbers(1, 1)).toEqual([])
  })
  it('lista todas até 7 páginas', () => {
    expect(pageNumbers(2, 3)).toEqual([1, 2, 3])
    expect(pageNumbers(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  it('usa reticências com muitas páginas', () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, null, 20])
    expect(pageNumbers(10, 20)).toEqual([1, null, 9, 10, 11, null, 20])
    expect(pageNumbers(20, 20)).toEqual([1, null, 19, 20])
  })
})
