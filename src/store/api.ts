import type { SyncOp, SyncResponse } from '../types'
import { parseAppData } from './storage'

/** Error de sincronización. `offline` = no se pudo contactar con el servidor. */
export class SyncError extends Error {
  readonly offline: boolean
  constructor(message: string, offline: boolean) {
    super(message)
    this.name = 'SyncError'
    this.offline = offline
  }
}

const TIMEOUT_MS = 15_000

/**
 * Envía los cambios pendientes y recibe el estado completo del servidor.
 * Con `ops` vacío sirve para descargar los datos más recientes.
 */
export async function syncWithServer(ops: SyncOp[]): Promise<SyncResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res: Response
  try {
    // Ruta relativa: funciona también si la app se publica en una subcarpeta.
    res = await fetch('api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops }),
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch {
    throw new SyncError('No se puede conectar con el servidor', true)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    // 502/503/504 suelen ser el proxy sin servidor detrás: lo tratamos como "sin conexión".
    throw new SyncError(`El servidor respondió ${res.status}`, res.status >= 502 && res.status <= 504)
  }
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new SyncError('Respuesta del servidor no válida', false)
  }
  const b = body as Partial<SyncResponse> | null
  const parsed = parseAppData(b?.data)
  if (!parsed.ok) throw new SyncError('Respuesta del servidor no válida', false)
  return { data: parsed.data, applied: Number(b?.applied) || 0, rejected: Number(b?.rejected) || 0 }
}
