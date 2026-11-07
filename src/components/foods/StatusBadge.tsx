import { STATUS_STYLES } from '../../lib/labels'
import type { VisualStatus } from '../../lib/status'

const TEXT: Record<VisualStatus, string> = {
  untried: 'No probado',
  tried: 'Probado',
  mild: 'Reacción leve',
  severe: 'Reacción preocupante',
}

const ICON: Record<VisualStatus, string> = {
  untried: '○',
  tried: '✓',
  mild: '⚠️',
  severe: '⚠️',
}

export function StatusBadge({ status, compact }: { status: VisualStatus; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${STATUS_STYLES[status].badge} ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span aria-hidden="true">{ICON[status]}</span>
      {TEXT[status]}
    </span>
  )
}
