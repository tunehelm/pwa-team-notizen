import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export function PfRatioCalculator({ onRemove, onDuplicate }: CalculatorBlockProps) {
  const [pao2Input, setPao2Input] = useState('')
  const [fio2Input, setFio2Input] = useState('0.21')

  const pao2 = useMemo(() => {
    const n = parseFloat(pao2Input.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [pao2Input])

  const fio2 = useMemo(() => {
    const n = parseFloat(fio2Input.replace(',', '.'))
    return Number.isFinite(n) && n > 0 && n <= 1 ? n : null
  }, [fio2Input])

  const pfRatio = useMemo(() => {
    if (pao2 == null || fio2 == null || fio2 <= 0) return null
    return pao2 / fio2
  }, [pao2, fio2])

  const invalidFio2 = fio2Input !== '' && (fio2 == null || fio2 <= 0)
  const inputStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>PaO₂/FiO₂ Ratio</div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>FiO₂ 0,21–1,0</div>
        </div>
        <div className="flex shrink-0 gap-1">
          {onDuplicate != null && <button type="button" onClick={onDuplicate} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-blue-500/20" style={{ color: 'var(--color-text-muted)' }} title="Duplizieren">📋</button>}
          {onRemove != null && <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-500/20 hover:text-red-400" style={{ color: 'var(--color-text-muted)' }} title="Block entfernen">🗑 Entfernen</button>}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>PaO₂ (mmHg)</span>
          <input type="text" inputMode="decimal" value={pao2Input} onChange={(e) => setPao2Input(e.target.value)} className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>FiO₂ (0,21–1)</span>
          <input type="text" inputMode="decimal" value={fio2Input} onChange={(e) => setFio2Input(e.target.value)} className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={{ ...inputStyle, ...(invalidFio2 ? { borderColor: 'var(--color-accent)' } : {}) }} />
        </label>
        {invalidFio2 && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>FiO₂ muss &gt; 0.</span>}
        {pfRatio != null && (
          <span className="text-sm"><strong>P/F Ratio:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(pfRatio, 0)}</span></span>
        )}
      </div>
    </div>
  )
}
