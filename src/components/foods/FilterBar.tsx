import { useState } from 'react'
import { ALLERGENS } from '../../data/allergens'
import { CATEGORIES } from '../../data/categories'
import { activeFilterCount, DEFAULT_FILTERS, type Filters } from '../../lib/filters'
import { Chip } from '../ui/Chip'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  hasProfile: boolean
}

const STATUS_CHIPS: { value: Filters['status']; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'untried', label: '○ No probados' },
  { value: 'tried', label: '✓ Probados' },
  { value: 'reaction', label: '⚠️ Con reacción' },
]

export function FilterBar({ filters, onChange, hasProfile }: Props) {
  const [open, setOpen] = useState(false)
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value })
  const count = activeFilterCount(filters)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Buscar alimento</span>
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Buscar alimento…"
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl bg-white pr-4 pl-12 font-semibold text-ink shadow-sm ring-1 ring-line placeholder:text-ink-soft/70 focus:ring-2 focus:ring-lilac-300 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="filter-panel"
          className={`relative flex h-12 shrink-0 items-center gap-1.5 rounded-2xl px-4 font-bold shadow-sm ring-1 ${
            open || count > 0 ? 'bg-lilac-200 text-lilac-700 ring-lilac-300' : 'bg-white text-ink ring-line'
          }`}
        >
          <span aria-hidden="true">⚙️</span> Filtros
          {count > 0 && (
            <span className="ml-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-lilac-700 px-1.5 text-xs text-white">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* Categorías siempre visibles, desplazables en horizontal */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Categoría">
        <Chip active={filters.category === 'all'} onClick={() => set('category', 'all')}>
          Todas
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            active={filters.category === c.id}
            onClick={() => set('category', filters.category === c.id ? 'all' : c.id)}
          >
            <span aria-hidden="true">{c.emoji}</span> {c.name}
          </Chip>
        ))}
      </div>

      {open && (
        <div id="filter-panel" className="flex animate-pop flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-line">
          <div role="group" aria-labelledby="f-status">
            <p id="f-status" className="mb-2 text-sm font-bold text-ink-soft">
              Estado
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_CHIPS.map((s) => (
                <Chip key={s.value} active={filters.status === s.value} onClick={() => set('status', s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          <div role="group" aria-labelledby="f-allergen">
            <p id="f-allergen" className="mb-2 text-sm font-bold text-ink-soft">
              Alérgenos
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip active={filters.allergen === 'all'} onClick={() => set('allergen', 'all')}>
                Todos
              </Chip>
              <Chip active={filters.allergen === 'any'} onClick={() => set('allergen', 'any')}>
                Solo alérgenos
              </Chip>
              <Chip active={filters.allergen === 'none'} onClick={() => set('allergen', 'none')}>
                Sin alérgenos
              </Chip>
              {ALLERGENS.map((a) => (
                <Chip
                  key={a.id}
                  active={filters.allergen === a.id}
                  onClick={() => set('allergen', filters.allergen === a.id ? 'all' : a.id)}
                  activeClass="bg-amber-200 text-amber-700 ring-amber-300"
                >
                  <span aria-hidden="true">{a.emoji}</span> {a.name}
                </Chip>
              ))}
            </div>
          </div>

          <div role="group" aria-labelledby="f-other">
            <p id="f-other" className="mb-2 text-sm font-bold text-ink-soft">
              Otros
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={filters.ironOnly}
                onClick={() => set('ironOnly', !filters.ironOnly)}
                activeClass="bg-rose-200 text-rose-700 ring-rose-300"
              >
                🩸 Rico en hierro
              </Chip>
              {hasProfile && (
                <Chip active={filters.ageOnly} onClick={() => set('ageOnly', !filters.ageOnly)}>
                  ✨ Adecuados para su edad
                </Chip>
              )}
            </div>
          </div>

          {count > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_FILTERS, query: filters.query })}
              className="self-start text-sm font-bold text-lilac-700 underline underline-offset-4"
            >
              Quitar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
