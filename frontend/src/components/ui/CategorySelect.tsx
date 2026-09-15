import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { useCategorySearch } from '../../hooks/useCategories'
import type { Category } from '../../types'

interface CategorySelectProps {
  value: string | null
  onChange: (categoryId: string | null) => void
  placeholder?: string
  compact?: boolean
}

export function CategorySelect({
  value,
  onChange,
  placeholder = 'Select category',
  compact = false,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const [debounced, setDebounced] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const { data } = useCategorySearch(debounced, compact ? 50 : 25)

  const options = useMemo<Category[]>(() => data?.data ?? [], [data])

  const selected = useMemo(
    () => options.find((c) => c.id === value) ?? null,
    [options, value],
  )

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  useEffect(() => setHighlighted(0), [options.length, debounced])

  const select = (category: Category) => {
    onChange(category.id)
    setOpen(false)
    setSearch('')
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setSearch('')
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (options[highlighted]) select(options[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setSearch('')
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-center gap-2 w-full rounded-xl border border-text-primary/12 bg-bg-lightest/60 cursor-pointer ${
          compact ? 'px-2 py-1.5' : 'px-3 py-2.5'
        }`}
        onClick={() => setOpen((o) => !o)}
      >
        <input
          type="text"
          value={open ? search : selected?.name ?? ''}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={selected ? '' : placeholder}
          className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-tertiary min-w-0"
          role="combobox"
          aria-expanded={open}
        />
        {selected && !open ? (
          <button
            onClick={clear}
            className="p-0.5 text-text-tertiary hover:text-text-primary"
            aria-label="Clear category"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-bg-lightest border border-text-primary/8 rounded-xl shadow-[0_20px_50px_-20px_rgba(23,21,18,0.3)] max-h-64 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-text-tertiary">No categories found</div>
          ) : (
            options.map((category, index) => (
              <button
                key={category.id}
                onClick={() => select(category)}
                onMouseEnter={() => setHighlighted(index)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                  index === highlighted ? 'bg-sage/10' : ''
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-text-primary truncate">{category.name}</span>
                  {category.groupName && (
                    <span className="text-xs text-text-tertiary truncate">{category.groupName}</span>
                  )}
                </span>
                {category.id === value && <Check className="w-4 h-4 text-forest" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
