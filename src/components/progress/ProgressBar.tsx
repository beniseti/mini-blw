interface Props {
  value: number
  max: number
  barClass?: string
  trackClass?: string
  label: string
  size?: 'sm' | 'lg'
}

export function ProgressBar({ value, max, barClass = 'bg-mint-300', trackClass = 'bg-line/60', label, size = 'sm' }: Props) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} de ${max} (${pct} %)`}
      className={`w-full overflow-hidden rounded-full ${trackClass} ${size === 'lg' ? 'h-4' : 'h-2.5'}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
