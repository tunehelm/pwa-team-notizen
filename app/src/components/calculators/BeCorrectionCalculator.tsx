import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'
import { FormulaToggle } from './FormulaToggle'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const FORMULA_LINES = [
  'beAbs = max(0, −BE)',
  'TRIS (ml) = beAbs × 0,1 × kg',
  'NaHCO₃ (ml) = beAbs × 0,3 × kg',
]

export function BeCorrectionCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const label = (config?.label as string) ?? 'BE-Korrektur (TRIS / NaHCO₃)'
  const [weightInput, setWeightInput] = useState('')
  const [beInput, setBeInput] = useState('')

  const weight = useMemo(() => {
    const n = parseFloat(weightInput.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : null
  }, [weightInput])

  const be = useMemo(() => {
    const n = parseFloat(beInput.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }, [beInput])

  const { trisMl, nahco3Ml } = useMemo(() => {
    if (weight == null || be == null) return { trisMl: null, nahco3Ml: null }
    const beAbsVal = Math.max(0, -be)
    const trisMlVal = beAbsVal * 0.1 * weight
    const nahco3MlVal = beAbsVal * 0.3 * weight
    return { trisMl: trisMlVal, nahco3Ml: nahco3MlVal }
  }, [weight, be])

  const invalidWeight = weightInput !== '' && weight == null
  const beNonNegative = be != null && be >= 0
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
            TRIS · NaHCO₃
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
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Base Excess (BE)</span>
          <input
            type="text"
            inputMode="decimal"
            value={beInput}
            onChange={(e) => setBeInput(e.target.value)}
            className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
      </div>
      {invalidWeight && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Bitte ein gültiges Gewicht eingeben.
        </p>
      )}
      {beNonNegative && beInput !== '' && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          BE ist nicht negativ; die Rechnung wird typischerweise bei negativem BE (Azidose) verwendet.
        </p>
      )}
      {trisMl != null && nahco3Ml != null && (
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>TRIS-Menge (ml)</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{deFormat(trisMl, 1)}</div>
          </div>
          <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Natriumbicarbonat-Menge (ml)</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{deFormat(nahco3Ml, 1)}</div>
          </div>
        </div>
      )}
      <FormulaToggle lines={FORMULA_LINES} note="Rechenhilfe – klinische Prüfung erforderlich." />
    </div>
  )
}
