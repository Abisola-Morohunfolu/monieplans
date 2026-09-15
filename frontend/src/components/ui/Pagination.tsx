import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total?: number
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onPageChange?: (page: number) => void
}

function pageWindow(current: number, total: number): number[] {
  const pages: number[] = []
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export function Pagination({
  page,
  totalPages,
  total,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <span className="text-xs text-text-tertiary">
        {total != null ? `${total} total` : ''}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="p-2 rounded-xl text-text-secondary hover:bg-text-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pageWindow(page, totalPages).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange?.(p)}
            className={`w-8 h-8 rounded-xl text-sm font-medium transition-colors ${
              p === page
                ? 'bg-sage/20 text-forest'
                : 'text-text-secondary hover:bg-text-primary/5'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={onNext}
          disabled={!canNext}
          className="p-2 rounded-xl text-text-secondary hover:bg-text-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
