interface Option<T extends string> {
  value: T
  label: string
  emoji?: string
}

interface Props<T extends string> {
  name: string
  legend: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  /** Clases del botón seleccionado según su valor. */
  activeClass?: (value: T) => string
}

/** Grupo de botones grandes de opción única (accesible como radio group). */
export function SegmentedControl<T extends string>({ name, legend, options, value, onChange, activeClass }: Props<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-ink-soft">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((opt) => {
          const selected = opt.value === value
          return (
            <label
              key={opt.value}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-center text-sm font-bold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-lilac-300 ${
                selected
                  ? (activeClass?.(opt.value) ?? 'bg-mint-200 text-mint-800 ring-2 ring-mint-300')
                  : 'bg-white text-ink-soft ring-1 ring-line'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.emoji && (
                <span className="text-2xl leading-none" aria-hidden="true">
                  {opt.emoji}
                </span>
              )}
              <span>{opt.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
