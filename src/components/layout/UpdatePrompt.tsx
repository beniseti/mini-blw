import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from '../ui/Toast'

/** Registra el service worker y avisa cuando hay una versión nueva o la app ya funciona sin conexión. */
export function UpdatePrompt() {
  const toast = useToast()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Busca actualizaciones cada hora mientras la app está abierta.
      if (registration) window.setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (offlineReady) {
      toast.show('✅ Lista para usar sin conexión')
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady, toast])

  if (!needRefresh) return null

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-[calc(0.5rem+env(safe-area-inset-top))] z-[55] mx-auto flex w-[calc(100%-2rem)] max-w-lg animate-pop items-center gap-3 rounded-2xl bg-lilac-200 p-3 text-lilac-700 shadow-lg ring-1 ring-lilac-300"
    >
      <span className="flex-1 text-sm font-bold">Hay una versión nueva de la app.</span>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        className="min-h-10 rounded-xl px-3 text-sm font-bold"
      >
        Luego
      </button>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="min-h-10 rounded-xl bg-white px-3 text-sm font-extrabold"
      >
        Actualizar
      </button>
    </div>
  )
}
