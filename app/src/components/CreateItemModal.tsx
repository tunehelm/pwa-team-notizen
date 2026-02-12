import { useRef, useState, type FormEvent } from 'react'
import { IconPicker } from './FolderIcons'

interface CreateItemModalProps {
  title: string
  options: string[]
  onClose: () => void
  onSubmit: (payload: { type: string; name: string; icon?: string }) => void | Promise<void>
}

export function CreateItemModal({
  title,
  options,
  onClose,
  onSubmit,
}: CreateItemModalProps) {
  const [selectedType, setSelectedType] = useState(options[0] ?? '')
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('folder')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const busyRef = useRef(false)

  const isFolderType = selectedType === 'Ordner' || selectedType === 'Unterordner'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName || !selectedType || busyRef.current) return

    busyRef.current = true
    setSubmitting(true)

    const payload: { type: string; name: string; icon?: string } = { type: selectedType, name: cleanName }
    if (isFolderType) {
      payload.icon = selectedIcon
    }

    const maybePromise = onSubmit(payload)
    if (maybePromise && typeof maybePromise.then === 'function') {
      void maybePromise.finally(() => {
        busyRef.current = false
        setSubmitting(false)
      })
    } else {
      busyRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm md:items-center"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Schließen
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Typ</span>
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name eingeben"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </label>

          {/* Icon-Auswahl für Ordner */}
          {isFolderType ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowIconPicker((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <span>Symbol wählen</span>
                <span className="text-xs text-blue-500">{showIconPicker ? '▲' : '▼'}</span>
              </button>
              {showIconPicker ? (
                <IconPicker selected={selectedIcon} onSelect={setSelectedIcon} />
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-xl px-4 py-2 text-sm font-medium text-white ${
              submitting ? 'bg-slate-500 cursor-default' : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
            }`}
          >
            {submitting ? 'Wird erstellt…' : 'Erstellen'}
          </button>
        </form>
      </div>
    </div>
  )
}
