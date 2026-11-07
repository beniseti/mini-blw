import { TABS } from './tabs'

export function BottomNav({ current, onNavigate }: { current: string; onNavigate: (path: string) => void }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.path === current
          return (
            <li key={tab.path}>
              <button
                type="button"
                onClick={() => onNavigate(tab.path)}
                aria-current={active ? 'page' : undefined}
                className="flex h-16 w-full flex-col items-center justify-center gap-0.5"
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full text-xl transition-colors ${
                    active ? 'bg-mint-200' : ''
                  }`}
                  aria-hidden="true"
                >
                  {tab.emoji}
                </span>
                <span className={`text-xs ${active ? 'font-extrabold text-mint-800' : 'font-semibold text-ink-soft'}`}>
                  {tab.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
