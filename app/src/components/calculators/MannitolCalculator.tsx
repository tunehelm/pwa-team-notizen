import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'
import { FormulaToggle } from './FormulaToggle'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const DEFAULTS = {
  label: 'Mannitol / Osmofundin 15 %',
  doseGPerKg: 0.5,
  concentrationGPerMl: 0.15,
}

const FORMULA_LINES = [
  'g Mannitol = kg × (g/kg)',
  'ml Osmofundin = g / 0,15',
]

export function MannitolCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const c = { ...DEFAULTS, ...config }
  const label = (c.label as string) ?? DEFAULTS.label
  const doseGPerKg = Number.isFinite(Number(c.doseGPerKg)) ? Number(c.doseGPerKg) : DEFAULTS.doseGPerKg
  const concentrationGPerMl = Number.isFinite(Number(c.concentrationGPerMl)) ? Number(c.concentrationGPerMl) : DEFAULTS.concentrationGPerMl

  const [weightInput, setWeightInput] = useState('')
  const [doseInput, setDoseInput] = useState(String(doseGPerKg))

  const weightKg = useMemo(() => {
    const n = parseFloat(weightInput.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : null
  }, [weightInput])

  const doseGPerKgVal = useMemo(() => {
    const n = parseFloat(doseInput.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : doseGPerKg
  }, [doseInput, doseGPerKg])

  const { gTotal, volumeMl } = useMemo(() => {
    if (weightKg == null || concentrationGPerMl <= 0) return { gTotal: null, volumeMl: null }
    const g = weightKg * doseGPerKgVal
    const ml = g / concentrationGPerMl
    return { gTotal: g, volumeMl: ml }
  }, [weightKg, doseGPerKgVal, concentrationGPerMl])

  const invalidWeight = weightInput !== '' && weightKg == null
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
            {label}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Typische Gabe: 0,5 g/kg KG über 1–4 h
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
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Dosis (g/kg)</span>
          <input
            type="text"
            inputMode="decimal"
            value={doseInput}
            onChange={(e) => setDoseInput(e.target.value)}
            className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
      </div>
      {invalidWeight && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Bitte ein gültiges Gewicht angeben.
        </p>
      )}
      {gTotal != null && volumeMl != null && (
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mannitol (g)</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{deFormat(gTotal, 1)}</div>
          </div>
          <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Osmofundin 15 % (ml)</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{deFormat(volumeMl, 1)}</div>
          </div>
        </div>
      )}
      <FormulaToggle lines={FORMULA_LINES} note="Rechenhilfe – klinische Prüfung erforderlich." />
    </div>
  )
}
