import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'

const E_OPTIONS = [1, 2, 3, 4] as const
const V_OPTIONS = [1, 2, 3, 4, 5] as const
const M_OPTIONS = [1, 2, 3, 4, 5, 6] as const

export function GcsCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const [e, setE] = useState<number>(config?.e != null && Number.isFinite(Number(config.e)) ? Number(config.e) : 4)
  const [v, setV] = useState<number>(config?.v != null && Number.isFinite(Number(config.v)) ? Number(config.v) : 5)
  const [m, setM] = useState<number>(config?.m != null && Number.isFinite(Number(config.m)) ? Number(config.m) : 6)

  const total = useMemo(() => e + v + m, [e, v, m])

  const inputStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>GCS Helper</div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>Eye · Verbal · Motor</div>
        </div>
        <div className="flex shrink-0 gap-1">
          {onDuplicate != null && <button type="button" onClick={onDuplicate} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-blue-500/20" style={{ color: 'var(--color-text-muted)' }} title="Duplizieren">📋</button>}
          {onRemove != null && <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-500/20 hover:text-red-400" style={{ color: 'var(--color-text-muted)' }} title="Block entfernen">🗑 Entfernen</button>}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>E</span>
          <select value={e} onChange={(e) => setE(Number(e.target.value))} className="h-9 w-16 rounded-lg border px-2 text-sm focus:outline-none" style={inputStyle}>
            {E_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>V</span>
          <select value={v} onChange={(e) => setV(Number(e.target.value))} className="h-9 w-16 rounded-lg border px-2 text-sm focus:outline-none" style={inputStyle}>
            {V_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>M</span>
          <select value={m} onChange={(e) => setM(Number(e.target.value))} className="h-9 w-16 rounded-lg border px-2 text-sm focus:outline-none" style={inputStyle}>
            {M_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>E{e} V{v} M{m} = {total}</span>
      </div>
    </div>
  )
}
