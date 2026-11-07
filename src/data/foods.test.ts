import { describe, expect, it } from 'vitest'
import { ALLERGENS } from './allergens'
import { CATEGORIES } from './categories'
import { FOODS } from './foods'

/** Comprueba que el catálogo editable sigue siendo coherente tras modificarlo. */
describe('catálogo de alimentos', () => {
  it('ids únicos y en formato válido', () => {
    const ids = FOODS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
  })

  it('categorías, edades y alérgenos válidos', () => {
    const cats = new Set(CATEGORIES.map((c) => c.id))
    const allergens = new Set(ALLERGENS.map((a) => a.id))
    for (const f of FOODS) {
      expect(cats.has(f.category), f.id).toBe(true)
      expect([6, 7, 9], f.id).toContain(f.minAge)
      expect(f.name.trim(), f.id).not.toBe('')
      expect(f.emoji.trim(), f.id).not.toBe('')
      expect(f.prep.trim(), f.id).not.toBe('')
      for (const a of f.allergens ?? []) expect(allergens.has(a), `${f.id}: ${a}`).toBe(true)
    }
  })

  it('todas las categorías tienen alimentos y todos los alérgenos aparecen', () => {
    for (const c of CATEGORIES) expect(FOODS.some((f) => f.category === c.id), c.id).toBe(true)
    for (const a of ALLERGENS) expect(FOODS.some((f) => f.allergens?.includes(a.id)), a.id).toBe(true)
  })
})
