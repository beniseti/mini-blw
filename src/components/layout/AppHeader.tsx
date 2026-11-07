import type { ReactNode } from 'react'
import { SyncBadge } from './SyncBadge'

export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-cream/95 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black text-ink">{title}</h1>
          {subtitle && <p className="truncate text-sm font-semibold text-ink-soft">{subtitle}</p>}
        </div>
        {right ?? <SyncBadge />}
      </div>
    </header>
  )
}
