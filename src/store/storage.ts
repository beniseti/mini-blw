import { newId } from '../lib/text'
import { emptyPlan, isObject, parseOp, parsePlan, parseProfile, parseTrials } from '../shared/validate'
import type { AppData, SyncOp } from '../types'

/** Copia local (caché) de los datos del servidor + cola de cambios pendientes. */
export const CACHE_KEY = 'bocaditos-blw:cache:v2'
/** Clave de la versión anterior (solo localStorage, sin servidor). */
export const LEGACY_KEY = 'bocaditos-blw:v1'
export const BACKUP_APP_ID = 'bocaditos-blw'

export function emptyData(): AppData {
  return { version: 1, profile: null, trials: [], lastExportAt: null, plan: emptyPlan() }
}

export type ParseResult =
  | { ok: true; data: AppData; skipped: number }
  | { ok: false; error: string }

/**
 * Valida datos guardados o importados. Acepta tanto el formato interno como el de
 * copia de seguridad ({ app, exportedAt, ...datos }). Las pruebas inválidas se descartan
 * y se informa de cuántas.
 */
export function parseAppData(raw: unknown): ParseResult {
  if (!isObject(raw)) return { ok: false, error: 'El archivo no contiene datos válidos.' }
  if ('app' in raw && raw.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'El archivo no es una copia de seguridad de esta app.' }
  }
  if (raw.version !== 1) {
    return { ok: false, error: 'Versión de datos no compatible.' }
  }
  if (!Array.isArray(raw.trials)) return { ok: false, error: 'Faltan las pruebas en el archivo.' }

  const { trials, skipped } = parseTrials(raw.trials)
  return {
    ok: true,
    skipped,
    data: {
      version: 1,
      profile: parseProfile(raw.profile),
      trials,
      lastExportAt: typeof raw.lastExportAt === 'string' ? raw.lastExportAt : null,
      // Las copias anteriores al plan de comidas no lo incluyen.
      plan: parsePlan(raw.plan) ?? emptyPlan(),
    },
  }
}

export interface LocalState {
  /** Últimos datos conocidos (servidor + cambios pendientes ya aplicados). */
  data: AppData
  /** Cambios aún no confirmados por el servidor, en orden. */
  outbox: SyncOp[]
  /** Última sincronización correcta (ISO) o null si nunca. */
  lastSyncAt: string | null
}

function readJSON(key: string): unknown {
  try {
    const text = localStorage.getItem(key)
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

/**
 * Carga la caché local. Si solo existen datos de la versión anterior (sin servidor),
 * los convierte en operaciones pendientes para subirlos al servidor sin perder nada.
 */
export function loadLocal(): LocalState {
  const cached = readJSON(CACHE_KEY)
  if (isObject(cached)) {
    const parsed = parseAppData(cached.data)
    const outbox = Array.isArray(cached.outbox)
      ? cached.outbox.map(parseOp).filter((op): op is SyncOp => op !== null)
      : []
    return {
      data: parsed.ok ? parsed.data : emptyData(),
      outbox,
      lastSyncAt: typeof cached.lastSyncAt === 'string' ? cached.lastSyncAt : null,
    }
  }

  const legacy = parseAppData(readJSON(LEGACY_KEY))
  if (legacy.ok && (legacy.data.trials.length > 0 || legacy.data.profile)) {
    const outbox: SyncOp[] = legacy.data.trials.map((trial) => ({ opId: newId(), type: 'upsertTrial', trial }))
    if (legacy.data.profile) outbox.push({ opId: newId(), type: 'mergeProfile', profile: legacy.data.profile })
    try {
      // Conservamos una copia por seguridad y retiramos la clave antigua para no migrar dos veces.
      localStorage.setItem(`${LEGACY_KEY}:migrado`, localStorage.getItem(LEGACY_KEY) ?? '')
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      // sin acceso a localStorage: se intentará en el próximo arranque
    }
    return { data: legacy.data, outbox, lastSyncAt: null }
  }

  return { data: emptyData(), outbox: [], lastSyncAt: null }
}

/** Guarda la caché local. Devuelve `false` si el navegador no lo permite. */
export function saveLocal(state: LocalState): boolean {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

/** Contenido del archivo de copia de seguridad. */
export function buildBackup(data: AppData, now: Date = new Date()): string {
  return JSON.stringify(
    {
      app: BACKUP_APP_ID,
      exportedAt: now.toISOString(),
      version: data.version,
      profile: data.profile,
      trials: data.trials,
      plan: data.plan,
    },
    null,
    2,
  )
}
