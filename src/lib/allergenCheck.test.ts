import { describe, expect, it } from 'vitest'
import type { Food, Trial } from '../types'
import { checkNewAllergen, firstIntroductions, latestIntroduction } from './allergenCheck'

const food = (id: string, allergens?: Food['allergens']): Food => ({
  id,
  name: id,
  emoji: '🍽️',
  category: 'proteinas',
  minAge: 6,
  prep: '',
  allergens,
})

const FOODS = new Map<string, Food>(
  [
    food('huevo', ['huevo']),
    food('merluza', ['pescado']),
    food('salmon', ['pescado']),
    food('pan', ['gluten']),
    food('tortita', ['huevo', 'gluten']),
    food('platano'),
  ].map((f) => [f.id, f]),
)

let n = 0
const trial = (foodId: string, date: string): Trial => ({
  id: `t${++n}`,
  foodId,
  date,
  liked: 'like',
  reaction: 'none',
  notes: '',
  createdAt: `${date}T10:00:00.000Z`,
})

describe('firstIntroductions', () => {
  it('guarda la fecha más temprana de cada alérgeno', () => {
    const intro = firstIntroductions(
      [trial('salmon', '2026-05-10'), trial('merluza', '2026-05-03'), trial('pan', '2026-05-07')],
      FOODS,
    )
    expect(intro.get('pescado')).toBe('2026-05-03')
    expect(intro.get('gluten')).toBe('2026-05-07')
    expect(intro.has('huevo')).toBe(false)
  })
})

describe('checkNewAllergen', () => {
  it('no avisa si el alimento no tiene alérgenos', () => {
    expect(checkNewAllergen(FOODS.get('platano')!, '2026-05-02', [trial('huevo', '2026-05-01')], FOODS)).toBeNull()
  })

  it('avisa si otro alérgeno nuevo se introdujo hace menos de 3 días', () => {
    const w = checkNewAllergen(FOODS.get('merluza')!, '2026-05-03', [trial('huevo', '2026-05-01')], FOODS)
    expect(w).not.toBeNull()
    expect(w!.newAllergens).toEqual(['pescado'])
    expect(w!.recent).toEqual([{ allergen: 'huevo', date: '2026-05-01', diffDays: 2 }])
  })

  it('no avisa cuando han pasado 3 días o más', () => {
    expect(checkNewAllergen(FOODS.get('merluza')!, '2026-05-04', [trial('huevo', '2026-05-01')], FOODS)).toBeNull()
  })

  it('no avisa si el alérgeno ya estaba introducido (otro pescado)', () => {
    const trials = [trial('merluza', '2026-05-01'), trial('huevo', '2026-05-05')]
    expect(checkNewAllergen(FOODS.get('salmon')!, '2026-05-06', trials, FOODS)).toBeNull()
  })

  it('el mismo día también cuenta como menos de 3 días', () => {
    const w = checkNewAllergen(FOODS.get('pan')!, '2026-05-01', [trial('huevo', '2026-05-01')], FOODS)
    expect(w?.recent[0].diffDays).toBe(0)
  })

  it('tiene en cuenta registros retroactivos (alérgeno introducido después)', () => {
    const w = checkNewAllergen(FOODS.get('pan')!, '2026-05-01', [trial('huevo', '2026-05-02')], FOODS)
    expect(w?.recent[0].diffDays).toBe(-1)
  })

  it('avisa si un alimento introduce varios alérgenos nuevos a la vez', () => {
    const w = checkNewAllergen(FOODS.get('tortita')!, '2026-05-10', [], FOODS)
    expect(w?.multipleNew).toBe(true)
    expect(w?.newAllergens).toEqual(['huevo', 'gluten'])
  })

  it('ignora la prueba que se está editando', () => {
    const edited = trial('huevo', '2026-05-01')
    // Si editamos la única prueba de huevo, el huevo vuelve a ser "nuevo" y no hay otros alérgenos
    expect(checkNewAllergen(FOODS.get('huevo')!, '2026-05-01', [edited], FOODS, edited.id)).toBeNull()
  })

  it('la primera prueba de un alérgeno ya registrada antes no es nueva', () => {
    const trials = [trial('huevo', '2026-05-01'), trial('pan', '2026-05-02')]
    // Segunda prueba de huevo: no introduce nada nuevo
    expect(checkNewAllergen(FOODS.get('huevo')!, '2026-05-02', trials, FOODS)).toBeNull()
  })
})

describe('latestIntroduction', () => {
  it('devuelve el alérgeno introducido más recientemente', () => {
    const intro = firstIntroductions([trial('huevo', '2026-05-01'), trial('pan', '2026-05-04')], FOODS)
    expect(latestIntroduction(intro)).toEqual({ allergens: ['gluten'], date: '2026-05-04' })
  })
  it('null sin alérgenos', () => {
    expect(latestIntroduction(new Map())).toBeNull()
  })
})
