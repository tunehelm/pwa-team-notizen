import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export function PbwArdsCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const [gender, setGender] = useState<'male' | 'female'>((config?.gender as 'male' | 'female') ?? 'male')
  const [heightInput, setHeightInput] = useState('')

  const heightCm = useMemo(() => {
    const n = parseFloat(heightInput.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : null
  }, [heightInput])

  const { pbw, tvMin, tvMax } = useMemo(() => {
    if (heightCm == null) return { pbw: null, tvMin: null, tvMax: null }
    let pbwVal: number
    if (gender === 'male') {
      pbwVal = 50 + 0.91 * (heightCm - 152.4)
    } else {
      pbwVal = 45.5 + 0.91 * (heightCm - 152.4)
    }
    const tvMinVal = pbwVal * 4
    const tvMaxVal = pbwVal * 8
    return { pbw: pbwVal, tvMin: tvMinVal, tvMax: tvMaxVal }
  }, [heightCm, gender])

  const inputStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>IBW / PBW (ARDS)</div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>ARDSNet-Formel · TV nur Berechnung</div>
        </div>
        <div className="flex shrink-0 gap-1">
          {onDuplicate != null && <button type="button" onClick={onDuplicate} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-blue-500/20" style={{ color: 'var(--color-text-muted)' }} title="Duplizieren">📋</button>}
          {onRemove != null && <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-500/20 hover:text-red-400" style={{ color: 'var(--color-text-muted)' }} title="Block entfernen">🗑 Entfernen</button>}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Geschlecht</span>
          <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')} className="h-9 rounded-lg border px-2 text-sm focus:outline-none" style={inputStyle}>
            <option value="male">m</option>
            <option value="female">w</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Größe (cm)</span>
          <input type="text" inputMode="decimal" value={heightInput} onChange={(e) => setHeightInput(e.target.value)} className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
        </label>
        {pbw != null && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span><strong>PBW:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(pbw, 1)}</span> kg</span>
            {tvMin != null && tvMax != null && (
              <span><strong>TV 4–8 ml/kg:</strong> <span style={{ color: 'var(--color-accent)' }}>{deFormat(tvMin, 0)}–{deFormat(tvMax, 0)}</span> ml</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
