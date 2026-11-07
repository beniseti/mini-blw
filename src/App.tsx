import { useCallback, useState } from 'react'
import { BottomNav } from './components/layout/BottomNav'
import { TABS } from './components/layout/tabs'
import { UpdatePrompt } from './components/layout/UpdatePrompt'
import { DEFAULT_FILTERS, type Filters } from './lib/filters'
import { useHashRoute } from './hooks/useHashRoute'
import { AvoidPage } from './pages/AvoidPage'
import { FoodDetailSheet } from './pages/FoodDetailSheet'
import { FoodsPage } from './pages/FoodsPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import type { CategoryId } from './types'

export default function App() {
  const { route, goTab, openOverlay, closeOverlay } = useHashRoute()
  // Los filtros viven aquí para conservarse al cambiar de pestaña.
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const path = TABS.some((t) => t.path === route.path) ? route.path : '/'
  const foodId = route.params.get('alimento')
  const editId = route.params.get('editar')

  const openFood = useCallback(
    (id: string, trialId?: string) => openOverlay(path, { alimento: id, editar: trialId }),
    [openOverlay, path],
  )
  const closeFood = useCallback(() => closeOverlay(path), [closeOverlay, path])
  const openCategory = useCallback(
    (category: CategoryId) => {
      setFilters({ ...DEFAULT_FILTERS, category })
      goTab('/alimentos')
    },
    [goTab],
  )

  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <UpdatePrompt />
      <main>
        {path === '/' && <HomePage onOpenFood={openFood} onOpenCategory={openCategory} onGoTab={goTab} />}
        {path === '/alimentos' && <FoodsPage filters={filters} onFiltersChange={setFilters} onOpenFood={openFood} />}
        {path === '/historial' && <HistoryPage onOpenTrial={openFood} onGoTab={goTab} />}
        {path === '/evitar' && <AvoidPage />}
        {path === '/perfil' && <ProfilePage />}
      </main>
      <BottomNav current={path} onNavigate={goTab} />
      <FoodDetailSheet foodId={foodId} editTrialId={editId} onClose={closeFood} />
    </div>
  )
}
