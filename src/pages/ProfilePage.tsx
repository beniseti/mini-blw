import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { formatAge, getAge } from '../lib/age'
import { formatRelative, isValidISODate, toISODate } from '../lib/dates'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useStore } from '../store/AppStore'
import { buildBackup, parseAppData } from '../store/storage'
import type { AppData } from '../types'
import { AppHeader } from '../components/layout/AppHeader'
import { DisclaimerBanner } from '../components/layout/DisclaimerBanner'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'

const inputClass =
  'h-12 w-full rounded-2xl bg-white px-4 font-semibold text-ink ring-1 ring-line placeholder:text-ink-soft/70 focus:ring-2 focus:ring-lilac-300 focus:outline-none'

export function ProfilePage() {
  const { data, today, setProfile, replaceAll, clearAll, markExported, storageOk } = useStore()
  const toast = useToast()
  const { canInstall, installed, install } = useInstallPrompt()

  const [name, setName] = useState(data.profile?.name ?? '')
  const [birthDate, setBirthDate] = useState(data.profile?.birthDate ?? '')
  const [pendingImport, setPendingImport] = useState<{ data: AppData; skipped: number; fileName: string } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const birthValid = birthDate === '' || (isValidISODate(birthDate) && birthDate <= today)
  const previewAge = birthValid && birthDate ? getAge(birthDate, today) : null
  const dirty = name.trim() !== (data.profile?.name ?? '') || birthDate !== (data.profile?.birthDate ?? '')

  const saveProfile = (e: FormEvent) => {
    e.preventDefault()
    if (!birthValid) return
    const trimmed = name.trim()
    setProfile(trimmed || birthDate ? { name: trimmed, birthDate } : null)
    toast.show('✓ Perfil guardado')
  }

  const exportData = () => {
    const blob = new Blob([buildBackup(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bocaditos-blw-${toISODate()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    markExported()
    toast.show('✓ Copia descargada')
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const result = parseAppData(JSON.parse(await file.text()))
      if (!result.ok) {
        toast.show(`❌ ${result.error}`)
        return
      }
      setPendingImport({ data: result.data, skipped: result.skipped, fileName: file.name })
    } catch {
      toast.show('❌ No se pudo leer el archivo (¿es un JSON válido?)')
    }
  }

  const doImport = () => {
    if (!pendingImport) return
    replaceAll(pendingImport.data)
    setName(pendingImport.data.profile?.name ?? '')
    setBirthDate(pendingImport.data.profile?.birthDate ?? '')
    toast.show(`✓ ${pendingImport.data.trials.length} pruebas importadas`)
    setPendingImport(null)
  }

  const doClear = () => {
    clearAll()
    setName('')
    setBirthDate('')
    setConfirmClear(false)
    toast.show('Datos borrados')
  }

  return (
    <>
      <AppHeader title="Perfil" subtitle="Tu bebé y tus datos" />
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-6">
        {!storageOk && (
          <p role="alert" className="rounded-2xl bg-rose-100 p-3 text-sm font-bold text-rose-700">
            ⚠️ El navegador no permite guardar datos (¿modo privado o sin espacio?). Los cambios se perderán al cerrar.
          </p>
        )}

        <Card title="👶 Tu bebé" className="bg-lilac-100">
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-ink-soft">Nombre</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoComplete="off"
                placeholder="Ej.: Lucía"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-ink-soft">Fecha de nacimiento</span>
              <input
                type="date"
                value={birthDate}
                max={today}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputClass}
              />
              {!birthValid && <span className="text-sm font-bold text-rose-700">Introduce una fecha válida (no futura).</span>}
            </label>
            {previewAge && (
              <p className="rounded-2xl bg-white/70 px-4 py-3 font-bold text-lilac-700">
                🎂 Tiene {formatAge(previewAge)}
              </p>
            )}
            <Button type="submit" disabled={!dirty || !birthValid} block>
              Guardar perfil
            </Button>
          </form>
        </Card>

        <Card title="💾 Copia de seguridad">
          <p className="text-sm font-semibold text-ink-soft">
            Los datos se guardan solo en este dispositivo. Descarga una copia de vez en cuando para no perderlos si
            cambias de móvil o borras los datos del navegador.
          </p>
          <p className="mt-2 text-sm font-bold text-ink">
            {data.trials.length} pruebas ·{' '}
            {data.lastExportAt ? `última copia ${formatRelative(toISODate(new Date(data.lastExportAt)), today)}` : 'sin copias todavía'}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={exportData} icon="⬇️" block>
              Exportar datos (JSON)
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} icon="⬆️" block>
              Importar copia
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
          </div>
        </Card>

        <Card title="📲 Instalar en el móvil">
          {installed ? (
            <p className="text-sm font-semibold text-mint-700">✓ Estás usando la app instalada. Funciona sin conexión.</p>
          ) : (
            <>
              {canInstall && (
                <Button onClick={install} variant="soft" block className="mb-3">
                  Instalar app
                </Button>
              )}
              <ul className="space-y-1 text-sm font-semibold text-ink-soft">
                <li>
                  <strong className="text-ink">iPhone (Safari):</strong> botón Compartir → «Añadir a pantalla de inicio».
                </li>
                <li>
                  <strong className="text-ink">Android (Chrome):</strong> menú ⋮ → «Instalar aplicación».
                </li>
              </ul>
            </>
          )}
        </Card>

        <Card title="🗑️ Borrar datos" className="bg-rose-100">
          <p className="text-sm font-semibold text-ink-soft">
            Elimina el perfil y todas las pruebas de este dispositivo. Exporta antes una copia si quieres conservarlas.
          </p>
          <Button variant="danger" className="mt-3" block onClick={() => setConfirmClear(true)}>
            Borrar todo
          </Button>
        </Card>

        <Card title="ℹ️ Acerca de">
          <p className="text-sm font-semibold text-ink-soft">
            Bocaditos BLW v{__APP_VERSION__}. Información orientativa basada en recomendaciones generales de alimentación
            complementaria (AEP, AESAN) y guías de BLW. Cada bebé es distinto: consulta siempre con tu pediatra.
          </p>
        </Card>

        <DisclaimerBanner />
      </div>

      <ConfirmDialog
        open={!!pendingImport}
        title="¿Sustituir los datos actuales?"
        confirmLabel="Sí, importar"
        danger
        onConfirm={doImport}
        onCancel={() => setPendingImport(null)}
      >
        {pendingImport && (
          <>
            <p>
              Se reemplazarán tus <strong>{data.trials.length}</strong> pruebas actuales por las{' '}
              <strong>{pendingImport.data.trials.length}</strong> del archivo «{pendingImport.fileName}»
              {pendingImport.data.profile?.name ? ` (perfil: ${pendingImport.data.profile.name})` : ''}.
            </p>
            {pendingImport.skipped > 0 && (
              <p className="mt-2 font-bold text-amber-700">
                {pendingImport.skipped} {pendingImport.skipped === 1 ? 'registro no válido se omitirá' : 'registros no válidos se omitirán'}.
              </p>
            )}
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmClear}
        title="¿Borrar todos los datos?"
        confirmLabel="Sí, borrar todo"
        danger
        onConfirm={doClear}
        onCancel={() => setConfirmClear(false)}
      >
        Se eliminarán el perfil y las <strong>{data.trials.length}</strong> pruebas. Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  )
}
