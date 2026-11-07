import { describe, expect, it } from 'vitest'
import type { AppData, Trial } from '../types'
import { applyOp, applyOps } from './ops'

const t = (id: string, notes = ''): Trial => ({
  id,
  foodId: 'pera',
  date: '2026-11-01',
  liked: 'like',
  reaction: 'none',
  notes,
  createdAt: `2026-11-01T10:00:00.000Z`,
})

const empty: AppData = { version: 1, profile: null, trials: [], lastExportAt: null, plan: { perDay: 2, items: [] } }

describe('applyOp (cambios optimistas en el cliente)', () => {
  it('upsert añade y luego reemplaza conservando createdAt', () => {
    let d = applyOp(empty, { opId: '1', type: 'upsertTrial', trial: t('a') })
    d = applyOp(d, { opId: '2', type: 'upsertTrial', trial: { ...t('a', 'editada'), createdAt: '2099-01-01T00:00:00.000Z' } })
    expect(d.trials).toEqual([{ ...t('a', 'editada') }])
  })

  it('delete, perfil, merge, replaceAll, clearAll y markExported', () => {
    const d = applyOps(empty, [
      { opId: '1', type: 'upsertTrial', trial: t('a') },
      { opId: '2', type: 'upsertTrial', trial: t('b') },
      { opId: '3', type: 'deleteTrial', id: 'a' },
      { opId: '4', type: 'mergeProfile', profile: { name: 'Ana', birthDate: '' } },
      { opId: '5', type: 'mergeProfile', profile: { name: 'Otro', birthDate: '' } },
      { opId: '6', type: 'markExported', at: '2026-11-07T10:00:00.000Z' },
    ])
    expect(d.trials.map((x) => x.id)).toEqual(['b'])
    expect(d.profile?.name).toBe('Ana')
    expect(d.lastExportAt).toBe('2026-11-07T10:00:00.000Z')

    const replaced = applyOp(d, { opId: '7', type: 'replaceAll', profile: null, trials: [t('z')] })
    expect(replaced.trials.map((x) => x.id)).toEqual(['z'])
    expect(replaced.profile).toBeNull()

    expect(applyOp(replaced, { opId: '8', type: 'clearAll' })).toEqual(empty)
  })

  it('plan: crear, mover y quitar', () => {
    let d = applyOp(empty, {
      opId: 'p1',
      type: 'replacePlan',
      plan: { perDay: 1, items: [{ id: 'i1', foodId: 'pera', date: '2026-11-07' }, { id: 'i2', foodId: 'kiwi', date: '2026-11-08' }] },
    })
    d = applyOp(d, { opId: 'p2', type: 'movePlanItems', moves: [{ id: 'i1', date: '2026-11-09' }] })
    d = applyOp(d, { opId: 'p3', type: 'deletePlanItem', id: 'i2' })
    expect(d.plan).toEqual({ perDay: 1, items: [{ id: 'i1', foodId: 'pera', date: '2026-11-09' }] })
    // Importar una copia sin plan conserva el plan actual
    expect(applyOp(d, { opId: 'p4', type: 'replaceAll', profile: null, trials: [] }).plan.items).toHaveLength(1)
  })
})
