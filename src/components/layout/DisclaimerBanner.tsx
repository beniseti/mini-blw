export function DisclaimerBanner() {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-700 ring-1 ring-sky-200">
      <span aria-hidden="true" className="text-base">
        🩺
      </span>
      <span>Esta app es una ayuda orientativa y no sustituye el consejo de tu pediatra.</span>
    </p>
  )
}
