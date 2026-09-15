import { useState } from 'react'

export const PAGE_SIZE = 50

interface UsePaginationOptions {
  total: number
  page?: number
  limit?: number
  defaultLimit?: number
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function usePagination({
  total,
  page: pageProp,
  limit: limitProp,
  defaultLimit = PAGE_SIZE,
  onPageChange,
  onLimitChange,
}: UsePaginationOptions) {
  const [internalPage, setInternalPage] = useState(1)
  const [internalLimit, setInternalLimit] = useState(defaultLimit)

  const limit = limitProp ?? internalLimit
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const page = clamp(pageProp ?? internalPage, 1, totalPages)
  const offset = (page - 1) * limit

  const setPage = (next: number) => {
    const clamped = clamp(next, 1, totalPages)
    if (onPageChange) onPageChange(clamped)
    else setInternalPage(clamped)
  }

  const setLimit = (next: number) => {
    if (onLimitChange) onLimitChange(next)
    else {
      setInternalLimit(next)
      setInternalPage(1)
    }
  }

  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasMore: page < totalPages,
    canPrev: page > 1,
    canNext: page < totalPages,
    setPage,
    setLimit,
    next: () => setPage(page + 1),
    prev: () => setPage(page - 1),
  }
}
