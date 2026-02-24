import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const DEFAULTS = { ieInSyringe: 25000, mlTotal: 50, targetIEPerKgH: 18 }

export function HeparinCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const c = { ...DEFAULTS, ...config }
  const ieInSyringe = Number(c.ieInSyringe) || DEFAULTS.ieInSyringe
  const mlTotal = Number(c.mlTotal) || DEFAULTS.mlTotal
  const targetIEPerKgH = Number.isFinite(Number(c.targetIEPerKgH)) ? Number(c.targetIEPerKgH) : DEFAULTS.targetIEPerKgH
  const [weightInput, setWeightInput] = useState('')

  const weight = useMemo(() => {
    const n = parseFloat(weightInput.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [weightInput])

  const { mlPerH } = useMemo(() => {
    if (weight == null) return { mlPerH: null }
    const iePerMl = ieInSyringe / mlTotal
    const requiredIEPerH = targetIEPerKgH * weight
    const mlPerHVal = requiredIEPerH / iePerMl
    return { mlPerH: mlPerHVal }
  }, [weight, ieInSyringe, mlTotal, targetIEPerKgH])

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-card)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Heparin Perfusor
          </div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {deFormat(ieInSyringe, 0)} IE / {mlTotal} ml · Ziel: {deFormat(targetIEPerKgH, 0)} IE/kg/h
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {onDuplicate != null && (
            <button type="button" onClick={onDuplicate} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-blue-500/20" style={{ color: 'var(--color-text-muted)' }} title="Duplizieren">📋</button>
          )}
          {onRemove != null && (
            <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-500/20 hover:text-red-400" style={{ color: 'var(--color-text-muted)' }} title="Block entfernen">🗑 Entfernen</button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gewicht (kg)</span>
          <input
            type="text"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }}
          />
        </label>
        {mlPerH != null && (
          <span className="text-sm"><strong>ml/h:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mlPerH, 1)}</span></span>
        )}
      </div>
    </div>
  )
}
