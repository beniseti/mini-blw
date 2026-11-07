import { useStore, type SyncStatus } from '../../store/AppStore'

const LOOK: Record<SyncStatus, { icon: string; label: string; className: string }> = {
  synced: { icon: '☁️', label: 'Guardado', className: 'bg-mint-100 text-mint-800 ring-mint-300' },
  syncing: { icon: '🔄', label: 'Guardando…', className: 'bg-lilac-100 text-lilac-700 ring-lilac-200' },
  pending: { icon: '⏳', label: 'Pendiente', className: 'bg-amber-100 text-amber-700 ring-amber-300' },
  offline: { icon: '📴', label: 'Sin conexión', className: 'bg-amber-100 text-amber-700 ring-amber-300' },
  error: { icon: '⚠️', label: 'Error', className: 'bg-rose-100 text-rose-700 ring-rose-300' },
}

const DESCRIPTION: Record<SyncStatus, string> = {
  synced: 'Datos guardados en el servidor',
  syncing: 'Sincronizando con el servidor',
  pending: 'Hay cambios pendientes de enviar al servidor',
  offline: 'Sin conexión con el servidor; los cambios se enviarán al reconectar',
  error: 'Error al sincronizar con el servidor',
}

/** Estado de la sincronización con el servidor. Al tocarlo, sincroniza de nuevo. */
export function SyncBadge() {
  const { sync, syncNow } = useStore()
  const look = LOOK[sync.status]
  const pending = sync.pending > 0 && sync.status !== 'synced' ? ` · ${sync.pending}` : ''
  return (
    <button
      type="button"
      onClick={syncNow}
      title={sync.error ?? DESCRIPTION[sync.status]}
      aria-label={`${DESCRIPTION[sync.status]}${sync.pending ? ` (${sync.pending} cambios pendientes)` : ''}. Tocar para sincronizar.`}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-bold ring-1 ${look.className}`}
    >
      <span aria-hidden="true" className={sync.status === 'syncing' ? 'animate-spin' : ''}>
        {look.icon}
      </span>
      <span aria-hidden="true">
        {look.label}
        {pending}
      </span>
    </button>
  )
}
