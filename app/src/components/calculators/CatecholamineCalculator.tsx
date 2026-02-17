import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const DEFAULTS = { mgInSyringe: 4, mlTotal: 50, targetMcgPerKgMin: 0.1 }

export function CatecholamineCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const c = { ...DEFAULTS, ...config }
  const mgInSyringe = Number(c.mgInSyringe) || DEFAULTS.mgInSyringe
  const mlTotal = Number(c.mlTotal) || DEFAULTS.mlTotal
  const [weightInput, setWeightInput] = useState('')
  const [targetInput, setTargetInput] = useState(String(c.targetMcgPerKgMin ?? DEFAULTS.targetMcgPerKgMin))

  const weight = useMemo(() => {
    const n = parseFloat(weightInput.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [weightInput])

  const targetMcgPerKgMin = useMemo(() => {
    const n = parseFloat(targetInput.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : DEFAULTS.targetMcgPerKgMin
  }, [targetInput])

  const { mlPerH, mcgPerMin, mcgPerKgMin } = useMemo(() => {
    if (weight == null) return { mlPerH: null, mcgPerMin: null, mcgPerKgMin: null }
    const mcgPerMl = (mgInSyringe / mlTotal) * 1000
    const requiredMcgPerMin = targetMcgPerKgMin * weight
    const mlPerMin = requiredMcgPerMin / mcgPerMl
    const mlPerHVal = mlPerMin * 60
    return {
      mlPerH: mlPerHVal,
      mcgPerMin: requiredMcgPerMin,
      mcgPerKgMin: targetMcgPerKgMin,
    }
  }, [weight, targetMcgPerKgMin, mgInSyringe, mlTotal])

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
            Katecholamin Perfusor
          </div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {mgInSyringe} mg / {mlTotal} ml · Ziel: {deFormat(targetMcgPerKgMin, 2)} µg/kg/min
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {onDuplicate != null && (
            <button
              type="button"
              onClick={onDuplicate}
              className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-blue-500/20"
              style={{ color: 'var(--color-text-muted)' }}
              title="Duplizieren"
            >
              📋
            </button>
          )}
          {onRemove != null && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-500/20 hover:text-red-400"
              style={{ color: 'var(--color-text-muted)' }}
              title="Block entfernen"
            >
              🗑 Entfernen
            </button>
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
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ziel (µg/kg/min)</span>
          <input
            type="text"
            inputMode="decimal"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            className="h-9 w-20 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }}
          />
        </label>
        {mlPerH != null && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span><strong>ml/h:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mlPerH, 1)}</span></span>
            <span><strong>µg/min:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mcgPerMin!, 1)}</span></span>
            <span><strong>µg/kg/min:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mcgPerKgMin!, 2)}</span></span>
          </div>
        )}
      </div>
    </div>
  )
}
