import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup, CACHE_KEY, emptyData, LEGACY_KEY, loadLocal, parseAppData, saveLocal } from './storage'

const validTrial = {
  id: 't1',
  foodId: 'huevo',
  date: '2026-05-01',
  liked: 'like',
  reaction: 'none',
  notes: 'Muy bien',
  retry: false,
  createdAt: '2026-05-01T10:00:00.000Z',
}

describe('parseAppData', () => {
  it('acepta una copia de seguridad exportada (ida y vuelta)', () => {
    const data = { ...emptyData(), profile: { name: 'Lucía', birthDate: '2025-11-01' }, trials: [validTrial] }
    const result = parseAppData(JSON.parse(buildBackup(data as never)))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.skipped).toBe(0)
      expect(result.data.profile).toEqual({ name: 'Lucía', birthDate: '2025-11-01' })
      expect(result.data.trials).toEqual([validTrial])
    }
  })

  it('descarta pruebas inválidas y lo informa', () => {
    const result = parseAppData({
      version: 1,
      profile: null,
      trials: [validTrial, { ...validTrial, id: 't2', date: '2026-13-01' }, { ...validTrial, id: 't3', liked: 'mucho' }, 'x'],
    })
    expect(result.ok && result.skipped).toBe(3)
    expect(result.ok && result.data.trials.length).toBe(1)
  })

  it('completa campos opcionales y repara ids duplicados', () => {
    const { id: _id, notes: _notes, createdAt: _c, ...minimal } = validTrial
    const result = parseAppData({ version: 1, trials: [minimal, validTrial, validTrial] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const ids = result.data.trials.map((t) => t.id)
      expect(new Set(ids).size).toBe(3)
      expect(result.data.trials[0].notes).toBe('')
      expect(result.data.profile).toBeNull()
    }
  })

  it('copias antiguas sin "volver a probar": se asume que no', () => {
    const { retry: _r, ...old } = validTrial
    const result = parseAppData({ version: 1, trials: [old, { ...validTrial, id: 't2', retry: true }] })
    expect(result.ok && result.data.trials.map((t) => t.retry)).toEqual([false, true])
  })

  it('rechaza archivos de otras apps o formatos', () => {
    expect(parseAppData(null).ok).toBe(false)
    expect(parseAppData([]).ok).toBe(false)
    expect(parseAppData({ app: 'otra-app', version: 1, trials: [] }).ok).toBe(false)
    expect(parseAppData({ version: 2, trials: [] }).ok).toBe(false)
    expect(parseAppData({ version: 1 }).ok).toBe(false)
  })
})

/** localStorage mínimo para los tests (entorno Node). */
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v))
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  keys() {
    return [...this.map.keys()]
  }
}

describe('caché local y migración', () => {
  let storage: MemoryStorage
  beforeEach(() => {
    storage = new MemoryStorage()
    ;(globalThis as { localStorage?: unknown }).localStorage = storage
  })

  it('sin nada guardado devuelve estado vacío', () => {
    expect(loadLocal()).toEqual({ data: emptyData(), outbox: [], lastSyncAt: null })
  })

  it('guarda y recupera datos, cola y última sincronización', () => {
    const state = {
      data: { ...emptyData(), trials: [validTrial] },
      outbox: [{ opId: 'o1', type: 'deleteTrial' as const, id: 'x' }],
      lastSyncAt: '2026-11-07T10:00:00.000Z',
    }
    expect(saveLocal(state as never)).toBe(true)
    expect(loadLocal()).toEqual(state)
  })

  it('convierte los datos de la versión anterior (solo navegador) en cambios pendientes', () => {
    storage.setItem(
      LEGACY_KEY,
      JSON.stringify({ version: 1, profile: { name: 'Lucía', birthDate: '2026-04-01' }, trials: [validTrial], lastExportAt: null }),
    )
    const state = loadLocal()
    expect(state.data.trials).toHaveLength(1)
    expect(state.outbox.map((o) => o.type)).toEqual(['upsertTrial', 'mergeProfile'])
    // La clave antigua se retira (con copia de seguridad) para no migrar dos veces
    expect(storage.getItem(LEGACY_KEY)).toBeNull()
    expect(storage.keys()).toContain(`${LEGACY_KEY}:migrado`)
    expect(storage.getItem(CACHE_KEY)).toBeNull() // la guarda el store al arrancar
  })
})
