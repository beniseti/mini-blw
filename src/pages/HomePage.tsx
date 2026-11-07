import { useMemo } from 'react'
import { ALLERGEN_WAIT_DAYS, ALLERGENS } from '../data/allergens'
import { FOOD_BY_ID, FOODS } from '../data/foods'
import { formatAge, stageFor, STAGE_LABEL } from '../lib/age'
import { latestIntroduction } from '../lib/allergenCheck'
import { addDays, daysBetween, formatRelative, formatShort } from '../lib/dates'
import { compareTrialsDesc, progressFor, visualStatus } from '../lib/status'
import { useStore } from '../store/AppStore'
import type { CategoryId } from '../types'
import { AppHeader } from '../components/layout/AppHeader'
import { DisclaimerBanner } from '../components/layout/DisclaimerBanner'
import { CategoryProgress } from '../components/progress/CategoryProgress'
import { ProgressBar } from '../components/progress/ProgressBar'
import { TrialItem } from '../components/trials/TrialItem'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

interface Props {
  onOpenFood: (foodId: string, trialId?: string) => void
  onOpenCategory: (category: CategoryId) => void
  onGoTab: (path: string) => void
}

export function HomePage({ onOpenFood, onOpenCategory, onGoTab }: Props) {
  const { data, age, today, stats, allergenIntro } = useStore()
  const profile = data.profile
  const progress = progressFor(FOODS, stats)
  const stage = age ? stageFor(age.months) : null

  const recent = useMemo(() => [...data.trials].sort(compareTrialsDesc).slice(0, 5), [data.trials])
  const reactionFoods = useMemo(
    () => FOODS.filter((f) => stats.get(f.id)?.worstReaction && stats.get(f.id)!.worstReaction !== 'none'),
    [stats],
  )
  const latest = latestIntroduction(allergenIntro)
  const latestDays = latest ? daysBetween(latest.date, today) : null
  const showWait = latest && latestDays !== null && latestDays >= 0 && latestDays < ALLERGEN_WAIT_DAYS

  const title = profile?.name ? `Hola, ${profile.name} 👋` : 'Bocaditos BLW'
  const subtitle = age ? `${formatAge(age)}${stage ? ` · ${STAGE_LABEL[stage]}` : ''}` : 'Seguimiento de la alimentación BLW'

  return (
    <>
      <AppHeader title={title} subtitle={subtitle} />
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-6">
        <DisclaimerBanner />

        {!profile?.birthDate && (
          <Card className="bg-lilac-100">
            <p className="text-lg font-extrabold text-lilac-700">👶 Añade el perfil de tu bebé</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              Con su fecha de nacimiento calcularé su edad y resaltaré los alimentos adecuados para cada etapa.
            </p>
            <Button className="mt-3" variant="soft" onClick={() => onGoTab('/perfil')}>
              Completar perfil
            </Button>
          </Card>
        )}

        {age && age.months < 6 && (
          <Card className="bg-butter-100">
            <p className="font-extrabold text-butter-700">⏳ Todavía no ha cumplido 6 meses</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              La alimentación complementaria suele empezar hacia los 6 meses, cuando se mantiene sentado con poco apoyo,
              controla bien la cabeza, muestra interés por la comida y se lleva objetos a la boca. Consulta con tu
              pediatra el momento adecuado (sobre todo si fue prematuro).
            </p>
          </Card>
        )}

        <Card title="Progreso">
          <div className="flex items-end justify-between gap-2">
            <p className="text-ink-soft">
              <span className="text-4xl font-black text-ink">{progress.tried}</span>
              <span className="font-bold"> de {progress.total} alimentos probados</span>
            </p>
            <span className="text-2xl font-black text-mint-700">{progress.pct}%</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={progress.tried} max={progress.total} size="lg" label="Progreso global" />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-mint-100 p-2">
              <dt className="text-xs font-bold text-mint-800">Pruebas</dt>
              <dd className="text-xl font-black text-ink">{data.trials.length}</dd>
            </div>
            <div className="rounded-2xl bg-amber-100 p-2">
              <dt className="text-xs font-bold text-amber-700">Alérgenos</dt>
              <dd className="text-xl font-black text-ink">
                {allergenIntro.size}/{ALLERGENS.length}
              </dd>
            </div>
            <div className="rounded-2xl bg-rose-100 p-2">
              <dt className="text-xs font-bold text-rose-700">Reacciones</dt>
              <dd className="text-xl font-black text-ink">{reactionFoods.length}</dd>
            </div>
          </dl>
        </Card>

        {data.trials.length === 0 && (
          <Card className="bg-mint-100">
            <p className="text-lg font-extrabold text-mint-800">🥄 ¡Empecemos!</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              Ve a <strong>Alimentos</strong>, toca uno y pulsa «Añadir prueba» para registrar la primera vez que lo prueba.
            </p>
            <Button className="mt-3" onClick={() => onGoTab('/alimentos')}>
              Ver alimentos
            </Button>
          </Card>
        )}

        {reactionFoods.length > 0 && (
          <Card title="⚠️ Alimentos con reacción" className="bg-white">
            <ul className="flex flex-wrap gap-2">
              {reactionFoods.map((f) => {
                const severe = visualStatus(stats.get(f.id)) === 'severe'
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onOpenFood(f.id)}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ring-1 ${
                        severe ? 'bg-rose-100 text-rose-700 ring-rose-300' : 'bg-amber-100 text-amber-700 ring-amber-300'
                      }`}
                    >
                      <span aria-hidden="true">{f.emoji}</span> {f.name}
                      <span className="sr-only">{severe ? ' (reacción preocupante)' : ' (reacción leve)'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        <Card title="Alérgenos introducidos">
          {showWait && latest && (
            <p className="mb-3 rounded-2xl bg-amber-100 p-3 text-sm font-semibold text-amber-700">
              Último alérgeno nuevo:{' '}
              <strong>{latest.allergens.map((a) => ALLERGENS.find((x) => x.id === a)!.name.toLowerCase()).join(', ')}</strong>{' '}
              ({formatRelative(latest.date, today)}). Para introducir otro, espera hasta el{' '}
              <strong>{formatShort(addDays(latest.date, ALLERGEN_WAIT_DAYS), today)}</strong>.
            </p>
          )}
          <ul className="grid grid-cols-3 gap-2">
            {ALLERGENS.map((a) => {
              const date = allergenIntro.get(a.id)
              return (
                <li
                  key={a.id}
                  className={`flex flex-col items-center rounded-2xl px-1 py-2 text-center ${
                    date ? 'bg-mint-100 ring-1 ring-mint-300' : 'bg-cream ring-1 ring-line'
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {a.emoji}
                  </span>
                  <span className="text-xs font-extrabold text-ink">{a.name}</span>
                  <span className={`text-[0.7rem] font-bold ${date ? 'text-mint-700' : 'text-ink-soft'}`}>
                    {date ? `✓ ${formatShort(date, today)}` : 'Pendiente'}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title="Por categorías">
          <CategoryProgress stats={stats} onSelect={onOpenCategory} />
        </Card>

        {recent.length > 0 && (
          <Card
            title="Últimas pruebas"
            action={
              <button
                type="button"
                onClick={() => onGoTab('/historial')}
                className="min-h-10 rounded-full px-3 text-sm font-bold text-lilac-700"
              >
                Ver todo ›
              </button>
            }
          >
            <ul className="flex flex-col gap-2">
              {recent.map((t) => {
                const food = FOOD_BY_ID.get(t.foodId)
                return (
                  <li key={t.id}>
                    <p className="mb-1 px-1 text-xs font-bold text-ink-soft">{formatShort(t.date, today)}</p>
                    <TrialItem
                      trial={t}
                      food={food ?? { id: t.foodId, name: 'Alimento desconocido', emoji: '❓', category: 'verduras', minAge: 6, prep: '' }}
                      today={today}
                      onClick={food ? () => onOpenFood(t.foodId) : undefined}
                    />
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>
    </>
  )
}
