/**
 * Isofluran ICU Sedierungs-Rechner (PRO V4) – Core Engine
 * Rechenlogik 1:1 aus Spezifikation; Guards/Clamps nur zur Vermeidung von NaN.
 * Clinical Mode v1: flags, summary, ranges; Explain: formulas, sources, assumptions.
 */

export type IsoInput = {
  weightKg: number
  age: number
  temperatureC: number
  rass?: number | null
  targetMAC?: number | null
  opioidMlPerH: number
  opioidUgPerMl: number
  midaMlPerH: number
  midaMgPerMl: number
  propMlPerH: number
  propMgPerMl: number
  dexMlPerH: number
  dexUgPerMl: number
  alcoholFactor: number
  alcoholMode?: 'none' | 'chronic' | 'acute'
  minuteVolumeLMin: number
}

export type ClinicalFlag = { level: 'ok' | 'warn' | 'danger'; title: string; detail?: string }
export type ExplainItem = { label: string; formula: string; values: Record<string, number | string>; result: number | string }
export type SourceItem = { topic: string; citation: string }

export type IsoResult = {
  macAgeAdjusted: number
  macEffective: number
  fetIso: number
  isoConsumptionMlH: number
  debug: Record<string, number>
  clinical: {
    flags: ClinicalFlag[]
    summary: string
    ranges: Record<string, 'ok' | 'warn' | 'danger'>
  }
  explain: {
    formulas: ExplainItem[]
    sources: SourceItem[]
    assumptions: string[]
  }
}

/** Clamps für sichere Berechnung (Warnung im UI, kein hartes Blockieren). */
const CLAMP = {
  weightKg: { min: 20, max: 250 },
  age: { min: 16, max: 100 },
  temperatureC: { min: 32, max: 41 },
  minuteVolumeLMin: { min: 2, max: 30 },
  alcoholFactor: { min: 0.5, max: 1.5 },
} as const

const EXPLAIN_SOURCES: SourceItem[] = [
  { topic: 'Age-adjusted MAC', citation: 'Nickalls & Mapleson. Br J Anaesth. 2003.' },
  { topic: 'Temperature effect', citation: 'Eger EI II. In: Miller\'s Anesthesia. (~5% MAC per °C).' },
  { topic: 'Opioid MAC reduction', citation: 'Katoh et al. 1999; Manyam et al. 2006.' },
  { topic: 'Adjunct sedatives', citation: 'Miller\'s Anesthesia; Barash.' },
]

const EXPLAIN_ASSUMPTIONS = [
  'Heuristische Verbrauchskonstante "3" (als Annahme markieren).',
  'Stufungsmodelle (Opioid/Benzo/Prop/Dex) sind modellhaft.',
]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function calculateIso(input: IsoInput): IsoResult {
  const MAC40 = 1.15

  const weightKg = input.weightKg <= 0
    ? CLAMP.weightKg.min
    : clamp(input.weightKg, CLAMP.weightKg.min, CLAMP.weightKg.max)
  const age = clamp(input.age, CLAMP.age.min, CLAMP.age.max)
  const temperatureC = clamp(input.temperatureC, CLAMP.temperatureC.min, CLAMP.temperatureC.max)
  const minuteVolumeLMin = input.minuteVolumeLMin <= 0
    ? CLAMP.minuteVolumeLMin.min
    : clamp(input.minuteVolumeLMin, CLAMP.minuteVolumeLMin.min, CLAMP.minuteVolumeLMin.max)
  const alcoholFactor = clamp(input.alcoholFactor, CLAMP.alcoholFactor.min, CLAMP.alcoholFactor.max)

  const macAge = MAC40 * (1 - 0.06 * ((age - 40) / 10))

  const tempFactor = 1 - 0.05 * (37 - temperatureC)

  function rassToMac(rass: number): number {
    if (rass >= 0) return 0.2
    if (rass === -1) return 0.3
    if (rass === -2) return 0.35
    if (rass === -3) return 0.5
    if (rass === -4) return 0.7
    return 0.9
  }

  const targetMACOverride = input.targetMAC != null && Number.isFinite(input.targetMAC)
  const sedationTarget =
    targetMACOverride
      ? input.targetMAC!
      : (input.rass !== undefined && input.rass !== null && Number.isFinite(input.rass)
          ? rassToMac(input.rass)
          : 0.5)

  const opioidUgKgMin =
    weightKg > 0 && (input.opioidMlPerH * input.opioidUgPerMl) >= 0
      ? (input.opioidMlPerH * input.opioidUgPerMl) / (weightKg * 60)
      : 0

  let opioidFactor = 1
  if (opioidUgKgMin > 0) {
    if (opioidUgKgMin < 0.05) opioidFactor = 0.85
    else if (opioidUgKgMin < 0.15) opioidFactor = 0.65
    else opioidFactor = 0.5
  }

  const midaMgKgH =
    weightKg > 0 && input.midaMlPerH >= 0 && input.midaMgPerMl >= 0
      ? (input.midaMlPerH * input.midaMgPerMl) / weightKg
      : 0

  let midaFactor = 1
  if (midaMgKgH > 0) {
    if (midaMgKgH < 0.03) midaFactor = 0.9
    else if (midaMgKgH < 0.06) midaFactor = 0.75
    else midaFactor = 0.7
  }

  const propMgKgH =
    weightKg > 0 && input.propMlPerH >= 0 && input.propMgPerMl >= 0
      ? (input.propMlPerH * input.propMgPerMl) / weightKg
      : 0

  let propFactor = 1
  if (propMgKgH > 0) {
    if (propMgKgH < 1) propFactor = 0.85
    else if (propMgKgH < 2) propFactor = 0.7
    else propFactor = 0.5
  }

  const dexUgKgH =
    weightKg > 0 && input.dexMlPerH >= 0 && input.dexUgPerMl >= 0
      ? (input.dexMlPerH * input.dexUgPerMl) / weightKg
      : 0

  let dexFactor = 1
  if (dexUgKgH > 0) {
    if (dexUgKgH < 0.4) dexFactor = 0.8
    else if (dexUgKgH < 0.8) dexFactor = 0.65
    else dexFactor = 0.5
  }

  const macEffective =
    macAge *
    opioidFactor *
    midaFactor *
    propFactor *
    dexFactor *
    alcoholFactor *
    tempFactor

  const fetIso = macEffective * sedationTarget

  const isoConsumptionMlH =
    (fetIso / 100) * minuteVolumeLMin * 60 * 3

  // —— Clinical Mode: flags, summary, ranges ——
  const flags: ClinicalFlag[] = []
  const ranges: Record<string, 'ok' | 'warn' | 'danger'> = { mv: 'ok', temp: 'ok', fet: 'ok', mac: 'ok' }

  if (minuteVolumeLMin > 16) {
    ranges.mv = 'danger'
    flags.push({ level: 'danger', title: 'Sehr hohes Minutenvolumen', detail: 'Verbrauch steigt stark' })
  } else if (minuteVolumeLMin > 12) {
    ranges.mv = 'warn'
    flags.push({ level: 'warn', title: 'Hohes Minutenvolumen', detail: 'Verbrauch steigt' })
  }

  if (temperatureC < 34) {
    ranges.temp = 'danger'
    flags.push({ level: 'danger', title: 'Ausgeprägte Hypothermie – MAC deutlich reduziert' })
  } else if (temperatureC < 36) {
    ranges.temp = 'warn'
    flags.push({ level: 'warn', title: 'Hypothermie senkt MAC' })
  }

  if (age > 75) {
    flags.push({ level: 'warn', title: 'Alter reduziert MAC deutlich' })
  }

  if (fetIso < 0.3) {
    ranges.fet = 'warn'
    flags.push({ level: 'warn', title: 'Sehr niedrige Fet – Sedierung evtl. zu flach' })
  } else if (fetIso > 1.2) {
    ranges.fet = 'warn'
    flags.push({ level: 'warn', title: 'Hohe Fet – prüfen, ob Ziel sinnvoll ist' })
  }

  if (targetMACOverride) {
    flags.push({ level: 'ok', title: 'TargetMAC Override aktiv' })
  }

  const alcoholMode = input.alcoholMode ?? 'none'
  if (alcoholMode === 'chronic') {
    flags.push({ level: 'ok', title: 'Chronischer Alkohol: Sedierungsbedarf kann erhöht sein' })
  } else if (alcoholMode === 'acute') {
    flags.push({ level: 'warn', title: 'Akute Intoxikation: Sedierungsbedarf kann reduziert sein' })
  }

  if (opioidFactor <= 0.65 || propFactor <= 0.7) {
    flags.push({ level: 'ok', title: 'Ko-Sedierung reduziert MAC' })
  }

  const summary = `Ziel-Fet: ${fetIso.toFixed(2)}% • Verbrauch: ${isoConsumptionMlH.toFixed(1)} ml/h • MV: ${minuteVolumeLMin} L/min`

  // —— Explain: formulas, sources, assumptions ——
  const alcoholExplainResult: number | string = alcoholMode !== 'none' ? `${alcoholFactor} (Modus: ${alcoholMode})` : alcoholFactor
  const formulas: ExplainItem[] = [
    { label: 'Age MAC', formula: 'MAC_age = MAC40 * (1 - 0.06 * ((age-40)/10))', values: { MAC40, age }, result: macAge },
    { label: 'Temp factor', formula: 'tempFactor = 1 - 0.05 * (37 - T)', values: { T: temperatureC }, result: tempFactor },
    { label: 'Sedation target', formula: 'RASS→MAC or targetMAC override', values: { sedationTarget }, result: sedationTarget },
    { label: 'Opioid', formula: 'µg/kg/min → factor', values: { opioidUgKgMin, opioidFactor }, result: opioidFactor },
    { label: 'Mida', formula: 'mg/kg/h → factor', values: { midaMgKgH, midaFactor }, result: midaFactor },
    { label: 'Prop', formula: 'mg/kg/h → factor', values: { propMgKgH, propFactor }, result: propFactor },
    { label: 'Dex', formula: 'µg/kg/h → factor', values: { dexUgKgH, dexFactor }, result: dexFactor },
    { label: 'Alkohol-Faktor', formula: 'alcoholFactor (Modus)', values: { factor: alcoholFactor, modus: alcoholMode }, result: alcoholExplainResult },
    { label: 'MAC effective', formula: 'MAC_age × opioidF × midaF × propF × dexF × alcoholF × tempF', values: { macAge, opioidFactor, midaFactor, propFactor, dexFactor, alcoholFactor, tempFactor }, result: macEffective },
    { label: 'FetIso', formula: 'FetIso = MAC_effective * sedationTarget', values: { macEffective, sedationTarget }, result: fetIso },
    { label: 'Consumption', formula: 'Consumption = (FetIso/100) * MV * 60 * 3', values: { fetIso, MV: minuteVolumeLMin }, result: isoConsumptionMlH },
  ]

  return {
    macAgeAdjusted: macAge,
    macEffective,
    fetIso,
    isoConsumptionMlH,
    debug: {
      opioidUgKgMin,
      midaMgKgH,
      propMgKgH,
      dexUgKgH,
      tempFactor,
      opioidFactor,
      midaFactor,
      propFactor,
      dexFactor,
    },
    clinical: { flags, summary, ranges },
    explain: { formulas, sources: EXPLAIN_SOURCES, assumptions: EXPLAIN_ASSUMPTIONS },
  }
}
