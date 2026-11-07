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
import { PlanPage } from './pages/PlanPage'
import { ProfilePage } from './pages/ProfilePage'
import type { CategoryId } from './types'

export default function App() {
  const { route, goTab, openOverlay, closeOverlay } = useHashRoute()
  // Los filtros viven aquí para conservarse al cambiar de pestaña.
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const path = TABS.some((t) => t.path === route.path) ? route.path : '/'
  const foodId = route.params.get('alimento')
  const editId = route.params.get('editar')
  const startNew = route.params.get('nueva') === '1'

  const openFood = useCallback(
    (id: string, trialId?: string) => openOverlay(path, { alimento: id, editar: trialId }),
    [openOverlay, path],
  )
  /** Abre la ficha con el formulario de nueva prueba ya desplegado (desde el plan). */
  const registerFood = useCallback(
    (id: string) => openOverlay(path, { alimento: id, nueva: '1' }),
    [openOverlay, path],
  )
  const closeFood = useCallback(() => closeOverlay(path), [closeOverlay, path])
  const showRetry = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, status: 'retry' })
    goTab('/alimentos')
  }, [goTab])
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
        {path === '/' && (
          <HomePage
            onOpenFood={openFood}
            onRegister={registerFood}
            onShowRetry={showRetry}
            onOpenCategory={openCategory}
            onGoTab={goTab}
          />
        )}
        {path === '/plan' && <PlanPage onOpenFood={openFood} onRegister={registerFood} onGoTab={goTab} />}
        {path === '/alimentos' && <FoodsPage filters={filters} onFiltersChange={setFilters} onOpenFood={openFood} />}
        {path === '/historial' && <HistoryPage onOpenTrial={openFood} onGoTab={goTab} />}
        {path === '/evitar' && <AvoidPage />}
        {path === '/perfil' && <ProfilePage />}
      </main>
      <BottomNav current={path} onNavigate={goTab} />
      <FoodDetailSheet foodId={foodId} editTrialId={editId} startNew={startNew} onClose={closeFood} />
    </div>
  )
}
