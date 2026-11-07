import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-mint-300 text-mint-800 hover:bg-mint-200 active:bg-mint-300 shadow-sm',
  secondary: 'bg-white text-ink ring-1 ring-line hover:bg-cream active:bg-line/40',
  danger: 'bg-rose-200 text-rose-700 hover:bg-rose-100 active:bg-rose-200',
  ghost: 'bg-transparent text-ink-soft hover:bg-line/40',
  soft: 'bg-lilac-100 text-lilac-700 hover:bg-lilac-200',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', block, icon, className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-bold transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon && <span aria-hidden="true" className="text-lg leading-none">{icon}</span>}
      {children}
    </button>
  )
}
