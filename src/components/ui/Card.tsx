import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  title?: ReactNode
  action?: ReactNode
}

export function Card({ children, className = 'bg-white', title, action }: Props) {
  return (
    <section className={`rounded-3xl p-4 shadow-sm ring-1 ring-line/70 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-lg font-extrabold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
