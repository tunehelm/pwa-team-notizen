import { useState, useMemo, useCallback, useEffect } from 'react'
import type { CalculatorBlockProps } from './registry'
import { calculateIso, type IsoInput, type IsoResult } from '../../lib/iso/calculateIso'

const deFormat = (n: number, decimals: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const DEFAULT_LABEL = 'Isofluran ICU Rechner (PRO V4)'

const DEFAULT_INPUT: IsoInput = {
  weightKg: 80,
  age: 60,
  temperatureC: 37,
  rass: -3,
  targetMAC: undefined,
  opioidMlPerH: 0,
  opioidUgPerMl: 0,
  midaMlPerH: 0,
  midaMgPerMl: 0,
  propMlPerH: 0,
  propMgPerMl: 0,
  dexMlPerH: 0,
  dexUgPerMl: 0,
  alcoholFactor: 1,
  minuteVolumeLMin: 8,
}

const RASS_OPTIONS = [0, -1, -2, -3, -4, -5]

const MODEL_NOTE = 'Dieses Modell ist eine strukturierte Näherung und keine pharmakodynamische Simulation.'

export type IsoSedationBlockState = {
  version: 1
  label?: string
  defaultClinicalOn?: boolean
  input: IsoInput
  rassValue: number
  macOverride: number | null
}

function parseNum(s: string, fallback: number): number {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

const inputStyle = {
  borderColor: 'var(--color-border)',
  backgroundColor: 'var(--color-bg-app)',
  color: 'var(--color-text-primary)',
} as const

export function IsofluraneSedationCalculator({ config, onRemove, onDuplicate, onUpdateConfig }: CalculatorBlockProps) {
  const c = (config ?? {}) as Partial<IsoSedationBlockState>
  const savedInput = (c.input ?? {}) as Partial<IsoInput>
  const savedRass = typeof c.rassValue === 'number' ? c.rassValue : -3
  const savedMacOverride = c.macOverride != null && Number.isFinite(c.macOverride) ? c.macOverride : null
  const label = (c.label as string) ?? DEFAULT_LABEL

  const [weightStr, setWeightStr] = useState(String(savedInput.weightKg ?? DEFAULT_INPUT.weightKg))
  const [ageStr, setAgeStr] = useState(String(savedInput.age ?? DEFAULT_INPUT.age))
  const [tempStr, setTempStr] = useState(String(savedInput.temperatureC ?? DEFAULT_INPUT.temperatureC))
  const [mvStr, setMvStr] = useState(String(savedInput.minuteVolumeLMin ?? DEFAULT_INPUT.minuteVolumeLMin))
  const [alcoholStr, setAlcoholStr] = useState(String(savedInput.alcoholFactor ?? DEFAULT_INPUT.alcoholFactor))
  const [rassValue, setRassValue] = useState(savedRass)
  const [macOverrideStr, setMacOverrideStr] = useState(savedMacOverride != null ? String(savedMacOverride) : '')
  const [opioidMlStr, setOpioidMlStr] = useState(String(savedInput.opioidMlPerH ?? 0))
  const [opioidUgStr, setOpioidUgStr] = useState(String(savedInput.opioidUgPerMl ?? 0))
  const [midaMlStr, setMidaMlStr] = useState(String(savedInput.midaMlPerH ?? 0))
  const [midaMgStr, setMidaMgStr] = useState(String(savedInput.midaMgPerMl ?? 0))
  const [propMlStr, setPropMlStr] = useState(String(savedInput.propMlPerH ?? 0))
  const [propMgStr, setPropMgStr] = useState(String(savedInput.propMgPerMl ?? 0))
  const [dexMlStr, setDexMlStr] = useState(String(savedInput.dexMlPerH ?? 0))
  const [dexUgStr, setDexUgStr] = useState(String(savedInput.dexUgPerMl ?? 0))
  const [showDebug, setShowDebug] = useState(false)
  const defaultClinical = c.defaultClinicalOn !== false
  const [clinicalMode, setClinicalMode] = useState(defaultClinical)
  const [showFormulasSources, setShowFormulasSources] = useState(false)

  const input: IsoInput = useMemo(() => ({
    weightKg: parseNum(weightStr, DEFAULT_INPUT.weightKg),
    age: parseNum(ageStr, DEFAULT_INPUT.age),
    temperatureC: parseNum(tempStr, DEFAULT_INPUT.temperatureC),
    rass: rassValue,
    targetMAC: macOverrideStr.trim() !== '' ? parseNum(macOverrideStr, 0.5) : undefined,
    opioidMlPerH: parseNum(opioidMlStr, 0),
    opioidUgPerMl: parseNum(opioidUgStr, 0),
    midaMlPerH: parseNum(midaMlStr, 0),
    midaMgPerMl: parseNum(midaMgStr, 0),
    propMlPerH: parseNum(propMlStr, 0),
    propMgPerMl: parseNum(propMgStr, 0),
    dexMlPerH: parseNum(dexMlStr, 0),
    dexUgPerMl: parseNum(dexUgStr, 0),
    alcoholFactor: parseNum(alcoholStr, 1),
    minuteVolumeLMin: parseNum(mvStr, DEFAULT_INPUT.minuteVolumeLMin),
  }), [weightStr, ageStr, tempStr, rassValue, macOverrideStr, opioidMlStr, opioidUgStr, midaMlStr, midaMgStr, propMlStr, propMgStr, dexMlStr, dexUgStr, alcoholStr, mvStr])

  const result: IsoResult | null = useMemo(() => {
    if (input.weightKg <= 0 || input.minuteVolumeLMin <= 0) return null
    return calculateIso(input)
  }, [input])

  useEffect(() => {
    const payload: IsoSedationBlockState = {
      version: 1,
      label,
      input: {
        weightKg: parseNum(weightStr, DEFAULT_INPUT.weightKg),
        age: parseNum(ageStr, DEFAULT_INPUT.age),
        temperatureC: parseNum(tempStr, DEFAULT_INPUT.temperatureC),
        rass: rassValue,
        targetMAC: macOverrideStr.trim() !== '' ? parseNum(macOverrideStr, 0.5) : undefined,
        opioidMlPerH: parseNum(opioidMlStr, 0),
        opioidUgPerMl: parseNum(opioidUgStr, 0),
        midaMlPerH: parseNum(midaMlStr, 0),
        midaMgPerMl: parseNum(midaMgStr, 0),
        propMlPerH: parseNum(propMlStr, 0),
        propMgPerMl: parseNum(propMgStr, 0),
        dexMlPerH: parseNum(dexMlStr, 0),
        dexUgPerMl: parseNum(dexUgStr, 0),
        alcoholFactor: parseNum(alcoholStr, 1),
        minuteVolumeLMin: parseNum(mvStr, DEFAULT_INPUT.minuteVolumeLMin),
      },
      rassValue,
      macOverride: macOverrideStr.trim() !== '' ? parseNum(macOverrideStr, 0.5) : null,
    }
    onUpdateConfig?.(payload)
  }, [onUpdateConfig, label, weightStr, ageStr, tempStr, mvStr, alcoholStr, rassValue, macOverrideStr, opioidMlStr, opioidUgStr, midaMlStr, midaMgStr, propMlStr, propMgStr, dexMlStr, dexUgStr])

  const handleReset = useCallback(() => {
    setWeightStr(String(DEFAULT_INPUT.weightKg))
    setAgeStr(String(DEFAULT_INPUT.age))
    setTempStr(String(DEFAULT_INPUT.temperatureC))
    setMvStr(String(DEFAULT_INPUT.minuteVolumeLMin))
    setAlcoholStr(String(DEFAULT_INPUT.alcoholFactor))
    setRassValue(-3)
    setMacOverrideStr('')
    setOpioidMlStr('0')
    setOpioidUgStr('0')
    setMidaMlStr('0')
    setMidaMgStr('0')
    setPropMlStr('0')
    setPropMgStr('0')
    setDexMlStr('0')
    setDexUgStr('0')
  }, [])

  const copyResult = useCallback(() => {
    if (!result) return
    const lines = [
      `${label}`,
      `MAC alterskorrigiert: ${deFormat(result.macAgeAdjusted, 3)}`,
      `MAC effektiv: ${deFormat(result.macEffective, 3)}`,
      `Fet Isofluran: ${deFormat(result.fetIso, 3)} Vol%`,
      `Isofluranverbrauch (grob): ${deFormat(result.isoConsumptionMlH, 2)} ml/h`,
    ]
    void navigator.clipboard.writeText(lines.join('\n'))
  }, [result, label])

  const warnWeight = input.weightKg > 0 && (input.weightKg < 20 || input.weightKg > 250)
  const warnAge = input.age < 16 || input.age > 100
  const warnTemp = input.temperatureC < 32 || input.temperatureC > 41
  const warnMv = input.minuteVolumeLMin > 0 && (input.minuteVolumeLMin < 2 || input.minuteVolumeLMin > 30)
  const warnAlcohol = input.alcoholFactor < 0.5 || input.alcoholFactor > 1.5

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
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</div>
          <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>PRO V4 · Sedierung</div>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gewicht (kg)</span>
            <div className="flex items-center gap-1">
              <input type="text" inputMode="decimal" value={weightStr} onChange={(e) => setWeightStr(e.target.value)} className="h-9 w-20 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
              {[60, 80, 100].map((w) => (
                <button key={w} type="button" onClick={() => setWeightStr(String(w))} className="rounded border px-1.5 py-0.5 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{w}</button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Alter (Jahre)</span>
            <input type="text" inputMode="decimal" value={ageStr} onChange={(e) => setAgeStr(e.target.value)} className="h-9 w-16 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Temp (°C)</span>
            <input type="text" inputMode="decimal" value={tempStr} onChange={(e) => setTempStr(e.target.value)} className="h-9 w-14 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>MV (L/min)</span>
            <div className="flex items-center gap-1">
              <input type="text" inputMode="decimal" value={mvStr} onChange={(e) => setMvStr(e.target.value)} className="h-9 w-16 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
              {[6, 8, 10].map((mv) => (
                <button key={mv} type="button" onClick={() => setMvStr(String(mv))} className="rounded border px-1.5 py-0.5 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{mv}</button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Alkohol-Faktor</span>
            <div className="flex items-center gap-1">
              <input type="text" inputMode="decimal" value={alcoholStr} onChange={(e) => setAlcoholStr(e.target.value)} className="h-9 w-14 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
              <button type="button" onClick={() => setAlcoholStr('1')} className="rounded border px-1.5 py-0.5 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>1,0</button>
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>RASS (Ziel)</span>
            <div className="flex flex-wrap gap-1">
              {RASS_OPTIONS.map((r) => (
                <button key={r} type="button" onClick={() => setRassValue(r)} className={`rounded border px-2 py-1 text-xs ${rassValue === r ? 'border-blue-500 bg-blue-500/20' : ''}`} style={rassValue === r ? {} : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{r}</button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>MAC Override (optional)</span>
            <input type="text" inputMode="decimal" value={macOverrideStr} onChange={(e) => setMacOverrideStr(e.target.value)} placeholder="—" className="h-9 w-20 rounded-lg border px-2 text-sm focus:border-blue-500 focus:outline-none" style={inputStyle} />
          </label>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Opioid</span>
          <div className="flex items-center gap-1">
            <input type="text" inputMode="decimal" value={opioidMlStr} onChange={(e) => setOpioidMlStr(e.target.value)} placeholder="ml/h" className="h-8 w-14 rounded border px-1.5 text-xs focus:outline-none" style={inputStyle} />
            <input type="text" inputMode="decimal" value={opioidUgStr} onChange={(e) => setOpioidUgStr(e.target.value)} placeholder="µg/ml" className="h-8 w-14 rounded border px-1.5 text-xs focus:outline-none" style={inputStyle} />
          </div>
        </div>
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Midazolam</span>
          <div className="flex items-center gap-1">
            <input type="text" inputMode="decimal" value={midaMlStr} onChange={(e) => setMidaMlStr(e.target.value)} placeholder="ml/h" className="h-8 w-14 rounded border px-1.5 text-xs focus:outline-none" style={inputStyle} />
            <input type="text" inputMode="decimal" value={midaMgStr} onChange={(e) => setMidaMgStr(e.target.value)} placeholder="mg/ml" className="h-8 w-14 rounded border px-1.5 text-xs focus:outline-none" style={inputStyle} />
          </div>
        </div>
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Propofol</span>
          <div className="flex items-center gap-1">
            <input type="text" inputMode="decimal" value={propMlStr} onChange={(e) => setPropMlStr(e.target.value)} placeholder="ml/h" className="h-8 w-14 rounded border px-1.5 text-xs focus:outline-none" style={inputStyle} />
            <input type="text" inputMode="decimal" value={propMgStr} onChange={(e) => setPropMgStr(e.target.value)} placeholder="mg/ml" className="h-8 w-14 rounded border px-1.5 text-xs focus:outline-none" style={inputStyle} />
          </div>
        </div>
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Dex</span>
          <div className="flex items-center gap-1">
            <input type="text" inputMode="decimal" value={dexMlStr} onChange={(e) => setDexMlStr(e.target.value)} placeholder="ml/h" className="h-8 w-14 rounded border px-1.5 text-xs focus:outline-none" style={inputStyle} />
            <input type="text" inputMode="decimal" value={dexUgStr} onChange={(e) => setDexUgStr(e.target.value)} placeholder="µg/ml" className="h-8 w-14 rounded border px-1.5 text-xs focus:outline-none" style={inputStyle} />
          </div>
        </div>
      </div>

      {(warnWeight || warnAge || warnTemp || warnMv || warnAlcohol) && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Hinweis: Werte außerhalb typischer Bereiche (kg 20–250, Alter 16–100, Temp 32–41 °C, MV 2–30 L/min, Alkohol 0,5–1,5).
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={handleReset} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>Reset</button>
        {result != null && (
          <button type="button" onClick={copyResult} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>Ergebnis kopieren</button>
        )}
        <button type="button" onClick={() => setClinicalMode((c) => !c)} className={`rounded-lg border px-2 py-1 text-xs ${clinicalMode ? 'border-green-500/50 bg-green-500/10' : ''}`} style={!clinicalMode ? { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' } : {}}>Clinical Mode {clinicalMode ? 'ON' : 'OFF'}</button>
        <button type="button" onClick={() => setShowFormulasSources((s) => !s)} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>Formeln & Quellen {showFormulasSources ? '▼' : '▶'}</button>
        <button type="button" onClick={() => setShowDebug((d) => !d)} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{showDebug ? 'Details ausblenden' : 'Details anzeigen'}</button>
      </div>

      {result != null ? (
        <>
          {clinicalMode && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{result.clinical.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                {(['mv', 'temp', 'fet'] as const).map((k) => {
                  const r = result.clinical.ranges[k]
                  const label = k === 'mv' ? 'MV' : k === 'temp' ? 'Temp' : 'Fet'
                  return (
                    <span key={k} className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: r === 'danger' ? 'rgba(239,68,68,0.2)' : r === 'warn' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.15)', color: r === 'danger' ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>{label}: {r}</span>
                  )
                })}
              </div>
              {result.clinical.flags.slice(0, 3).map((f, i) => (
                <p key={i} className="text-xs" style={{ color: f.level === 'danger' ? 'var(--color-accent)' : f.level === 'warn' ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>{f.title}{f.detail ? ` – ${f.detail}` : ''}</p>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            {clinicalMode && (
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>MAC alterskorrigiert</div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{deFormat(result.macAgeAdjusted, 3)}</div>
              </div>
            )}
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>MAC effektiv</div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{deFormat(result.macEffective, 3)}</div>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Fet Isofluran (Vol%)</div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{deFormat(result.fetIso, 3)}</div>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Isofluranverbrauch (ml/h, grob)</div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{deFormat(result.isoConsumptionMlH, 2)}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>—</div>
      )}

      {showDebug && result != null && (
        <div className="mt-3 rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <div className="font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Dosen / Faktoren</div>
          <ul className="list-inside space-y-0.5">
            <li>Opioid: {deFormat(result.debug.opioidUgKgMin, 3)} µg/kg/min · Faktor {deFormat(result.debug.opioidFactor, 2)}</li>
            <li>Mida: {deFormat(result.debug.midaMgKgH, 3)} mg/kg/h · Faktor {deFormat(result.debug.midaFactor, 2)}</li>
            <li>Prop: {deFormat(result.debug.propMgKgH, 3)} mg/kg/h · Faktor {deFormat(result.debug.propFactor, 2)}</li>
            <li>Dex: {deFormat(result.debug.dexUgKgH, 3)} µg/kg/h · Faktor {deFormat(result.debug.dexFactor, 2)}</li>
            <li>Temp-Faktor: {deFormat(result.debug.tempFactor, 3)}</li>
          </ul>
        </div>
      )}

      {showFormulasSources && result != null && (
        <div className="mt-3 rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
          <div className="font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Formeln</div>
          <ul className="space-y-1.5">
            {result.explain.formulas.map((item, i) => (
              <li key={i}>
                <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>{item.label}:</span> {item.formula}
                <div className="mt-0.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {Object.entries(item.values).map(([k, v]) => `${k}=${typeof v === 'number' ? deFormat(v, 3) : v}`).join(' · ')} → {typeof item.result === 'number' ? deFormat(item.result, 3) : item.result}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Quellen</div>
          <ul className="list-inside list-disc space-y-0.5 mt-0.5">
            {result.explain.sources.map((s, i) => (
              <li key={i}><span style={{ color: 'var(--color-text-muted)' }}>{s.topic}:</span> {s.citation}</li>
            ))}
          </ul>
          <p className="mt-2 border-t pt-2" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{MODEL_NOTE}</p>
          <ul className="list-inside list-disc space-y-0.5 mt-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {result.explain.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
