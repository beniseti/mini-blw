import type { ReactNode } from 'react'

interface Props {
  active: boolean
  onClick: () => void
  children: ReactNode
  activeClass?: string
}

/** Botón-píldora para filtros. */
export function Chip({ active, onClick, children, activeClass = 'bg-lilac-200 text-lilac-700 ring-lilac-300' }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap ring-1 transition-colors ${
        active ? activeClass : 'bg-white text-ink-soft ring-line'
      }`}
    >
      {children}
    </button>
  )
}
