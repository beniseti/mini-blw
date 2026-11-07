import { formatShort } from '../../lib/dates'
import { LIKED_EMOJI, LIKED_LABEL, REACTION_LABEL, STATUS_STYLES } from '../../lib/labels'
import type { Food, Trial } from '../../types'

interface Props {
  trial: Trial
  /** Si se pasa, muestra el alimento (historial); si no, la fecha (ficha del alimento). */
  food?: Food
  today: string
  onClick?: () => void
}

export function TrialItem({ trial, food, today, onClick }: Props) {
  const reactionClass =
    trial.reaction === 'severe' ? STATUS_STYLES.severe.badge : trial.reaction === 'mild' ? STATUS_STYLES.mild.badge : ''
  const content = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cream text-3xl" aria-hidden="true">
        {food ? food.emoji : LIKED_EMOJI[trial.liked]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-extrabold text-ink">{food ? food.name : formatShort(trial.date, today)}</span>
          {food && (
            <span className="text-lg leading-none" title={LIKED_LABEL[trial.liked]}>
              {LIKED_EMOJI[trial.liked]}
              <span className="sr-only">{LIKED_LABEL[trial.liked]}</span>
            </span>
          )}
          {!food && <span className="text-sm font-semibold text-ink-soft">{LIKED_LABEL[trial.liked]}</span>}
          {trial.reaction !== 'none' && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${reactionClass}`}>
              ⚠️ {REACTION_LABEL[trial.reaction]}
            </span>
          )}
        </span>
        {trial.notes && <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">{trial.notes}</span>}
      </span>
      {onClick && (
        <span className="shrink-0 text-xl text-ink-soft" aria-hidden="true">
          ›
        </span>
      )}
    </>
  )

  const className = 'flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-line'
  return onClick ? (
    <button type="button" onClick={onClick} className={`${className} active:bg-cream`}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}
