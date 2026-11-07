import { useMemo, useState } from 'react'
import { ALLERGEN_WAIT_DAYS } from '../data/allergens'
import { FOOD_BY_ID, FOODS } from '../data/foods'
import { PLAN_DAYS_VISIBLE } from '../data/plan'
import { daysBetween, formatShort, isValidISODate } from '../lib/dates'
import { groupPlan, planProgress, sixMonthsDate } from '../lib/plan'
import { useStore } from '../store/AppStore'
import { AppHeader } from '../components/layout/AppHeader'
import { PlanDayCard } from '../components/plan/PlanDayCard'
import { ProgressBar } from '../components/progress/ProgressBar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { useToast } from '../components/ui/Toast'

interface Props {
  onOpenFood: (foodId: string) => void
  onRegister: (foodId: string) => void
  onGoTab: (path: string) => void
}

const PER_DAY_OPTIONS = [
  { value: '1' as const, label: '1 al día', emoji: '🥄' },
  { value: '2' as const, label: '2 al día', emoji: '🥄🥄' },
]

export function PlanPage({ onOpenFood, onRegister, onGoTab }: Props) {
  const { data, today, stats, createPlan, postponePlanDay, catchUpPlan, removePlanItem, clearPlan } = useStore()
  const toast = useToast()
  const isTried = (foodId: string) => stats.has(foodId)

  const birthDate = data.profile?.birthDate || null
  const minStart = birthDate && sixMonthsDate(birthDate) > today ? sixMonthsDate(birthDate) : today
  // null = usar el valor guardado / calculado (puede llegar del servidor después de abrir la página).
  const [perDayInput, setPerDay] = useState<'1' | '2' | null>(null)
  const [startInput, setStartDate] = useState<string | null>(null)
  const perDay = perDayInput ?? (String(data.plan.perDay) as '1' | '2')
  const startDate = startInput ?? minStart
  const [visible, setVisible] = useState(PLAN_DAYS_VISIBLE)
  const [confirm, setConfirm] = useState<'redo' | 'clear' | null>(null)
  const [toRemove, setToRemove] = useState<string | null>(null)

  const days = useMemo(() => groupPlan(data.plan, FOOD_BY_ID, (id) => stats.has(id)), [data.plan, stats])
  const progress = planProgress(data.plan, isTried)
  const untried = FOODS.filter((f) => !stats.has(f.id)).length
  const hasPlan = data.plan.items.length > 0
  const pendingTotal = progress.total - progress.done

  // Días que mostramos: los que tienen algo pendiente y los de hoy en adelante.
  const upcoming = days.filter((d) => !d.done || d.date >= today)
  const shown = upcoming.slice(0, visible)
  const overdueDays = progress.firstPending && progress.firstPending < today ? daysBetween(progress.firstPending, today) : 0

  const create = () => {
    const start = isValidISODate(startDate) && startDate >= today ? startDate : minStart
    const n = createPlan(perDay === '1' ? 1 : 2, start)
    setVisible(PLAN_DAYS_VISIBLE)
    toast.show(n > 0 ? `✓ Plan creado: ${n} alimentos` : 'No quedan alimentos por planificar')
  }

  const postpone = (date: string) => {
    const n = postponePlanDay(date)
    if (n > 0) toast.show(date === today ? '⏭️ Aplazado a mañana (y el resto del plan, un día)' : '⏭️ Día aplazado')
  }

  const catchUp = () => {
    if (catchUpPlan() > 0) toast.show('✓ Plan movido: lo pendiente empieza hoy')
  }

  const redo = () => {
    createPlan(perDay === '1' ? 1 : 2, minStart)
    setConfirm(null)
    setVisible(PLAN_DAYS_VISIBLE)
    toast.show('✓ Plan rehecho desde hoy')
  }

  return (
    <>
      <AppHeader
        title="Plan de comidas"
        subtitle={hasPlan ? `${progress.done} de ${progress.total} alimentos hechos` : 'Alimentos nuevos día a día'}
      />
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-6">
        {!hasPlan || pendingTotal === 0 ? (
          <Card title={hasPlan ? '🎉 ¡Plan completado!' : '📋 Crea tu plan'} className="bg-lilac-100">
            {untried === 0 ? (
              <p className="font-semibold text-ink-soft">Ya ha probado todos los alimentos del catálogo. ¡Enhorabuena!</p>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-ink-soft">
                  {hasPlan
                    ? `Ha probado todo lo planificado. Quedan ${untried} alimentos del catálogo por probar: crea un plan nuevo para seguir.`
                    : `Te propongo uno o dos alimentos nuevos cada día (${untried} por probar), empezando por los más recomendados para los primeros días.`}
                </p>
                <ul className="space-y-1 text-sm font-semibold text-ink-soft">
                  <li>🩸 Primero alimentos ricos en hierro, verduras y frutas.</li>
                  <li>⚠️ Cada alérgeno nuevo, solo ese día y con {ALLERGEN_WAIT_DAYS} días de separación.</li>
                  <li>👶 Cada alimento cuando tenga la edad adecuada.</li>
                  <li>⏭️ Si un día no puedes, lo aplazas y el plan se mueve.</li>
                </ul>
                <SegmentedControl
                  name="perDay"
                  legend="Alimentos nuevos por día"
                  options={PER_DAY_OPTIONS}
                  value={perDay}
                  onChange={setPerDay}
                />
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-ink-soft">Empezar el</span>
                  <input
                    type="date"
                    value={startDate}
                    min={minStart}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12 rounded-2xl bg-white px-4 font-semibold text-ink ring-1 ring-line focus:ring-2 focus:ring-lilac-300 focus:outline-none"
                  />
                </label>
                {!birthDate && (
                  <p className="rounded-2xl bg-butter-100 p-3 text-sm font-semibold text-butter-700">
                    Sin fecha de nacimiento no puedo ajustar el plan a su edad.{' '}
                    <button type="button" className="font-extrabold underline" onClick={() => onGoTab('/perfil')}>
                      Completar perfil
                    </button>
                  </p>
                )}
                {birthDate && minStart > today && (
                  <p className="rounded-2xl bg-butter-100 p-3 text-sm font-semibold text-butter-700">
                    El plan empieza el {formatShort(minStart, today)}, cuando cumple 6 meses.
                  </p>
                )}
                <Button block icon="✨" onClick={create}>
                  {hasPlan ? 'Crear plan nuevo' : 'Crear plan'}
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-extrabold text-ink">Progreso del plan</p>
                <p className="text-sm font-bold text-ink-soft">
                  {progress.done}/{progress.total} · {data.plan.perDay} al día
                </p>
              </div>
              <div className="mt-2">
                <ProgressBar value={progress.done} max={progress.total} barClass="bg-lilac-300" label="Progreso del plan" />
              </div>
            </Card>

            {overdueDays > 0 && (
              <div role="alert" className="rounded-3xl bg-amber-100 p-4 ring-1 ring-amber-300">
                <p className="font-extrabold text-amber-700">
                  ⏰ Hay alimentos pendientes desde el {formatShort(progress.firstPending!, today)}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink-soft">
                  Puedes registrarlos si ya los probó, o mover el plan para que lo pendiente empiece hoy (todo se retrasa{' '}
                  {overdueDays} {overdueDays === 1 ? 'día' : 'días'}).
                </p>
                <Button className="mt-3" block variant="secondary" icon="📆" onClick={catchUp}>
                  Empezar lo pendiente hoy
                </Button>
              </div>
            )}

            {shown.map((day) => (
              <PlanDayCard
                key={day.date}
                day={day}
                today={today}
                trials={data.trials}
                highlight={day.date === today}
                onRegister={onRegister}
                onOpenFood={onOpenFood}
                onPostpone={postpone}
                onRemove={setToRemove}
              />
            ))}

            {upcoming.length > visible && (
              <Button variant="secondary" block onClick={() => setVisible((v) => v + PLAN_DAYS_VISIBLE)}>
                Ver más días ({upcoming.length - visible})
              </Button>
            )}

            <Card title="⚙️ Ajustes del plan">
              <div className="flex flex-col gap-4">
                <SegmentedControl
                  name="perDayEdit"
                  legend="Alimentos nuevos por día"
                  options={PER_DAY_OPTIONS}
                  value={perDay}
                  onChange={setPerDay}
                />
                {perDay !== String(data.plan.perDay) && (
                  <p className="-mt-2 text-sm font-bold text-lilac-700">Pulsa «Rehacer el plan» para aplicar el cambio.</p>
                )}
                <Button variant="soft" block icon="🔄" onClick={() => setConfirm('redo')}>
                  Rehacer el plan desde hoy
                </Button>
                <Button variant="ghost" block className="text-rose-700" onClick={() => setConfirm('clear')}>
                  Borrar el plan
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'redo'}
        title="¿Rehacer el plan?"
        confirmLabel="Sí, rehacer"
        onConfirm={redo}
        onCancel={() => setConfirm(null)}
      >
        Se volverán a planificar desde hoy, con {perDay} {perDay === '1' ? 'alimento' : 'alimentos'} al día, todos los
        alimentos que aún no ha probado. Lo ya probado se mantiene.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'clear'}
        title="¿Borrar el plan?"
        confirmLabel="Sí, borrar plan"
        danger
        onConfirm={() => {
          clearPlan()
          setConfirm(null)
          toast.show('Plan borrado')
        }}
        onCancel={() => setConfirm(null)}
      >
        Las pruebas registradas no se borran, solo la planificación.
      </ConfirmDialog>

      <ConfirmDialog
        open={!!toRemove}
        title="¿Quitar del plan?"
        confirmLabel="Sí, quitar"
        onConfirm={() => {
          if (toRemove) removePlanItem(toRemove)
          setToRemove(null)
          toast.show('Quitado del plan')
        }}
        onCancel={() => setToRemove(null)}
      >
        El alimento no se volverá a proponer hasta que rehagas el plan.
      </ConfirmDialog>
    </>
  )
}
