/**
 * Paginação compacta para listas longas (mockup v2 — etapas / histórico).
 */

export type PaginatedSlice<T> = {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  /** Índice 0-based da primeira página que contém `matchIndex`. */
  pageForIndex: (index: number) => number
}

export function paginateList<T>(
  all: T[],
  page: number,
  pageSize: number,
): PaginatedSlice<T> {
  const totalItems = all.length
  const safeSize = Math.max(1, Math.floor(pageSize) || 1)
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize))
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages)
  const start = (safePage - 1) * safeSize
  return {
    items: all.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    totalItems,
    totalPages,
    pageForIndex(index: number) {
      if (totalItems === 0) return 1
      const i = Math.max(0, Math.min(totalItems - 1, Math.floor(index)))
      return Math.floor(i / safeSize) + 1
    },
  }
}
