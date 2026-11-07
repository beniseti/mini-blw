import { useMemo } from 'react'
import { FOOD_BY_ID } from '../../data/foods'
import { daysBetween, formatShort } from '../../lib/dates'
import { groupPlan, planItemDoneChecker, planProgress } from '../../lib/plan'
import { useStore } from '../../store/AppStore'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useToast } from '../ui/Toast'
import { PlanDayCard } from './PlanDayCard'

interface Props {
  onRegister: (foodId: string) => void
  onOpenFood: (foodId: string) => void
  onGoTab: (path: string) => void
}

/** Resumen del plan de comidas para la pantalla de inicio: lo que toca hoy. */
export function TodayPlanCard({ onRegister, onOpenFood, onGoTab }: Props) {
  const { data, today, postponePlanDay, catchUpPlan } = useStore()
  const toast = useToast()
  const isDone = useMemo(() => planItemDoneChecker(data.trials), [data.trials])
  const days = useMemo(() => groupPlan(data.plan, FOOD_BY_ID, isDone), [data.plan, isDone])
  const progress = planProgress(data.plan, isDone)
  const seePlan = (
    <button type="button" onClick={() => onGoTab('/plan')} className="min-h-10 rounded-full px-3 text-sm font-bold text-lilac-700">
      Ver plan ›
    </button>
  )

  if (data.plan.items.length === 0) {
    return (
      <Card className="bg-lilac-100" title="📋 Plan de comidas">
        <p className="text-sm font-semibold text-ink-soft">
          Organiza qué alimento nuevo ofrecer cada día (1 o 2), con los alérgenos bien separados. Si un día no puedes, lo
          aplazas.
        </p>
        <Button className="mt-3" variant="soft" onClick={() => onGoTab('/plan')}>
          Crear plan
        </Button>
      </Card>
    )
  }

  if (!progress.firstPending) {
    return (
      <Card className="bg-mint-100" title="🎉 Plan completado" action={seePlan}>
        <p className="text-sm font-semibold text-ink-soft">Ha probado todo lo planificado. Puedes crear un plan nuevo con lo que falta.</p>
      </Card>
    )
  }

  const overdue = progress.firstPending < today
  const todayDay = days.find((d) => d.date === today)
  const next = days.find((d) => d.date > today && !d.done)

  return (
    <Card className="bg-white" title="📋 Plan de hoy" action={seePlan}>
      <div className="flex flex-col gap-3">
        {overdue && (
          <div className="rounded-2xl bg-amber-100 p-3 ring-1 ring-amber-300">
            <p className="text-sm font-bold text-amber-700">
              ⏰ Hay alimentos pendientes desde el {formatShort(progress.firstPending, today)} (
              {daysBetween(progress.firstPending, today)} {daysBetween(progress.firstPending, today) === 1 ? 'día' : 'días'}).
            </p>
            <Button
              className="mt-2"
              variant="secondary"
              block
              icon="📆"
              onClick={() => {
                if (catchUpPlan() > 0) toast.show('✓ Plan movido: lo pendiente empieza hoy')
              }}
            >
              Empezar lo pendiente hoy
            </Button>
          </div>
        )}
        {todayDay ? (
          <PlanDayCard
            day={todayDay}
            today={today}
            trials={data.trials}
            highlight
            onRegister={onRegister}
            onOpenFood={onOpenFood}
            onPostpone={(date) => {
              if (postponePlanDay(date) > 0) toast.show('⏭️ Aplazado a mañana (y el resto del plan, un día)')
            }}
          />
        ) : (
          !overdue && (
            <p className="rounded-2xl bg-cream p-3 text-sm font-semibold text-ink-soft">
              Hoy no toca ningún alimento nuevo: buen día para repetir los que ya conoce.
              {next && (
                <>
                  {' '}
                  Próximo, el <strong className="text-ink">{formatShort(next.date, today)}</strong>:{' '}
                  {next.items.map((i) => `${i.food?.emoji ?? ''} ${i.food?.name ?? ''}`).join(', ')}.
                </>
              )}
            </p>
          )
        )}
      </div>
    </Card>
  )
}
