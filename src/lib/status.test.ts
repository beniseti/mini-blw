import { describe, expect, it } from 'vitest'
import type { Food, Trial } from '../types'
import { computeFoodStats, progressFor, statusOf, visualStatus } from './status'

const t = (foodId: string, date: string, reaction: Trial['reaction'] = 'none'): Trial => ({
  id: `${foodId}-${date}-${reaction}`,
  foodId,
  date,
  liked: 'like',
  reaction,
  notes: '',
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
