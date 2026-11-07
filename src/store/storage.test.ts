import { describe, expect, it } from 'vitest'
import { buildBackup, emptyData, parseAppData } from './storage'

const validTrial = {
  id: 't1',
  foodId: 'huevo',
  date: '2026-05-01',
  liked: 'like',
  reaction: 'none',
  notes: 'Muy bien',
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

  it('rechaza archivos de otras apps o formatos', () => {
    expect(parseAppData(null).ok).toBe(false)
    expect(parseAppData([]).ok).toBe(false)
    expect(parseAppData({ app: 'otra-app', version: 1, trials: [] }).ok).toBe(false)
    expect(parseAppData({ version: 2, trials: [] }).ok).toBe(false)
    expect(parseAppData({ version: 1 }).ok).toBe(false)
  })
})
