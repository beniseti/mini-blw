import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openStore } from './db.ts'
import { buildDemoData } from './demo.ts'

const trial = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  foodId: 'platano',
  date: '2026-11-01',
  liked: 'like',
  reaction: 'none',
  notes: '',
  createdAt: '2026-11-01T10:00:00.000Z',
  ...extra,
})

let n = 0
const upsert = (id: string, extra: Record<string, unknown> = {}) => ({
  opId: `op-${++n}`,
  type: 'upsertTrial',
  trial: trial(id, extra),
})

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('openStore: creación inicial', () => {
  it('crea el archivo y lo rellena con datos de ejemplo solo la primera vez', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bocaditos-'))
    dirs.push(dir)
    const file = join(dir, 'sub', 'bocaditos.db')

    const first = openStore(file, { seed: () => buildDemoData('2026-11-07') })
    expect(first.created).toBe(true)
    expect(first.seeded).toBe(true)
    expect(first.schemaVersion).toBe(2)
    const snap = first.store.snapshot()
    expect(snap.profile?.name).toBe('Lucía (demo)')
    expect(snap.trials.length).toBeGreaterThan(10)
    first.store.applyOps([{ opId: 'x', type: 'deleteTrial', id: snap.trials[0].id }])
    first.store.close()

    const second = openStore(file, { seed: () => buildDemoData('2026-11-07') })
    expect(second.created).toBe(false)
    expect(second.seeded).toBe(false)
    // Conserva el borrado: no vuelve a sembrar
    expect(second.store.snapshot().trials.length).toBe(snap.trials.length - 1)
    second.store.close()
  })

  it('sin seed, la base de datos nueva está vacía', () => {
    const { store, seeded } = openStore(':memory:')
    expect(seeded).toBe(false)
    expect(store.snapshot()).toEqual({ version: 1, profile: null, trials: [], lastExportAt: null, plan: { perDay: 2, items: [] } })
  })
})

describe('applyOps', () => {
  it('añade, edita y borra pruebas', () => {
    const { store } = openStore(':memory:')
    store.applyOps([upsert('a'), upsert('b')])
    store.applyOps([upsert('a', { liked: 'dislike', notes: 'editada', createdAt: '2030-01-01T00:00:00.000Z' })])
    store.applyOps([{ opId: 'del-b', type: 'deleteTrial', id: 'b' }])
    const trials = store.snapshot().trials
    expect(trials).toHaveLength(1)
    expect(trials[0]).toMatchObject({ id: 'a', liked: 'dislike', notes: 'editada' })
    // La fecha de creación original se conserva al editar
    expect(trials[0].createdAt).toBe('2026-11-01T10:00:00.000Z')
  })

  it('es idempotente: reenviar la misma operación no la repite', () => {
    const { store } = openStore(':memory:')
    const op = upsert('a')
    expect(store.applyOps([op])).toEqual({ applied: 1, rejected: 0 })
    expect(store.applyOps([op])).toEqual({ applied: 0, rejected: 0 })
    const clear = { opId: 'clear-1', type: 'clearAll' }
    store.applyOps([clear])
    store.applyOps([upsert('b')])
    store.applyOps([clear]) // reintento de un borrado antiguo: no debe borrar lo nuevo
    expect(store.snapshot().trials.map((t) => t.id)).toEqual(['b'])
  })

  it('una prueba borrada no "resucita" desde un móvil sin conexión', () => {
    const { store } = openStore(':memory:')
    store.applyOps([upsert('a')])
    store.applyOps([{ opId: 'd', type: 'deleteTrial', id: 'a' }])
    store.applyOps([upsert('a', { notes: 'editada offline' })])
    expect(store.snapshot().trials).toHaveLength(0)
  })

  it('rechaza operaciones inválidas sin afectar a las válidas', () => {
    const { store } = openStore(':memory:')
    const result = store.applyOps([
      upsert('ok'),
      { opId: 'bad-1', type: 'upsertTrial', trial: { ...trial('x'), liked: 'mucho' } },
      { opId: 'bad-2', type: 'upsertTrial', trial: { ...trial('x'), id: undefined } },
      { type: 'clearAll' },
      { opId: 'bad-3', type: 'desconocida' },
      'basura',
    ])
    expect(result).toEqual({ applied: 1, rejected: 5 })
    expect(store.snapshot().trials).toHaveLength(1)
  })

  it('perfil: set, merge (solo si no hay) y borrar', () => {
    const { store } = openStore(':memory:')
    store.applyOps([{ opId: 'm1', type: 'mergeProfile', profile: { name: 'Ana', birthDate: '2026-04-01' } }])
    store.applyOps([{ opId: 'm2', type: 'mergeProfile', profile: { name: 'Otro', birthDate: '2026-01-01' } }])
    expect(store.snapshot().profile).toEqual({ name: 'Ana', birthDate: '2026-04-01' })
    store.applyOps([{ opId: 's1', type: 'setProfile', profile: { name: 'Lucía', birthDate: '2026-04-02' } }])
    expect(store.snapshot().profile?.name).toBe('Lucía')
    store.applyOps([{ opId: 's2', type: 'setProfile', profile: null }])
    expect(store.snapshot().profile).toBeNull()
  })

  it('replaceAll (importar) sustituye todo y permite reimportar pruebas borradas', () => {
    const { store } = openStore(':memory:')
    store.applyOps([upsert('a'), upsert('b')])
    store.applyOps([{ opId: 'del-a', type: 'deleteTrial', id: 'a' }])
    store.applyOps([
      { opId: 'imp', type: 'replaceAll', profile: { name: 'Ana', birthDate: '' }, trials: [trial('a'), trial('c')] },
    ])
    const snap = store.snapshot()
    expect(snap.trials.map((t) => t.id).sort()).toEqual(['a', 'c'])
    expect(snap.profile?.name).toBe('Ana')
    // 'b' quedó fuera de la importación: si un móvil la reenvía, no vuelve
    store.applyOps([upsert('b')])
    expect(store.snapshot().trials.map((t) => t.id).sort()).toEqual(['a', 'c'])
  })

  it('clearAll y markExported', () => {
    const { store } = openStore(':memory:')
    store.applyOps([upsert('a'), { opId: 'e', type: 'markExported', at: '2026-11-07T10:00:00.000Z' }])
    expect(store.snapshot().lastExportAt).toBe('2026-11-07T10:00:00.000Z')
    store.applyOps([{ opId: 'c', type: 'clearAll' }])
    expect(store.snapshot()).toEqual({ version: 1, profile: null, trials: [], lastExportAt: null, plan: { perDay: 2, items: [] } })
  })
})

describe('plan de comidas', () => {
  const plan = {
    perDay: 1,
    items: [
      { id: 'i1', foodId: 'pera', date: '2026-11-07' },
      { id: 'i2', foodId: 'kiwi', date: '2026-11-08' },
    ],
  }

  it('crear, mover, quitar y borrar todo', () => {
    const { store } = openStore(':memory:')
    store.applyOps([{ opId: 'p1', type: 'replacePlan', plan }])
    expect(store.snapshot().plan).toEqual(plan)
    store.applyOps([{ opId: 'p2', type: 'movePlanItems', moves: [{ id: 'i1', date: '2026-11-09' }] }])
    store.applyOps([{ opId: 'p3', type: 'deletePlanItem', id: 'i2' }])
    expect(store.snapshot().plan).toEqual({ perDay: 1, items: [{ id: 'i1', foodId: 'pera', date: '2026-11-09' }] })
    store.applyOps([{ opId: 'p4', type: 'clearAll' }])
    expect(store.snapshot().plan).toEqual({ perDay: 2, items: [] })
  })

  it('importar con plan lo sustituye; sin plan lo conserva', () => {
    const { store } = openStore(':memory:')
    store.applyOps([{ opId: 'p1', type: 'replacePlan', plan }])
    store.applyOps([{ opId: 'r1', type: 'replaceAll', profile: null, trials: [] }])
    expect(store.snapshot().plan.items).toHaveLength(2)
    store.applyOps([{ opId: 'r2', type: 'replaceAll', profile: null, trials: [], plan: { perDay: 2, items: [] } }])
    expect(store.snapshot().plan).toEqual({ perDay: 2, items: [] })
  })

  it('una base de datos de la versión anterior (esquema v1) se actualiza sola', async () => {
    const { DatabaseSync } = await import('node:sqlite')
    const dir = mkdtempSync(join(tmpdir(), 'bocaditos-'))
    dirs.push(dir)
    const file = join(dir, 'old.db')
    // Crea una BD con el esquema v1 y una prueba
    const first = openStore(file)
    first.store.applyOps([upsert('vieja')])
    first.store.close()
    const raw = new DatabaseSync(file)
    raw.exec('DROP TABLE plan_items; PRAGMA user_version = 1')
    raw.close()
    // Al abrirla, migra a v2 conservando los datos
    const second = openStore(file)
    expect(second.schemaVersion).toBe(2)
    expect(second.store.snapshot().trials.map((t) => t.id)).toEqual(['vieja'])
    second.store.applyOps([{ opId: 'p', type: 'replacePlan', plan }])
    expect(second.store.snapshot().plan.items).toHaveLength(2)
    second.store.close()
  })
})
