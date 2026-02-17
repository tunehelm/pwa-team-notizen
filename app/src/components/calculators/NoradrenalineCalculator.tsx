import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const DEFAULTS = { mgTotal: 4, mlTotal: 50, targetMcgPerKgMin: 0.1 }

type LastEdited = 'target' | 'rate'

const PRESETS = [
  { mgTotal: 4, mlTotal: 50 },
  { mgTotal: 8, mlTotal: 50 },
  { mgTotal: 16, mlTotal: 50 },
]

export function NoradrenalineCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const c = { ...DEFAULTS, ...config }
  const [mgTotal, setMgTotal] = useState(Number(c.mgTotal) || DEFAULTS.mgTotal)
  const [mlTotal, setMlTotal] = useState(Number(c.mlTotal) || DEFAULTS.mlTotal)
  const [weightInput, setWeightInput] = useState('')
  const [targetInput, setTargetInput] = useState(String(c.targetMcgPerKgMin ?? DEFAULTS.targetMcgPerKgMin))
  const [rateInput, setRateInput] = useState('')
  const [lastEdited, setLastEdited] = useState<LastEdited>('target')

  const weight = useMemo(() => {
    const n = parseFloat(weightInput.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : null
  }, [weightInput])

  const mcgPerMl = useMemo(() => {
    if (mgTotal <= 0 || mlTotal <= 0) return null
    return (mgTotal / mlTotal) * 1000
  }, [mgTotal, mlTotal])

  const { targetMcgPerKgMin, mlPerH, mcgPerMin } = useMemo(() => {
    if (weight == null || mcgPerMl == null) return { targetMcgPerKgMin: null, mlPerH: null, mcgPerMin: null }
    if (lastEdited === 'rate') {
      const mlPerHVal = parseFloat(rateInput.replace(',', '.'))
      if (!Number.isFinite(mlPerHVal) || mlPerHVal < 0) return { targetMcgPerKgMin: null, mlPerH: null, mcgPerMin: null }
      const mcgPerMinVal = (mlPerHVal / 60) * mcgPerMl
      const targetVal = weight > 0 ? mcgPerMinVal / weight : 0
      return { targetMcgPerKgMin: targetVal, mlPerH: mlPerHVal, mcgPerMin: mcgPerMinVal }
    }
    const targetVal = parseFloat(targetInput.replace(',', '.'))
    if (!Number.isFinite(targetVal) || targetVal < 0) return { targetMcgPerKgMin: null, mlPerH: null, mcgPerMin: null }
    const mcgPerMinVal = targetVal * weight
    const mlPerMin = mcgPerMinVal / mcgPerMl
    const mlPerHVal = mlPerMin * 60
    return { targetMcgPerKgMin: targetVal, mlPerH: mlPerHVal, mcgPerMin: mcgPerMinVal }
  }, [weight, targetInput, rateInput, mcgPerMl, lastEdited])

  const invalidWeight = weightInput !== '' && weight == null
  const invalidConcentration = mgTotal <= 0 || mlTotal <= 0
  const showSafetyHint = true

  const inputStyle = {
    borderColor: 'var(--color-border)',
    backgroundColor: 'var(--color-bg-app)',
    color: 'var(--color-text-primary)',
  }

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
            Noradrenalin PRO
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>{mgTotal} mg / {mlTotal} ml</span>
            {PRESETS.map((p) => (
              <button
                key={`${p.mgTotal}-${p.mlTotal}`}
                type="button"
                onClick={() => { setMgTotal(p.mgTotal); setMlTotal(p.mlTotal) }}
                className="rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--color-border)]"
              >
                {p.mgTotal}/50 ml
              </button>
            ))}
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
            style={{ ...inputStyle, ...(invalidWeight ? { borderColor: 'var(--color-accent)' } : {}) }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ziel µg/kg/min</span>
          <input
            type="text"
            inputMode="decimal"
            value={lastEdited === 'target' ? targetInput : (targetMcgPerKgMin != null ? deFormat(targetMcgPerKgMin, 2) : '')}
            onChange={(e) => { setLastEdited('target'); setTargetInput(e.target.value); setRateInput('') }}
            className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Rate ml/h</span>
          <input
            type="text"
            inputMode="decimal"
            value={lastEdited === 'rate' ? rateInput : (mlPerH != null ? deFormat(mlPerH, 1) : '')}
            onChange={(e) => { setLastEdited('rate'); setRateInput(e.target.value); setTargetInput('') }}
            className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
        {(invalidWeight || invalidConcentration) && (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {invalidWeight && 'Gewicht prüfen. '}
            {invalidConcentration && 'Konzentration (mg/ml) prüfen.'}
          </span>
        )}
        {weight != null && mcgPerMl != null && targetMcgPerKgMin != null && mlPerH != null && mcgPerMin != null && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span><strong>ml/h:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mlPerH, 1)}</span></span>
            <span><strong>µg/min:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mcgPerMin, 1)}</span></span>
            <span><strong>µg/kg/min:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(targetMcgPerKgMin, 2)}</span></span>
          </div>
        )}
      </div>
      {showSafetyHint && (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Rechenhilfe – klinische Prüfung erforderlich.
        </p>
      )}
    </div>
  )
}
