import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export function MapCalculator({ onRemove, onDuplicate }: CalculatorBlockProps) {
  const [sysInput, setSysInput] = useState('')
  const [diaInput, setDiaInput] = useState('')

  const sys = useMemo(() => {
    const n = parseFloat(sysInput.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }, [sysInput])

  const dia = useMemo(() => {
    const n = parseFloat(diaInput.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }, [diaInput])

  const map = useMemo(() => {
    if (sys == null || dia == null) return null
    return (sys + 2 * dia) / 3
  }, [sys, dia])

  const inputStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>MAP-Ziel</div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>MAP = (SYS + 2×DIA) / 3 · nur Näherung</div>
        </div>
        <div className="flex shrink-0 gap-1">
          {onDuplicate != null && <button type="button" onClick={onDuplicate} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-blue-500/20" style={{ color: 'var(--color-text-muted)' }} title="Duplizieren">📋</button>}
          {onRemove != null && <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-500/20 hover:text-red-400" style={{ color: 'var(--color-text-muted)' }} title="Block entfernen">🗑 Entfernen</button>}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>systolisch (mmHg)</span>
          <input type="text" inputMode="decimal" value={sysInput} onChange={(e) => setSysInput(e.target.value)} className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>diastolisch (mmHg)</span>
          <input type="text" inputMode="decimal" value={diaInput} onChange={(e) => setDiaInput(e.target.value)} className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
        </label>
        {map != null && (
          <span className="text-sm"><strong>MAP:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(map, 0)}</span> mmHg</span>
        )}
      </div>
    </div>
  )
}
