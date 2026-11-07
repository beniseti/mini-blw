import { describe, expect, it } from 'vitest'
import { formatAge, getAge, isSuitable, stageFor } from './age'

describe('getAge', () => {
  it('meses y días cumplidos', () => {
    expect(getAge('2026-01-15', '2026-07-20')).toEqual({ months: 6, days: 5 })
    expect(getAge('2026-01-15', '2026-07-14')).toEqual({ months: 5, days: 29 })
    expect(getAge('2026-01-15', '2026-01-15')).toEqual({ months: 0, days: 0 })
  })
  it('nacidos a final de mes', () => {
    expect(getAge('2026-01-31', '2026-02-28')).toEqual({ months: 1, days: 0 })
    expect(getAge('2026-03-31', '2026-05-01')).toEqual({ months: 1, days: 1 })
  })
  it('cruza años', () => {
    expect(getAge('2025-11-20', '2026-06-20')).toEqual({ months: 7, days: 0 })
  })
  it('fecha futura o inválida', () => {
    expect(getAge('2026-08-01', '2026-07-01')).toBeNull()
    expect(getAge('2026-02-30', '2026-07-01')).toBeNull()
  })
})

describe('formatAge', () => {
  it('formatea en español', () => {
    expect(formatAge({ months: 7, days: 1 })).toBe('7 meses y 1 día')
    expect(formatAge({ months: 1, days: 0 })).toBe('1 mes')
    expect(formatAge({ months: 14, days: 3 })).toBe('1 año y 2 meses')
    expect(formatAge({ months: 24, days: 0 })).toBe('2 años')
  })
})

describe('stageFor / isSuitable', () => {
  it('etapas', () => {
    expect(stageFor(5)).toBeNull()
    expect(stageFor(6)).toBe(6)
    expect(stageFor(8)).toBe(7)
    expect(stageFor(9)).toBe(9)
    expect(stageFor(15)).toBe(9)
  })
  it('adecuación por edad', () => {
    expect(isSuitable(6, null)).toBeNull()
    expect(isSuitable(6, 5)).toBe(false)
    expect(isSuitable(6, 6)).toBe(true)
    expect(isSuitable(7, 6)).toBe(false)
    expect(isSuitable(7, 8)).toBe(true)
    expect(isSuitable(9, 8)).toBe(false)
    expect(isSuitable(9, 10)).toBe(true)
  })
})
