import { ALLERGEN_BY_ID } from '../../data/allergens'
import type { AllergenId } from '../../types'

export function AllergenChips({ allergens, size = 'md' }: { allergens: AllergenId[]; size?: 'sm' | 'md' }) {
  if (allergens.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Alérgenos">
      {allergens.map((id) => {
        const a = ALLERGEN_BY_ID[id]
        return (
          <li
            key={id}
            className={`inline-flex items-center gap-1 rounded-full bg-amber-100 font-bold text-amber-700 ring-1 ring-amber-200 ${
              size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
            }`}
          >
            <span aria-hidden="true">{a.emoji}</span>
            {a.name}
          </li>
        )
      })}
    </ul>
  )
}
