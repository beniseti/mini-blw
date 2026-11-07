export interface Tab {
  path: string
  label: string
  emoji: string
}

export const TABS: Tab[] = [
  { path: '/', label: 'Inicio', emoji: '🏠' },
  { path: '/alimentos', label: 'Alimentos', emoji: '🥕' },
  { path: '/historial', label: 'Historial', emoji: '📅' },
  { path: '/evitar', label: 'Evitar', emoji: '🚫' },
  { path: '/perfil', label: 'Perfil', emoji: '👶' },
]
