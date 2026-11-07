import { useDeferredValue, useMemo } from 'react'
import { CATEGORIES } from '../data/categories'
import { FOODS } from '../data/foods'
import { isSuitable } from '../lib/age'
import { progressFor, statusOf } from '../lib/status'
import { normalize } from '../lib/text'
import { useStore } from '../store/AppStore'
import type { Food } from '../types'
import { AppHeader } from '../components/layout/AppHeader'
import { CategorySection } from '../components/foods/CategorySection'
import { FilterBar } from '../components/foods/FilterBar'
import { activeFilterCount, DEFAULT_FILTERS, type Filters } from '../lib/filters'
import { Button } from '../components/ui/Button'

interface Props {
  filters: Filters
  onFiltersChange: (f: Filters) => void
  onOpenFood: (foodId: string) => void
}

export function FoodsPage({ filters, onFiltersChange, onOpenFood }: Props) {
  const { stats, age, data } = useStore()
  const months = age?.months ?? null
  const query = useDeferredValue(filters.query)
  const hasProfile = !!data.profile?.birthDate

  const visible = useMemo(() => {
    const q = normalize(query)
    return FOODS.filter((f: Food) => {
      if (q && !normalize(f.name).includes(q)) return false
      if (filters.category !== 'all' && f.category !== filters.category) return false
      if (filters.status !== 'all' && statusOf(stats.get(f.id)) !== filters.status) return false
      const allergens = f.allergens ?? []
      if (filters.allergen === 'any' && allergens.length === 0) return false
      if (filters.allergen === 'none' && allergens.length > 0) return false
      if (filters.allergen !== 'all' && filters.allergen !== 'any' && filters.allergen !== 'none' && !allergens.includes(filters.allergen))
        return false
      if (filters.ironOnly && !f.iron) return false
      if (filters.ageOnly && hasProfile && !isSuitable(f.minAge, months)) return false
      return true
    })
  }, [query, filters, stats, months, hasProfile])

  const total = progressFor(FOODS, stats)
  const filtering = activeFilterCount(filters) > 0 || query.trim() !== ''

  return (
    <>
      <AppHeader title="Alimentos" subtitle={`${total.tried} de ${total.total} probados`} />
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-6">
        <FilterBar filters={filters} onChange={onFiltersChange} hasProfile={hasProfile} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs font-bold text-ink-soft" aria-label="Leyenda">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded border-2 border-dashed border-ink-soft/40 bg-white" /> No probado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-mint-300" /> Probado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-amber-300" /> Leve
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-rose-300" /> Preocupante
          </span>
          {hasProfile && (
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded border-2 border-lilac-300 bg-white" /> Para su edad
            </span>
          )}
          <span>🩸 Hierro</span>
        </div>

        {filtering && (
          <p className="px-1 text-sm font-bold text-ink-soft" aria-live="polite">
            {visible.length} {visible.length === 1 ? 'alimento' : 'alimentos'}
          </p>
        )}

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center ring-1 ring-line">
            <span className="text-5xl" aria-hidden="true">
              🔎
            </span>
            <p className="font-bold text-ink">No hay alimentos que coincidan.</p>
            <Button variant="soft" onClick={() => onFiltersChange(DEFAULT_FILTERS)}>
              Quitar búsqueda y filtros
            </Button>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const foods = visible.filter((f) => f.category === cat.id)
            if (foods.length === 0) return null
            const p = progressFor(
              FOODS.filter((f) => f.category === cat.id),
              stats,
            )
            return (
              <CategorySection
                key={cat.id}
                category={cat}
                foods={foods}
                tried={p.tried}
                total={p.total}
                stats={stats}
                months={months}
                onOpen={onOpenFood}
              />
            )
          })
        )}
      </div>
    </>
  )
}
