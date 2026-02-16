import { useState, useMemo } from 'react'

export interface DantroleneCalculatorConfig {
  doseMgPerKg?: number
  vialMg?: number
  finalVialVolumeMl?: number
  maxDoseMg?: number
  label?: string
}

const DEFAULTS: Required<Omit<DantroleneCalculatorConfig, 'label'>> & { label?: string } = {
  doseMgPerKg: 2.5,
  vialMg: 120,
  finalVialVolumeMl: 22.6,
  maxDoseMg: 300,
  label: 'Dantrolen (Agilus) 120 mg',
}

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

interface DantroleneCalculatorProps {
  config?: DantroleneCalculatorConfig | null
}

export function DantroleneCalculator({ config }: DantroleneCalculatorProps) {
  const c = { ...DEFAULTS, ...config }
  const [weightInput, setWeightInput] = useState('')

  const weight = useMemo(() => {
    const n = parseFloat(weightInput.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [weightInput])

  const { doseMg, volumeMl, vials, capped } = useMemo(() => {
    if (weight == null) return { doseMg: null, volumeMl: null, vials: null, capped: false }
    const rawDose = weight * c.doseMgPerKg
    const doseMgVal = c.maxDoseMg != null ? Math.min(rawDose, c.maxDoseMg) : rawDose
    const cappedVal = c.maxDoseMg != null && rawDose > c.maxDoseMg
    const volumeMlVal = doseMgVal * c.finalVialVolumeMl / c.vialMg
    const vialsVal = Math.ceil(doseMgVal / c.vialMg)
    return { doseMg: doseMgVal, volumeMl: volumeMlVal, vials: vialsVal, capped: cappedVal }
  }, [weight, c.doseMgPerKg, c.vialMg, c.finalVialVolumeMl, c.maxDoseMg])

  const title = c.label ?? 'Dantrolen-Rechner'

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-card)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div className="mb-3 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {title}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Gewicht (kg)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-app)',
              color: 'var(--color-text-primary)',
            }}
          />
        </label>
        {doseMg != null && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              <strong>Dosis (mg):</strong>{' '}
              <span style={{ color: 'var(--color-accent)' }}>{deFormat(doseMg, 1)}</span>
              {capped && (
                <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  (max. {c.maxDoseMg} mg)
                </span>
              )}
            </span>
            <span>
              <strong>Volumen (ml):</strong>{' '}
              <span style={{ color: 'var(--color-accent)' }}>{deFormat(volumeMl, 1)}</span>
            </span>
            <span>
              <strong>Durchstechflaschen:</strong>{' '}
              <span style={{ color: 'var(--color-accent)' }}>{vials}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
