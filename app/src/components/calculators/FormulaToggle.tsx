import { useState } from 'react'

export interface FormulaToggleProps {
  title?: string
  lines: string[]
  note?: string
}

const DEFAULT_TITLE = 'Berechnungsformel'
const DEFAULT_NOTE = 'Rechenhilfe – klinische Prüfung erforderlich.'

export function FormulaToggle({ title = DEFAULT_TITLE, lines, note = DEFAULT_NOTE }: FormulaToggleProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-[var(--color-border)]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span aria-hidden>fx</span>
        <span>Formel</span>
        <span className="text-[10px]" aria-hidden>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div
          className="mt-1.5 rounded-lg border p-3 text-xs"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div className="mb-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {title}
          </div>
          <ul className="list-inside list-disc space-y-0.5">
            {lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {note && (
            <p className="mt-2 border-t pt-2" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
