import { useState, type FormEvent } from 'react'

interface CreateItemModalProps {
  title: string
  options: string[]
  onClose: () => void
  onSubmit: (payload: { type: string; name: string }) => void
}

export function CreateItemModal({
  title,
  options,
  onClose,
  onSubmit,
}: CreateItemModalProps) {
  const [selectedType, setSelectedType] = useState(options[0] ?? '')
  const [name, setName] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName || !selectedType) return

    onSubmit({ type: selectedType, name: cleanName })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm md:items-center"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Schließen
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Typ</span>
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name eingeben"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Erstellen
          </button>
        </form>
      </div>
    </div>
  )
}
