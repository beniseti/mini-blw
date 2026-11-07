import type { Category } from '../../data/categories'
import { isSuitable } from '../../lib/age'
import type { FoodStats } from '../../lib/status'
import type { Food } from '../../types'
import { ProgressBar } from '../progress/ProgressBar'
import { FoodCard } from './FoodCard'

interface Props {
  category: Category
  foods: Food[]
  /** Progreso de la categoría completa (no solo de los alimentos filtrados). */
  tried: number
  total: number
  stats: Map<string, FoodStats>
  months: number | null
  onOpen: (foodId: string) => void
}

export function CategorySection({ category, foods, tried, total, stats, months, onOpen }: Props) {
  const headingId = `cat-${category.id}`
  return (
    <section aria-labelledby={headingId} className={`rounded-3xl p-3 ${category.styles.soft}`}>
      <div className="mb-3 flex items-center gap-3 px-1">
        <span className="text-2xl" aria-hidden="true">
          {category.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id={headingId} className="truncate text-lg font-extrabold text-ink">
              {category.name}
            </h2>
            <span className="shrink-0 text-sm font-bold text-ink-soft">
              {tried}/{total}
            </span>
          </div>
          <div className="mt-1">
            <ProgressBar
              value={tried}
              max={total}
              barClass={category.styles.bar}
              trackClass="bg-white/80"
              label={`Progreso en ${category.name}`}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 min-[480px]:grid-cols-4">
        {foods.map((food) => (
          <FoodCard
            key={food.id}
            food={food}
            stats={stats.get(food.id)}
            suitable={isSuitable(food.minAge, months)}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  )
}
