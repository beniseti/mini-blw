import { describe, expect, it } from 'vitest'
import type { Food, Trial } from '../types'
import { computeFoodStats, progressFor, retryFoods, statusOf, visualStatus } from './status'

const t = (foodId: string, date: string, reaction: Trial['reaction'] = 'none', retry = false): Trial => ({
  id: `${foodId}-${date}-${reaction}`,
  foodId,
  date,
  liked: 'like',
  reaction,
  notes: '',
  retry,
  createdAt: `${date}T10:00:00.000Z`,
})

describe('computeFoodStats', () => {
  it('cuenta pruebas y guarda la peor reacción y la última fecha', () => {
    const stats = computeFoodStats([t('huevo', '2026-05-01', 'mild'), t('huevo', '2026-05-08'), t('pera', '2026-05-02')])
    expect(stats.get('huevo')).toMatchObject({ count: 2, worstReaction: 'mild', lastDate: '2026-05-08' })
    expect(stats.get('pera')).toMatchObject({ count: 1, worstReaction: 'none' })
  })

  it('estado y estado visual', () => {
    const stats = computeFoodStats([t('a', '2026-05-01'), t('b', '2026-05-01', 'mild'), t('c', '2026-05-01', 'severe'), t('c', '2026-05-02', 'mild')])
    expect(statusOf(stats.get('x'))).toBe('untried')
    expect(statusOf(stats.get('a'))).toBe('tried')
    expect(statusOf(stats.get('b'))).toBe('reaction')
    expect(visualStatus(stats.get('b'))).toBe('mild')
    expect(visualStatus(stats.get('c'))).toBe('severe')
  })
})

describe('progressFor', () => {
  it('cuenta alimentos probados (también con reacción)', () => {
    const foods = ['a', 'b', 'c', 'd'].map((id) => ({ id }) as Food)
    const stats = computeFoodStats([t('a', '2026-05-01'), t('b', '2026-05-01', 'severe'), t('a', '2026-05-02')])
    expect(progressFor(foods, stats)).toEqual({ tried: 2, total: 4, pct: 50 })
    expect(progressFor([], stats)).toEqual({ tried: 0, total: 0, pct: 0 })
  })
})

describe('volver a probar', () => {
  it('lo decide la prueba más reciente', () => {
    const marked = computeFoodStats([t('a', '2026-05-01'), t('a', '2026-05-03', 'none', true)])
    expect(marked.get('a')!.retry).toBe(true)
    expect(visualStatus(marked.get('a'))).toBe('retry')
    expect(statusOf(marked.get('a'))).toBe('tried') // cuenta como probado
    // Una prueba posterior sin la marca la resuelve
    const resolved = computeFoodStats([t('a', '2026-05-03', 'none', true), t('a', '2026-05-05')])
    expect(resolved.get('a')!.retry).toBe(false)
    expect(visualStatus(resolved.get('a'))).toBe('tried')
  })

  it('una reacción tiene prioridad visual, pero la marca se conserva', () => {
    const stats = computeFoodStats([t('a', '2026-05-01', 'mild', true)])
    expect(visualStatus(stats.get('a'))).toBe('mild')
    expect(stats.get('a')!.retry).toBe(true)
  })

  it('retryFoods ordena por los que hace más que no prueba', () => {
    const stats = computeFoodStats([t('a', '2026-05-09', 'none', true), t('b', '2026-05-02', 'none', true), t('c', '2026-05-01')])
    const foods = ['a', 'b', 'c'].map((id) => ({ id }))
    expect(retryFoods(foods, stats).map((f) => f.id)).toEqual(['b', 'a'])
  })
})
