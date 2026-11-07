import { CATEGORIES } from '../../data/categories'
import { FOODS } from '../../data/foods'
import { progressFor, type FoodStats } from '../../lib/status'
import type { CategoryId } from '../../types'
import { ProgressBar } from './ProgressBar'

interface Props {
  stats: Map<string, FoodStats>
  onSelect?: (category: CategoryId) => void
}

export function CategoryProgress({ stats, onSelect }: Props) {
  return (
    <ul className="flex flex-col gap-1">
      {CATEGORIES.map((cat) => {
        const foods = FOODS.filter((f) => f.category === cat.id)
        const p = progressFor(foods, stats)
        return (
          <li key={cat.id}>
            <button
              type="button"
              onClick={() => onSelect?.(cat.id)}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-cream active:bg-line/40"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${cat.styles.soft}`} aria-hidden="true">
                {cat.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-bold text-ink">{cat.name}</span>
                  <span className="shrink-0 text-sm font-bold text-ink-soft">
                    {p.tried}/{p.total}
                  </span>
                </span>
                <span className="mt-1 block">
                  <ProgressBar value={p.tried} max={p.total} barClass={cat.styles.bar} label={`Progreso en ${cat.name}`} />
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
