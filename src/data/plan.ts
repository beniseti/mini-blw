import type { CategoryId } from '../types'

/**
 * ORDEN DEL PLAN DE COMIDAS
 * -------------------------
 * Primeros alimentos que propone el plan, en este orden (ids de src/data/foods.ts).
 * Se priorizan alimentos ricos en hierro, verduras y frutas fáciles de preparar,
 * y los alérgenos van repartidos. Puedes reordenar, añadir o quitar ids.
 *
 * Los alimentos que no estén en esta lista se añaden después, alternando
 * categorías (ver PLAN_CATEGORY_ORDER), y las hierbas y especias al final.
 *
 * El plan siempre respeta, además:
 *  - la edad mínima de cada alimento según la edad del bebé ese día,
 *  - un único alérgeno nuevo por día (y ese día, solo ese alimento),
 *  - al menos 3 días entre alérgenos nuevos.
 */
export const PLAN_FIRST_FOODS: string[] = [
  'brocoli',
  'platano',
  'calabaza',
  'aguacate',
  'ternera',
  'pera',
  'boniato',
  'huevo',
  'calabacin',
  'lentejas',
  'zanahoria',
  'manzana',
  'pollo',
  'pan',
  'merluza',
  'patata',
  'mango',
  'yogur',
  'garbanzos',
  'judias-verdes',
  'melocoton',
  'arroz',
  'crema-cacahuete',
  'pimiento',
  'salmon',
  'quinoa',
  'kiwi',
  'alubias',
  'tahini',
  'coliflor',
  'pasta',
  'avena',
  'crema-almendra',
  'sandia',
  'tofu',
  'queso-fresco',
  'fresas',
  'cordero',
]

/** Orden en que se alternan las categorías para el resto de alimentos. */
export const PLAN_CATEGORY_ORDER: CategoryId[] = ['verduras', 'frutas', 'proteinas', 'cereales', 'lacteos', 'grasas']

/** Cuántos días mostrar del plan antes del botón «Ver más». */
export const PLAN_DAYS_VISIBLE = 10
