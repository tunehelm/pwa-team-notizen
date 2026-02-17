import { describe, it, expect } from 'vitest'
import { calculateIso, type IsoInput } from './calculateIso'

const baselineInput: IsoInput = {
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

describe('calculateIso', () => {
  describe('1) Baseline ohne Meds', () => {
    it('returns finite values and correct debug', () => {
      const r = calculateIso(baselineInput)
      expect(Number.isFinite(r.macAgeAdjusted)).toBe(true)
      expect(r.macAgeAdjusted).toBeGreaterThan(0)
      expect(Number.isFinite(r.macEffective)).toBe(true)
      expect(r.macEffective).toBeGreaterThan(0)
      expect(Number.isFinite(r.fetIso)).toBe(true)
      expect(r.fetIso).toBeGreaterThan(0)
      expect(Number.isFinite(r.isoConsumptionMlH)).toBe(true)
      expect(r.isoConsumptionMlH).toBeGreaterThanOrEqual(0)
      expect(r.debug.opioidUgKgMin).toBe(0)
      expect(r.debug.tempFactor).toBe(1)
    })

    it('macAgeAdjusted = 1.15 * (1 - 0.06*((60-40)/10)) = 1.012', () => {
      const r = calculateIso(baselineInput)
      // macAge = 1.15 * (1 - 0.12) = 1.012
      expect(r.macAgeAdjusted).toBeCloseTo(1.012, 3)
    })

    it('fetIso = macEffective * 0.5 (RASS -3) ≈ 0.506', () => {
      const r = calculateIso(baselineInput)
      // macEffective = macAge * tempFactor * ... = 1.012, sedationTarget = 0.5
      expect(r.fetIso).toBeCloseTo(0.506, 3)
    })

    it('isoConsumptionMlH = (fetIso/100)*8*60*3 ≈ 7.2864', () => {
      const r = calculateIso(baselineInput)
      // (0.506/100)*8*60*3 = 7.2864
      expect(r.isoConsumptionMlH).toBeCloseTo(7.2864, 4)
    })
  })

  describe('2) Opioid Schwellen-Faktor', () => {
    it('opioidUgKgMin > 0.15 → opioidFactor 0.5, macEffective reduced', () => {
      const input: IsoInput = {
        ...baselineInput,
        opioidMlPerH: 10,
        opioidUgPerMl: 100,
      }
      // opioidUgKgMin = (10*100)/(80*60) = 1000/4800 ≈ 0.2083
      const r = calculateIso(input)
      expect(r.debug.opioidUgKgMin).toBeCloseTo(1000 / (80 * 60), 3)
      expect(r.debug.opioidFactor).toBe(0.5)

      const baseline = calculateIso(baselineInput)
      expect(r.macEffective).toBeLessThan(baseline.macEffective)
      expect(r.fetIso).toBeLessThan(baseline.fetIso)
    })
  })

  describe('3) targetMAC Override', () => {
    it('targetMAC = 0.8 overrides RASS → fetIso = macEffective * 0.8', () => {
      const input: IsoInput = {
        ...baselineInput,
        targetMAC: 0.8,
        rass: -3, // would be 0.5 if not overridden
      }
      const r = calculateIso(input)
      // macEffective ≈ 1.012 (baseline), fetIso = 1.012 * 0.8 = 0.8096
      expect(r.fetIso).toBeCloseTo(1.012 * 0.8, 3)
      expect(r.fetIso).toBeCloseTo(0.8096, 3)
    })
  })

  describe('4) Temperatur Effekt', () => {
    it('temperatureC = 35 → tempFactor = 0.9, macEffective reduced', () => {
      const input: IsoInput = {
        ...baselineInput,
        temperatureC: 35,
      }
      const r = calculateIso(input)
      // tempFactor = 1 - 0.05*(37-35) = 0.9
      expect(r.debug.tempFactor).toBeCloseTo(0.9, 5)
      expect(r.macEffective).toBeCloseTo(1.012 * 0.9, 3)
    })
  })

  describe('5) Midazolam/Propofol/Dex Schwellen', () => {
    it('Mida > 0.06 mg/kg/h → midaFactor 0.7', () => {
      // midaMgKgH = (ml/h * mg/ml) / kg > 0.06 → e.g. 80kg, 5 ml/h, 1 mg/ml = 5/80 = 0.0625
      const input: IsoInput = {
        ...baselineInput,
        midaMlPerH: 5,
        midaMgPerMl: 1,
      }
      const r = calculateIso(input)
      expect(r.debug.midaMgKgH).toBeCloseTo(5 / 80, 3)
      expect(r.debug.midaFactor).toBe(0.7)
      expect(r.macEffective).toBeLessThan(calculateIso(baselineInput).macEffective)
    })

    it('Prop > 2 mg/kg/h → propFactor 0.5', () => {
      // propMgKgH = (ml/h * mg/ml) / kg > 2 → e.g. 80kg, 200 ml/h, 1 mg/ml = 200/80 = 2.5
      const input: IsoInput = {
        ...baselineInput,
        propMlPerH: 200,
        propMgPerMl: 1,
      }
      const r = calculateIso(input)
      expect(r.debug.propMgKgH).toBeCloseTo(200 / 80, 3)
      expect(r.debug.propFactor).toBe(0.5)
      expect(r.macEffective).toBeLessThan(calculateIso(baselineInput).macEffective)
    })

    it('Dex > 0.8 µg/kg/h → dexFactor 0.5', () => {
      // dexUgKgH = (ml/h * µg/ml) / kg > 0.8 → e.g. 80kg, 1 ml/h, 70 µg/ml = 70/80 = 0.875
      const input: IsoInput = {
        ...baselineInput,
        dexMlPerH: 1,
        dexUgPerMl: 70,
      }
      const r = calculateIso(input)
      expect(r.debug.dexUgKgH).toBeCloseTo(70 / 80, 3)
      expect(r.debug.dexFactor).toBe(0.5)
      expect(r.macEffective).toBeLessThan(calculateIso(baselineInput).macEffective)
    })
  })

  describe('6) Robustheit / Guards', () => {
    it('weightKg = 0 does not throw, returns finite values (clamped to 20)', () => {
      const input: IsoInput = { ...baselineInput, weightKg: 0 }
      expect(() => calculateIso(input)).not.toThrow()
      const r = calculateIso(input)
      expect(Number.isFinite(r.macAgeAdjusted)).toBe(true)
      expect(Number.isFinite(r.macEffective)).toBe(true)
      expect(Number.isFinite(r.fetIso)).toBe(true)
      expect(Number.isFinite(r.isoConsumptionMlH)).toBe(true)
      expect(r.isoConsumptionMlH).toBeGreaterThanOrEqual(0)
    })

    it('minuteVolumeLMin = 0 does not throw (clamped)', () => {
      const input: IsoInput = { ...baselineInput, minuteVolumeLMin: 0 }
      expect(() => calculateIso(input)).not.toThrow()
      const r = calculateIso(input)
      expect(Number.isFinite(r.isoConsumptionMlH)).toBe(true)
    })
  })
})
