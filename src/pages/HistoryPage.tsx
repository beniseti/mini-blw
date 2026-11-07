import { useMemo, useState } from 'react'
import { FOOD_BY_ID } from '../data/foods'
import { formatDayLabel } from '../lib/dates'
import { compareTrialsDesc } from '../lib/status'
import { useStore } from '../store/AppStore'
import type { Food, Trial } from '../types'
import { AppHeader } from '../components/layout/AppHeader'
import { TrialItem } from '../components/trials/TrialItem'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'

const UNKNOWN_FOOD: Food = { id: '?', name: 'Alimento desconocido', emoji: '❓', category: 'verduras', minAge: 6, prep: '' }

type Filter = 'all' | 'reaction' | 'allergen'

interface Props {
  onOpenTrial: (foodId: string, trialId: string) => void
  onGoTab: (path: string) => void
}

export function HistoryPage({ onOpenTrial, onGoTab }: Props) {
  const { data, today } = useStore()
  const [filter, setFilter] = useState<Filter>('all')

  const groups = useMemo(() => {
    const sorted = [...data.trials].sort(compareTrialsDesc).filter((t) => {
      if (filter === 'reaction') return t.reaction !== 'none'
      if (filter === 'allergen') return (FOOD_BY_ID.get(t.foodId)?.allergens?.length ?? 0) > 0
      return true
    })
    const map = new Map<string, Trial[]>()
    for (const t of sorted) {
      const list = map.get(t.date)
      if (list) list.push(t)
      else map.set(t.date, [t])
    }
    return [...map]
  }, [data.trials, filter])

  const count = data.trials.length

  return (
    <>
      <AppHeader title="Historial" subtitle={`${count} ${count === 1 ? 'prueba registrada' : 'pruebas registradas'}`} />
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-6">
        {count === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center ring-1 ring-line">
            <span className="text-5xl" aria-hidden="true">
              📅
            </span>
            <p className="font-bold text-ink">Aquí verás todas las pruebas en orden cronológico.</p>
            <Button onClick={() => onGoTab('/alimentos')}>Registrar la primera</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar historial">
              <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
                Todas
              </Chip>
              <Chip
                active={filter === 'reaction'}
                onClick={() => setFilter('reaction')}
                activeClass="bg-amber-200 text-amber-700 ring-amber-300"
              >
                ⚠️ Con reacción
              </Chip>
              <Chip
                active={filter === 'allergen'}
                onClick={() => setFilter('allergen')}
                activeClass="bg-amber-200 text-amber-700 ring-amber-300"
              >
                Alérgenos
              </Chip>
            </div>

            {groups.length === 0 && (
              <p className="rounded-2xl bg-white p-4 text-center font-semibold text-ink-soft ring-1 ring-line">
                No hay pruebas con este filtro.
              </p>
            )}

            {groups.map(([date, trials]) => (
              <section key={date} aria-label={formatDayLabel(date, today)}>
                <h2 className="sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-10 -mx-1 mb-2 rounded-xl bg-cream/95 px-2 py-1 text-sm font-extrabold text-ink-soft backdrop-blur">
                  {formatDayLabel(date, today)}
                </h2>
                <ul className="flex flex-col gap-2">
                  {trials.map((t) => {
                    const food = FOOD_BY_ID.get(t.foodId)
                    return (
                      <li key={t.id}>
                        <TrialItem
                          trial={t}
                          food={food ?? UNKNOWN_FOOD}
                          today={today}
                          onClick={food ? () => onOpenTrial(t.foodId, t.id) : undefined}
                        />
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </>
  )
}
