import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const DEFAULTS = { doseMgPerKg: 10, maxDoseMg: 500, vialMg: 1000, finalVialVolumeMl: 10, concentrationMgPerMl: undefined as number | undefined }

export function WeightDoseCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const c = { ...DEFAULTS, ...config }
  const doseMgPerKg = Number.isFinite(Number(c.doseMgPerKg)) ? Number(c.doseMgPerKg) : DEFAULTS.doseMgPerKg
  const maxDoseMg = c.maxDoseMg != null ? Number(c.maxDoseMg) : undefined
  const vialMg = c.vialMg != null ? Number(c.vialMg) : undefined
  const finalVialVolumeMl = c.finalVialVolumeMl != null ? Number(c.finalVialVolumeMl) : undefined
  const concentrationMgPerMl = c.concentrationMgPerMl != null ? Number(c.concentrationMgPerMl) : undefined
  const [weightInput, setWeightInput] = useState('')

  const weight = useMemo(() => {
    const n = parseFloat(weightInput.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [weightInput])

  const { doseMg, volumeMl, vials, capped } = useMemo(() => {
    if (weight == null) return { doseMg: null, volumeMl: null, vials: null, capped: false }
    let doseVal = weight * doseMgPerKg
    const cappedVal = maxDoseMg != null && doseVal > maxDoseMg
    if (maxDoseMg != null) doseVal = Math.min(doseVal, maxDoseMg)
    let volumeMlVal: number | null = null
    if (concentrationMgPerMl != null && concentrationMgPerMl > 0) {
      volumeMlVal = doseVal / concentrationMgPerMl
    } else if (vialMg != null && vialMg > 0 && finalVialVolumeMl != null) {
      volumeMlVal = doseVal * finalVialVolumeMl / vialMg
    }
    const vialsVal = vialMg != null && vialMg > 0 ? Math.ceil(doseVal / vialMg) : null
    return { doseMg: doseVal, volumeMl: volumeMlVal, vials: vialsVal, capped: cappedVal }
  }, [weight, doseMgPerKg, maxDoseMg, vialMg, finalVialVolumeMl, concentrationMgPerMl])

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
            mg/kg Standard
          </div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {deFormat(doseMgPerKg, 1)} mg/kg{maxDoseMg != null ? ` (max. ${maxDoseMg} mg)` : ''}
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
        {doseMg != null && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span><strong>Dosis (mg):</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(doseMg, 1)}</span>{capped && <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>(max)</span>}</span>
            {volumeMl != null && <span><strong>Volumen (ml):</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(volumeMl, 1)}</span></span>}
            {vials != null && <span><strong>Durchstechflaschen:</strong> <span style={{ color: 'var(--color-accent)' }}>{vials}</span></span>}
          </div>
        )}
      </div>
    </div>
  )
}
