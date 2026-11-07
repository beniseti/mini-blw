import { useCallback, useEffect, useState } from 'react'

export interface Route {
  /** Ruta, p. ej. "/alimentos". */
  path: string
  /** Parámetros, p. ej. ?alimento=platano */
  params: URLSearchParams
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  return { path: path || '/', params: new URLSearchParams(query) }
}

export function buildHash(path: string, params?: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v) q.set(k, v)
  const qs = q.toString()
  return `#${path}${qs ? `?${qs}` : ''}`
}

/**
 * Enrutado mínimo basado en el hash (#/ruta?param=valor). Funciona en cualquier
 * hosting estático sin configuración y permite que el botón "atrás" cierre fichas.
 */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const update = () => setRoute(parseHash())
    window.addEventListener('popstate', update)
    window.addEventListener('hashchange', update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('hashchange', update)
    }
  }, [])

  /** Cambio de pestaña: reemplaza la entrada actual del historial. */
  const goTab = useCallback((path: string, params?: Record<string, string | undefined>) => {
    window.history.replaceState(null, '', buildHash(path, params))
    setRoute(parseHash())
    window.scrollTo({ top: 0 })
  }, [])

  /** Abre una ficha encima de la página actual: añade una entrada al historial. */
  const openOverlay = useCallback((path: string, params: Record<string, string | undefined>) => {
    window.history.pushState({ overlay: true }, '', buildHash(path, params))
    setRoute(parseHash())
  }, [])

  /** Cierra la ficha: vuelve atrás si la abrimos nosotros; si no, limpia la URL. */
  const closeOverlay = useCallback((path: string) => {
    if (window.history.state?.overlay) {
      window.history.back()
    } else {
      window.history.replaceState(null, '', buildHash(path))
      setRoute(parseHash())
    }
  }, [])

  return { route, goTab, openOverlay, closeOverlay }
}
