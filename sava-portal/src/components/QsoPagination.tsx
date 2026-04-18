'use client'

import { Button } from '@/components/ui/button'
import { useT } from '@/components/TranslationsProvider'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

type Props = {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function QsoPagination({ total, page, pageSize, onPageChange, onPageSizeChange }: Props) {
  const t = useT()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pages = buildPageList(page, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-sm">
      {/* Rows per page */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{t.pagination.rowsPerPage}</span>
        <div className="flex gap-1">
          {PAGE_SIZE_OPTIONS.map(size => (
            <button
              key={size}
              onClick={() => { onPageSizeChange(size); onPageChange(1) }}
              className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                pageSize === size
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {t.pagination.showing(from, to, total)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹
          </Button>
          {pages.map((p, i) =>
            p === '...'
              ? <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">…</span>
              : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={`h-7 min-w-[1.75rem] px-1.5 rounded border text-xs font-medium transition-colors ${
                    p === page
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {p}
                </button>
              )
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            ›
          </Button>
        </div>
      </div>
    </div>
  )
}

function buildPageList(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = []
  const addPage = (p: number) => { if (!pages.includes(p)) pages.push(p) }
  const addEllipsis = () => { if (pages[pages.length - 1] !== '...') pages.push('...') }

  addPage(1)
  if (current > 3) addEllipsis()
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) addPage(p)
  if (current < total - 2) addEllipsis()
  addPage(total)

  return pages
}
