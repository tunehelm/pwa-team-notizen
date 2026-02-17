import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const DRUGS = [
  { id: 'propofol', label: 'Propofol', defaultMgPerMl: 10 },
  { id: 'midazolam', label: 'Midazolam', defaultMgPerMl: 1 },
] as const

export function SedationInfusionCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const [drugId, setDrugId] = useState((config?.drug as string) ?? 'propofol')
  const drug = DRUGS.find((d) => d.id === drugId) ?? DRUGS[0]
  const [mgPerMl, setMgPerMl] = useState(Number(config?.mgPerMl) || drug.defaultMgPerMl)
  const [weightInput, setWeightInput] = useState('')
  const [rateInput, setRateInput] = useState('')

  const weight = useMemo(() => {
    const n = parseFloat(weightInput.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : null
  }, [weightInput])

  const mgPerKgPerH = useMemo(() => {
    const n = parseFloat(rateInput.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [rateInput])

  const { mgPerH, mlPerH } = useMemo(() => {
    if (weight == null || mgPerKgPerH == null || mgPerMl <= 0) return { mgPerH: null, mlPerH: null }
    const mgPerHVal = weight * mgPerKgPerH
    const mlPerHVal = mgPerHVal / mgPerMl
    return { mgPerH: mgPerHVal, mlPerH: mlPerHVal }
  }, [weight, mgPerKgPerH, mgPerMl])

  const invalidWeight = weightInput !== '' && weight == null
  const inputStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Sedierungs-Perfusor</div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <select
              value={drugId}
              onChange={(e) => {
                const id = e.target.value
                const d = DRUGS.find((x) => x.id === id)
                if (d) { setDrugId(d.id); setMgPerMl(d.defaultMgPerMl) }
              }}
              className="rounded border px-1.5 py-0.5 text-xs focus:outline-none"
              style={inputStyle}
            >
              {DRUGS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
            {' '}· {deFormat(mgPerMl, 1)} mg/ml
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {onDuplicate != null && <button type="button" onClick={onDuplicate} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-blue-500/20" style={{ color: 'var(--color-text-muted)' }} title="Duplizieren">📋</button>}
          {onRemove != null && <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-500/20 hover:text-red-400" style={{ color: 'var(--color-text-muted)' }} title="Block entfernen">🗑 Entfernen</button>}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gewicht (kg)</span>
          <input type="text" inputMode="decimal" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ziel mg/kg/h</span>
          <input type="text" inputMode="decimal" value={rateInput} onChange={(e) => setRateInput(e.target.value)} className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
        </label>
        {invalidWeight && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gewicht prüfen.</span>}
        {mgPerH != null && mlPerH != null && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span><strong>ml/h:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mlPerH, 1)}</span></span>
            <span><strong>mg/h:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(mgPerH, 1)}</span></span>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>Rechenhilfe – klinische Prüfung erforderlich.</p>
    </div>
  )
}
