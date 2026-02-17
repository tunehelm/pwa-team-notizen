import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'
import { FormulaToggle } from './FormulaToggle'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

type Fio2Mode = 'fraction' | 'percent'

const FORMULA_LINES = [
  'P/F (Horovitz-Index) = PaO₂ / FiO₂',
  'Berlin (PEEP ≥ 5): mild 201–300, moderat 101–200, schwer ≤ 100',
]

function classifyBerlin(pf: number): 'kein ARDS' | 'mild' | 'moderat' | 'schwer' {
  if (pf > 300) return 'kein ARDS'
  if (pf >= 201) return 'mild'
  if (pf >= 101) return 'moderat'
  return 'schwer'
}

export function PfRatioCalculator({ onRemove, onDuplicate }: CalculatorBlockProps) {
  const [pao2Input, setPao2Input] = useState('')
  const [fio2Input, setFio2Input] = useState('0,21')
  const [fio2Mode, setFio2Mode] = useState<Fio2Mode>('fraction')
  const [peepInput, setPeepInput] = useState('')

  const pao2 = useMemo(() => {
    const n = parseFloat(pao2Input.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [pao2Input])

  const fio2Fraction = useMemo(() => {
    const n = parseFloat(fio2Input.replace(',', '.'))
    if (!Number.isFinite(n)) return null
    if (fio2Mode === 'fraction') {
      return n > 0 && n <= 1 ? n : null
    }
    const fraction = n / 100
    return n >= 21 && n <= 100 ? fraction : null
  }, [fio2Input, fio2Mode])

  const peep = useMemo(() => {
    if (peepInput.trim() === '') return null
    const n = parseFloat(peepInput.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [peepInput])

  const horovitzIndex = useMemo(() => {
    if (pao2 == null || fio2Fraction == null || fio2Fraction <= 0) return null
    return Math.round(pao2 / fio2Fraction)
  }, [pao2, fio2Fraction])

  const berlinAssessable = peep !== null && peep >= 5
  const berlinLabel = useMemo(() => {
    if (berlinAssessable && horovitzIndex != null) return classifyBerlin(horovitzIndex)
    if (peep !== null && peep < 5) return 'Berlin-Klassifikation nicht beurteilbar (PEEP < 5 cmH₂O)'
    return 'Berlin-Klassifikation nicht beurteilbar (PEEP/CPAP nicht angegeben)'
  }, [berlinAssessable, horovitzIndex, peep])

  const invalidFio2 = fio2Input !== '' && fio2Fraction == null
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
            PaO₂/FiO₂ (Horovitz-Index / HW-Index)
          </div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Berlin-Definition gilt bei PEEP/CPAP ≥ 5 cmH₂O
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
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>PaO₂ (mmHg)</span>
          <input
            type="text"
            inputMode="decimal"
            value={pao2Input}
            onChange={(e) => setPao2Input(e.target.value)}
            className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>FiO₂</span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={fio2Input}
              onChange={(e) => setFio2Input(e.target.value)}
              className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
              style={{ ...inputStyle, ...(invalidFio2 ? { borderColor: 'var(--color-accent)' } : {}) }}
            />
            <button
              type="button"
              onClick={() => {
                if (fio2Fraction != null) {
                  const nextMode: Fio2Mode = fio2Mode === 'fraction' ? 'percent' : 'fraction'
                  setFio2Mode(nextMode)
                  if (nextMode === 'percent') setFio2Input(String(Math.round(fio2Fraction * 100)))
                  else setFio2Input(fio2Fraction.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                } else {
                  setFio2Mode((m) => (m === 'fraction' ? 'percent' : 'fraction'))
                }
              }}
              className="rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              title={fio2Mode === 'fraction' ? 'Als Prozent eingeben (21–100)' : 'Als Fraktion eingeben (0,21–1,0)'}
            >
              {fio2Mode === 'fraction' ? '0,21–1' : '21–100 %'}
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>PEEP/CPAP (cmH₂O, optional)</span>
          <input
            type="text"
            inputMode="decimal"
            value={peepInput}
            onChange={(e) => setPeepInput(e.target.value)}
            placeholder="—"
            className="h-9 w-24 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
      </div>

      {invalidFio2 && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          FiO₂ {fio2Mode === 'fraction' ? '0,21–1,0 (Fraktion)' : '21–100 (%)'}.
        </p>
      )}

      {(horovitzIndex != null || berlinLabel) && (
        <div className="mt-3 flex flex-wrap gap-3">
          {horovitzIndex != null && (
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                PaO₂/FiO₂ (Horovitz-Index / HW-Index)
              </div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                {deFormat(horovitzIndex, 0)} mmHg
              </div>
            </div>
          )}
          <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Berlin-ARDS-Klassifikation
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
              {berlinLabel}
            </div>
          </div>
        </div>
      )}

      <FormulaToggle title="Berechnungsformel" lines={FORMULA_LINES} note="Rechenhilfe – klinische Prüfung erforderlich." />
    </div>
  )
}
