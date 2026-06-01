import { useState, useMemo } from 'react'
import type { CalculatorBlockProps } from './registry'
import { PERFUSOR_MEDICATIONS, getPerfusorMedicationById } from './perfusorMedications'
import type { ClinicalInfo } from './perfusorMedications'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const parseDecimal = (s: string): number | null => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

const inputStyle = {
  borderColor: 'var(--color-border)',
  backgroundColor: 'var(--color-bg-app)',
  color: 'var(--color-text-primary)',
}

const sectionStyle = {
  borderColor: 'var(--color-border)',
  backgroundColor: 'var(--color-bg-app)',
  color: 'var(--color-text-secondary)',
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-x-2 gap-y-0.5">
      <span className="font-semibold shrink-0" style={{ color: 'var(--color-text-primary)' }}>
        {label}
      </span>
      <span>{value}</span>
    </div>
  )
}

function DosageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2" style={{ borderColor: 'var(--color-border)' }}>
      <span
        className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {value}
      </span>
    </div>
  )
}

function ClinicalInfoPanel({ info, name }: { info: ClinicalInfo; name: string }) {
  return (
    <div className="mt-2 rounded-lg border p-3 text-xs space-y-2.5" style={sectionStyle}>
      <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {name} – Klinische Informationen
      </p>

      <div className="space-y-1.5">
        <InfoRow label="Rezeptor/Wirkung" value={info.receptorEffect} />
        <InfoRow label="Halbwertszeit (HWZ)" value={info.halfLife} />
        <InfoRow label="Morphin-Äquivalenz" value={info.morphineEquivalence} />
        <InfoRow label="Indikation" value={info.indication} />
        <InfoRow label="Kontraindikationen" value={info.contraindications} />
        <InfoRow label="Wichtige Hinweise (Cave)" value={info.cave} />
      </div>

      <div>
        <p
          className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Dosierungsorientierung (Analgesie-Komponente)
        </p>
        <div className="grid gap-1.5 sm:grid-cols-3">
          <DosageRow label="Leicht" value={info.dosageGuidance.mild} />
          <DosageRow label="Mittel" value={info.dosageGuidance.moderate} />
          <DosageRow label="Tief" value={info.dosageGuidance.deep} />
        </div>
      </div>

      <p
        className="border-t pt-2 text-[10px] italic"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        Opioide steuern primär die Analgesie. Die Sedierungstiefe sollte anhand des klinischen
        Ziels, z.&nbsp;B. RASS, Schmerzscore, Atemantrieb und Hämodynamik, regelmäßig überprüft
        werden. Die angegebenen Bereiche sind Orientierungswerte und ersetzen nicht Hausstandard,
        Fachinformation oder ärztliche Anordnung.
      </p>
    </div>
  )
}

export function PerfusorRateCalculator({ config, onRemove, onDuplicate }: CalculatorBlockProps) {
  const initialId = (config?.medicationId as string | undefined) ?? PERFUSOR_MEDICATIONS[0].id
  const initialMedication = getPerfusorMedicationById(initialId)
  const [medicationId, setMedicationId] = useState(initialId)
  const [infoOpen, setInfoOpen] = useState(false)
  const [doseInput, setDoseInput] = useState(String(initialMedication.defaultDose))
  const [weightInput, setWeightInput] = useState('')
  const [amountInput, setAmountInput] = useState(String(initialMedication.defaultAmount))
  const [volumeInput, setVolumeInput] = useState(String(initialMedication.defaultVolume))

  const med = useMemo(() => getPerfusorMedicationById(medicationId), [medicationId])

  const handleMedicationChange = (id: string) => {
    setMedicationId(id)
    setInfoOpen(false)
    const next = getPerfusorMedicationById(id)
    setDoseInput(String(next.defaultDose))
    setAmountInput(String(next.defaultAmount))
    setVolumeInput(String(next.defaultVolume))
    setWeightInput('')
  }

  const dose = useMemo(() => parseDecimal(doseInput), [doseInput])
  const weight = useMemo(() => parseDecimal(weightInput), [weightInput])
  const amount = useMemo(() => parseDecimal(amountInput), [amountInput])
  const volume = useMemo(() => parseDecimal(volumeInput), [volumeInput])

  const result = useMemo(() => {
    if (dose == null || weight == null || amount == null || volume == null) return null
    const concentration = amount / volume // µg/ml
    if (concentration <= 0) return null

    if (med.isPerMin) {
      // Remifentanil: doseUnit = µg/kg/min
      const dosePerMinTotal = weight * dose          // µg/min
      const dosePerHourTotal = dosePerMinTotal * 60  // µg/h
      const rate = dosePerHourTotal / concentration  // ml/h
      return {
        dosePerHour: dosePerHourTotal,
        dosePerMin: dosePerMinTotal,
        concentration,
        rate,
        isPerMin: true as const,
      }
    } else {
      const dosePerHour = weight * dose
      const rate = dosePerHour / concentration
      return { dosePerHour, concentration, rate, isPerMin: false as const }
    }
  }, [dose, weight, amount, volume, med.isPerMin])

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-card)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Perfusor-Laufrate
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

      {/* Medication selector + info button */}
      <div className="mb-3">
        <label className="mb-1 block text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Medikament
        </label>
        <div className="flex items-center gap-2">
          <select
            value={medicationId}
            onChange={(e) => handleMedicationChange(e.target.value)}
            className="h-9 flex-1 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          >
            {PERFUSOR_MEDICATIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm transition-colors hover:bg-[var(--color-border)]"
            style={{
              borderColor: 'var(--color-border)',
              color: infoOpen ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
            title="Informationen zum Medikament"
            aria-expanded={infoOpen}
          >
            ⓘ
          </button>
        </div>

        {infoOpen && (
          <div
            className="mt-2 rounded-lg border p-3 text-xs"
            style={sectionStyle}
          >
            <p className="mb-1.5 font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {med.name}
            </p>
            <p className="mb-1">
              <span className="font-medium">Dosisbereich: </span>
              {med.commonDoseRange}
            </p>
            <p className="mt-1.5 border-t pt-1.5" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-medium">Formel: </span>
              {med.formulaLabel}
            </p>

            {med.clinicalInfo != null && (
              <ClinicalInfoPanel info={med.clinicalInfo} name={med.name} />
            )}
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Dosierung ({med.doseUnit})
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={doseInput}
            onChange={(e) => setDoseInput(e.target.value)}
            className="h-9 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Gewicht (kg)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="z. B. 80"
            className="h-9 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Wirkstoffmenge ({med.amountUnit})
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="h-9 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Spritzenvolumen ({med.volumeUnit})
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={volumeInput}
            onChange={(e) => setVolumeInput(e.target.value)}
            className="h-9 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none"
            style={inputStyle}
          />
        </label>
      </div>

      {/* Result */}
      {result != null && (
        <div
          className="mt-3 rounded-lg border p-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)' }}
        >
          {/* Concentration badge */}
          <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Konzentration:
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {deFormat(result.concentration, 2)} µg/ml
            </span>
          </div>

          {/* Remifentanil: show both µg/kg/min and µg/kg/h */}
          {result.isPerMin && (
            <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Gesamtdosis:
              </span>
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {deFormat(result.dosePerMin, 2)} µg/min
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                = {deFormat(result.dosePerHour, 1)} µg/h
              </span>
            </div>
          )}

          <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Laufrate:
            </span>
            <span className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
              {deFormat(result.rate, 2)} ml/h
            </span>
          </div>

          {/* Rechenweg */}
          <div className="space-y-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <p className="font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Rechenweg
            </p>
            {result.isPerMin ? (
              <>
                <p>
                  Gesamtdosis/min = {weightInput} kg × {doseInput} µg/kg/min ={' '}
                  <strong style={{ color: 'var(--color-text-secondary)' }}>
                    {deFormat(result.dosePerMin, 2)} µg/min
                  </strong>
                </p>
                <p>
                  Gesamtdosis/h = {deFormat(result.dosePerMin, 2)} µg/min × 60 ={' '}
                  <strong style={{ color: 'var(--color-text-secondary)' }}>
                    {deFormat(result.dosePerHour, 1)} µg/h
                  </strong>
                </p>
              </>
            ) : (
              <p>
                Bedarf/h = {weightInput} kg × {doseInput} {med.doseUnit} ={' '}
                <strong style={{ color: 'var(--color-text-secondary)' }}>
                  {deFormat(result.dosePerHour, 2)} µg/h
                </strong>
              </p>
            )}
            <p>
              Konzentration = {amountInput} µg / {volumeInput} ml ={' '}
              <strong style={{ color: 'var(--color-text-secondary)' }}>
                {deFormat(result.concentration, 2)} µg/ml
              </strong>
            </p>
            <p>
              Laufrate = {deFormat(result.dosePerHour, result.isPerMin ? 1 : 2)} µg/h /{' '}
              {deFormat(result.concentration, 2)} µg/ml ={' '}
              <strong style={{ color: 'var(--color-accent)' }}>{deFormat(result.rate, 2)} ml/h</strong>
            </p>
          </div>
        </div>
      )}

      {weight == null && weightInput !== '' && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Ungültiger Wert für Gewicht.
        </p>
      )}

      {/* Safety note */}
      <p
        className="mt-3 border-t pt-2 text-xs"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        Dieses Tool berechnet ausschließlich die Perfusor-Laufrate anhand der eingegebenen Werte. Es
        ersetzt keine ärztliche Anordnung, lokale SOP oder klinische Plausibilitätsprüfung.
      </p>
    </div>
  )
}
