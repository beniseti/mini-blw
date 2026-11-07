import { AVOID_BEFORE_ONE, CHOKING_RISK, SAFETY_TIPS, type AvoidItem } from '../data/avoid'
import { AppHeader } from '../components/layout/AppHeader'
import { DisclaimerBanner } from '../components/layout/DisclaimerBanner'

function AvoidCard({ item, tone }: { item: AvoidItem; tone: 'rose' | 'amber' }) {
  return (
    <li className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${tone === 'rose' ? 'bg-rose-100' : 'bg-amber-100'}`}
        aria-hidden="true"
      >
        {item.emoji}
      </span>
      <div className="min-w-0">
        <h3 className="font-extrabold text-ink">{item.name}</h3>
        <p className="mt-0.5 text-sm font-semibold text-ink-soft">{item.reason}</p>
        {item.alternative && (
          <p className="mt-2 rounded-xl bg-mint-100 px-3 py-2 text-sm font-semibold text-mint-800">
            <span aria-hidden="true">✅ </span>
            <span className="sr-only">Alternativa: </span>
            {item.alternative}
          </p>
        )}
      </div>
    </li>
  )
}

const SECTIONS = [
  { id: 'antes-del-ano', label: '🍯 Antes del año' },
  { id: 'atragantamiento', label: '🍇 Atragantamiento' },
  { id: 'seguridad', label: '🛡️ Seguridad' },
]

export function AvoidPage() {
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      <AppHeader title="Evitar" subtitle="Alimentos y situaciones de riesgo" />
      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 pb-6">
        <nav aria-label="Secciones de la página" className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              className="min-h-10 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-ink ring-1 ring-line"
            >
              {s.label}
            </button>
          ))}
        </nav>

        <section id="antes-del-ano" aria-labelledby="h-antes" className="scroll-mt-24 rounded-3xl bg-rose-100 p-3">
          <div className="mb-3 px-1">
            <h2 id="h-antes" className="text-lg font-extrabold text-rose-700">
              🚫 Evitar antes del año
            </h2>
            <p className="text-sm font-semibold text-ink-soft">No los ofrezcas antes de los 12 meses.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {AVOID_BEFORE_ONE.map((item) => (
              <AvoidCard key={item.name} item={item} tone="rose" />
            ))}
          </ul>
        </section>

        <section id="atragantamiento" aria-labelledby="h-atrag" className="scroll-mt-24 rounded-3xl bg-amber-100 p-3">
          <div className="mb-3 px-1">
            <h2 id="h-atrag" className="text-lg font-extrabold text-amber-700">
              ⚠️ Riesgo de atragantamiento
            </h2>
            <p className="text-sm font-semibold text-ink-soft">Por su forma, tamaño o dureza. Y cómo ofrecerlos de forma segura.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {CHOKING_RISK.map((item) => (
              <AvoidCard key={item.name} item={item} tone="amber" />
            ))}
          </ul>
        </section>

        <section id="seguridad" aria-labelledby="h-seg" className="scroll-mt-24 rounded-3xl bg-sky-100 p-3">
          <div className="mb-3 px-1">
            <h2 id="h-seg" className="text-lg font-extrabold text-sky-700">
              🛡️ Consejos de seguridad
            </h2>
          </div>
          <ul className="grid gap-2">
            {SAFETY_TIPS.map((tip) => (
              <li key={tip.title} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
                <span className="text-2xl" aria-hidden="true">
                  {tip.emoji}
                </span>
                <div>
                  <h3 className="font-extrabold text-ink">{tip.title}</h3>
                  <p className="mt-0.5 text-sm font-semibold text-ink-soft">{tip.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <DisclaimerBanner />
      </div>
    </>
  )
}
