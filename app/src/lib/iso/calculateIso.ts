/**
 * Isofluran ICU Sedierungs-Rechner (PRO V4) – Core Engine
 * Rechenlogik 1:1 aus Spezifikation; Guards/Clamps nur zur Vermeidung von NaN.
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
  minuteVolumeLMin: number
}

export type IsoResult = {
  macAgeAdjusted: number
  macEffective: number
  fetIso: number
  isoConsumptionMlH: number
  debug: Record<string, number>
}

/** Clamps für sichere Berechnung (Warnung im UI, kein hartes Blockieren). */
const CLAMP = {
  weightKg: { min: 20, max: 250 },
  age: { min: 16, max: 100 },
  temperatureC: { min: 32, max: 41 },
  minuteVolumeLMin: { min: 2, max: 30 },
  alcoholFactor: { min: 0.5, max: 1.5 },
} as const

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

  const sedationTarget =
    input.targetMAC != null && Number.isFinite(input.targetMAC)
      ? input.targetMAC
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
  }
}
