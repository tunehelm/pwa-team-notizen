import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'
import { FormulaToggle } from './FormulaToggle'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const DEFAULTS = {
  label: 'Noradrenalin Perfusor',
  mgTotal: 5,
  mlTotal: 50,
  defaultRateMlH: 5,
  defaultWeightKg: 70,
}

const FORMULA_LINES = [
  'µg/ml = (mgTotal/mlTotal) × 1000',
  'µg/h = ml/h × µg/ml',
  'µg/min = (µg/h)/60',
  'µg/kg/min = (µg/min)/kg',
  'rate ml/h = (target×kg×60)/(µg/ml)',
]

type LastEdited = 'rate' | 'target'

export function NoradrenalinePerfusorCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const c = { ...DEFAULTS, ...config }
  const [mgTotalInput, setMgTotalInput] = useState(String(c.mgTotal ?? DEFAULTS.mgTotal))
  const [mlTotalInput, setMlTotalInput] = useState(String(c.mlTotal ?? DEFAULTS.mlTotal))
  const [rateInput, setRateInput] = useState(String(c.defaultRateMlH ?? DEFAULTS.defaultRateMlH))
  const [weightInput, setWeightInput] = useState(String(c.defaultWeightKg ?? DEFAULTS.defaultWeightKg))
  const [targetInput, setTargetInput] = useState('')
  const [lastEdited, setLastEdited] = useState<LastEdited>('rate')

  const label = (c.label as string) ?? DEFAULTS.label

  const mgTotal = useMemo(() => {
    const n = parseFloat(mgTotalInput.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }, [mgTotalInput])
  const mlTotal = useMemo(() => {
    const n = parseFloat(mlTotalInput.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }, [mlTotalInput])

  const mcgPerMl = useMemo(() => {
    if (mgTotal <= 0 || mlTotal <= 0) return null
    return (mgTotal / mlTotal) * 1000
  }, [mgTotal, mlTotal])

  const weight = useMemo(() => {
    const n = parseFloat(weightInput.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : null
  }, [weightInput])

  const rateMlH = useMemo(() => {
    const n = parseFloat(rateInput.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [rateInput])

  const targetUcgKgMin = useMemo(() => {
    const n = parseFloat(targetInput.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [targetInput])

  const { mcgPerH, mcgPerMin, mcgPerKgMin, derivedRateMlH } = useMemo(() => {
    if (mcgPerMl == null) return { mcgPerH: null, mcgPerMin: null, mcgPerKgMin: null, derivedRateMlH: null as number | null }
    if (lastEdited === 'target' && targetUcgKgMin != null && weight != null && weight > 0) {
      const requiredMcgPerMin = targetUcgKgMin * weight
      const requiredMcgPerH = requiredMcgPerMin * 60
      const rateMlHVal = requiredMcgPerH / mcgPerMl
      const mcgPerHVal = rateMlHVal * mcgPerMl
      const mcgPerMinVal = mcgPerHVal / 60
      return {
        mcgPerH: mcgPerHVal,
        mcgPerMin: mcgPerMinVal,
        mcgPerKgMin: targetUcgKgMin,
        derivedRateMlH: rateMlHVal,
      }
    }
    if (rateMlH != null) {
      const mcgPerHVal = rateMlH * mcgPerMl
      const mcgPerMinVal = mcgPerHVal / 60
      const mcgPerKgMinVal = weight != null && weight > 0 ? mcgPerMinVal / weight : null
      return { mcgPerH: mcgPerHVal, mcgPerMin: mcgPerMinVal, mcgPerKgMin: mcgPerKgMinVal, derivedRateMlH: null }
    }
    return { mcgPerH: null, mcgPerMin: null, mcgPerKgMin: null, derivedRateMlH: null }
  }, [mcgPerMl, rateMlH, targetUcgKgMin, weight, lastEdited])

  const invalidConcentration = mgTotal <= 0 || mlTotal <= 0
  const hasValidConcentration = mgTotal > 0 && mlTotal > 0
  const invalidRate = rateInput !== '' && rateMlH == null
  const targetSetNoWeight = (targetInput !== '' && targetUcgKgMin != null) && (weight == null || weight <= 0)
  const inputStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }

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
            {label}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Standard: 5 mg / 50 ml NaCl 0,9%
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {onDuplicate != null && (
            <button type="button" onClick={onDuplicate} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-blue-500/20" style={{ color: 'var(--color-text-muted)' }} title="Duplizieren">
              📋
            </button>
          )}
          {onRemove != null && (
            <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-500/20 hover:text-red-400" style={{ color: 'var(--color-text-muted)' }} title="Block entfernen">
              🗑 Entfernen
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>mg (Total)</span>
          <input
            type="text"
            inputMode="decimal"
            value={mgTotalInput}
            onChange={(e) => setMgTotalInput(e.target.value)}
            className="h-9 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ml (Total)</span>
          <input
            type="text"
            inputMode="decimal"
            value={mlTotalInput}
            onChange={(e) => setMlTotalInput(e.target.value)}
            className="h-9 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Laufrate ml/h</span>
          <input
            type="text"
            inputMode="decimal"
            value={lastEdited === 'target' && derivedRateMlH != null ? deFormat(derivedRateMlH, 1) : rateInput}
            onChange={(e) => { setLastEdited('rate'); setRateInput(e.target.value); setTargetInput('') }}
            className="h-9 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={{ ...inputStyle, ...(invalidRate ? { borderColor: 'var(--color-accent)' } : {}) }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gewicht (kg)</span>
          <input
            type="text"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="h-9 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ziel µg/kg/min</span>
          <input
            type="text"
            inputMode="decimal"
            value={lastEdited === 'rate' && mcgPerKgMin != null ? deFormat(mcgPerKgMin, 2) : targetInput}
            onChange={(e) => { setLastEdited('target'); setTargetInput(e.target.value); setRateInput('') }}
            className="h-9 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
      </div>

      {invalidConcentration && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>Ungültige Konzentration</p>
      )}
      {invalidRate && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>Ungültige Laufrate</p>
      )}
      {targetSetNoWeight && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>Für µg/kg/min bitte Gewicht angeben.</p>
      )}

      {hasValidConcentration && mcgPerMl != null && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span><strong>Konzentration:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mcgPerMl, 1)}</span> µg/ml</span>
          {mcgPerH != null && <span><strong>µg/h:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mcgPerH, 0)}</span></span>}
          {mcgPerMin != null && <span><strong>µg/min:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mcgPerMin, 1)}</span></span>}
          {mcgPerKgMin != null && weight != null && <span><strong>µg/kg/min:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mcgPerKgMin, 2)}</span></span>}
        </div>
      )}

      <FormulaToggle lines={FORMULA_LINES} note="Rechenhilfe – klinische Prüfung erforderlich." />
    </div>
  )
}
