import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { calculateIso, type IsoInput } from './calculateIso'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GOLDEN_PATH = path.join(__dirname, 'golden_iso_cases.tsv')

const DEFAULT_TOL = 1e-3
const TOL_CONSUMPTION = 1e-2

/** TSV Parser: Header in first line, rows split by newline, fields by tab. Empty -> null, numbers -> parseFloat. */
function parseTsv(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split('\t')
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t')
    const row: Record<string, string> = {}
    headers.forEach((h, j) => {
      row[h] = values[j] ?? ''
    })
    rows.push(row)
  }
  return { headers, rows }
}

function num(val: string): number | null {
  const s = val?.trim()
  if (s === '' || s === undefined) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function buildInputFromRow(row: Record<string, string>): IsoInput {
  const rassVal = num(row.rass)
  const targetVal = num(row.targetMAC)
  return {
    weightKg: num(row.weightKg) ?? 80,
    age: num(row.age) ?? 60,
    temperatureC: num(row.temperatureC) ?? 37,
    rass: rassVal !== null ? rassVal : undefined,
    targetMAC: targetVal !== null ? targetVal : undefined,
    opioidMlPerH: num(row.opioidMlPerH) ?? 0,
    opioidUgPerMl: num(row.opioidUgPerMl) ?? 0,
    midaMlPerH: num(row.midaMlPerH) ?? 0,
    midaMgPerMl: num(row.midaMgPerMl) ?? 0,
    propMlPerH: num(row.propMlPerH) ?? 0,
    propMgPerMl: num(row.propMgPerMl) ?? 0,
    dexMlPerH: num(row.dexMlPerH) ?? 0,
    dexUgPerMl: num(row.dexUgPerMl) ?? 0,
    alcoholFactor: num(row.alcoholFactor) ?? 1,
    minuteVolumeLMin: num(row.minuteVolumeLMin) ?? 8,
  }
}

/** 20+ input cases for golden table (case name + inputs). rass/targetMAC empty = null. */
const GOLDEN_INPUT_CASES: Record<string, Partial<IsoInput> & { case: string }> = {
  baseline: { case: 'baseline', weightKg: 80, age: 60, temperatureC: 37, rass: -3, minuteVolumeLMin: 8, alcoholFactor: 1 },
  alter_jung: { case: 'alter_jung', weightKg: 80, age: 20, temperatureC: 37, rass: -3, minuteVolumeLMin: 8, alcoholFactor: 1 },
  alter_alt: { case: 'alter_alt', weightKg: 80, age: 90, temperatureC: 37, rass: -3, minuteVolumeLMin: 8, alcoholFactor: 1 },
  temp_niedrig: { case: 'temp_niedrig', weightKg: 80, age: 60, temperatureC: 35, rass: -3, minuteVolumeLMin: 8, alcoholFactor: 1 },
  temp_hoch: { case: 'temp_hoch', weightKg: 80, age: 60, temperatureC: 39, rass: -3, minuteVolumeLMin: 8, alcoholFactor: 1 },
  mv_niedrig: { case: 'mv_niedrig', weightKg: 80, age: 60, temperatureC: 37, rass: -3, minuteVolumeLMin: 4, alcoholFactor: 1 },
  mv_hoch: { case: 'mv_hoch', weightKg: 80, age: 60, temperatureC: 37, rass: -3, minuteVolumeLMin: 12, alcoholFactor: 1 },
  alcohol_08: { case: 'alcohol_08', weightKg: 80, age: 60, temperatureC: 37, rass: -3, minuteVolumeLMin: 8, alcoholFactor: 0.8 },
  alcohol_12: { case: 'alcohol_12', weightKg: 80, age: 60, temperatureC: 37, rass: -3, minuteVolumeLMin: 8, alcoholFactor: 1.2 },
  opioid_004: { case: 'opioid_004', weightKg: 80, age: 60, temperatureC: 37, rass: -3, opioidMlPerH: 2, opioidUgPerMl: 96, minuteVolumeLMin: 8, alcoholFactor: 1 },
  opioid_010: { case: 'opioid_010', weightKg: 80, age: 60, temperatureC: 37, rass: -3, opioidMlPerH: 2.5, opioidUgPerMl: 192, minuteVolumeLMin: 8, alcoholFactor: 1 },
  opioid_020: { case: 'opioid_020', weightKg: 80, age: 60, temperatureC: 37, rass: -3, opioidMlPerH: 10, opioidUgPerMl: 100, minuteVolumeLMin: 8, alcoholFactor: 1 },
  mida_002: { case: 'mida_002', weightKg: 80, age: 60, temperatureC: 37, rass: -3, midaMlPerH: 1.6, midaMgPerMl: 1, minuteVolumeLMin: 8, alcoholFactor: 1 },
  mida_005: { case: 'mida_005', weightKg: 80, age: 60, temperatureC: 37, rass: -3, midaMlPerH: 4, midaMgPerMl: 1, minuteVolumeLMin: 8, alcoholFactor: 1 },
  mida_007: { case: 'mida_007', weightKg: 80, age: 60, temperatureC: 37, rass: -3, midaMlPerH: 5.6, midaMgPerMl: 1, minuteVolumeLMin: 8, alcoholFactor: 1 },
  prop_05: { case: 'prop_05', weightKg: 80, age: 60, temperatureC: 37, rass: -3, propMlPerH: 4, propMgPerMl: 10, minuteVolumeLMin: 8, alcoholFactor: 1 },
  prop_15: { case: 'prop_15', weightKg: 80, age: 60, temperatureC: 37, rass: -3, propMlPerH: 12, propMgPerMl: 10, minuteVolumeLMin: 8, alcoholFactor: 1 },
  prop_25: { case: 'prop_25', weightKg: 80, age: 60, temperatureC: 37, rass: -3, propMlPerH: 20, propMgPerMl: 10, minuteVolumeLMin: 8, alcoholFactor: 1 },
  dex_03: { case: 'dex_03', weightKg: 80, age: 60, temperatureC: 37, rass: -3, dexMlPerH: 1, dexUgPerMl: 24, minuteVolumeLMin: 8, alcoholFactor: 1 },
  dex_06: { case: 'dex_06', weightKg: 80, age: 60, temperatureC: 37, rass: -3, dexMlPerH: 1, dexUgPerMl: 48, minuteVolumeLMin: 8, alcoholFactor: 1 },
  dex_10: { case: 'dex_10', weightKg: 80, age: 60, temperatureC: 37, rass: -3, dexMlPerH: 1, dexUgPerMl: 80, minuteVolumeLMin: 8, alcoholFactor: 1 },
  targetMAC_08: { case: 'targetMAC_08', weightKg: 80, age: 60, temperatureC: 37, targetMAC: 0.8, minuteVolumeLMin: 8, alcoholFactor: 1 },
  rass_m5: { case: 'rass_m5', weightKg: 80, age: 60, temperatureC: 37, rass: -5, minuteVolumeLMin: 8, alcoholFactor: 1 },
  rass_0: { case: 'rass_0', weightKg: 80, age: 60, temperatureC: 37, rass: 0, minuteVolumeLMin: 8, alcoholFactor: 1 },
}

const baseInput: IsoInput = {
  weightKg: 80,
  age: 60,
  temperatureC: 37,
  rass: -3,
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

function fullInput(overrides: Partial<IsoInput> & { case: string }): IsoInput {
  const { case: _c, ...rest } = overrides
  return { ...baseInput, ...rest }
}

function rowFromInput(name: string, input: IsoInput, result: ReturnType<typeof calculateIso>): string {
  const rassStr = input.rass != null ? String(input.rass) : ''
  const targetStr = input.targetMAC != null ? String(input.targetMAC) : ''
  return [
    name,
    input.weightKg,
    input.age,
    input.temperatureC,
    rassStr,
    targetStr,
    input.opioidMlPerH,
    input.opioidUgPerMl,
    input.midaMlPerH,
    input.midaMgPerMl,
    input.propMlPerH,
    input.propMgPerMl,
    input.dexMlPerH,
    input.dexUgPerMl,
    input.alcoholFactor,
    input.minuteVolumeLMin,
    result.macAgeAdjusted,
    result.macEffective,
    result.fetIso,
    result.isoConsumptionMlH,
    DEFAULT_TOL,
    DEFAULT_TOL,
    DEFAULT_TOL,
    TOL_CONSUMPTION,
  ].join('\t')
}

function generateGoldenTsv(): void {
  const header = [
    'case', 'weightKg', 'age', 'temperatureC', 'rass', 'targetMAC',
    'opioidMlPerH', 'opioidUgPerMl', 'midaMlPerH', 'midaMgPerMl', 'propMlPerH', 'propMgPerMl', 'dexMlPerH', 'dexUgPerMl',
    'alcoholFactor', 'minuteVolumeLMin',
    'expect_macAgeAdjusted', 'expect_macEffective', 'expect_fetIso', 'expect_isoConsumptionMlH',
    'tol_macAgeAdjusted', 'tol_macEffective', 'tol_fetIso', 'tol_isoConsumptionMlH',
  ].join('\t')
  const rows = Object.entries(GOLDEN_INPUT_CASES).map(([name, overrides]) => {
    const input = fullInput(overrides as Partial<IsoInput> & { case: string })
    const result = calculateIso(input)
    return rowFromInput(name, input, result)
  })
  writeFileSync(GOLDEN_PATH, header + '\n' + rows.join('\n') + '\n', 'utf-8')
}

describe('golden table calculateIso', () => {
  beforeAll(() => {
    if (process.env.GENERATE_GOLDEN === '1') {
      generateGoldenTsv()
    }
  })

  it('golden TSV exists (or was just generated)', () => {
    if (process.env.GENERATE_GOLDEN === '1') {
      expect(existsSync(GOLDEN_PATH)).toBe(true)
      return
    }
    expect(existsSync(GOLDEN_PATH), 'golden_iso_cases.tsv missing; run with GENERATE_GOLDEN=1 once').toBe(true)
  })

  it('each row: calculateIso(input) matches expected values within tolerance', () => {
    if (process.env.GENERATE_GOLDEN === '1') return
    const content = readFileSync(GOLDEN_PATH, 'utf-8')
    const { rows } = parseTsv(content)
    expect(rows.length).toBeGreaterThanOrEqual(20)
    for (const row of rows) {
      const caseName = row.case?.trim() || 'unnamed'
      const input = buildInputFromRow(row)
      const result = calculateIso(input)
      const expectMacAge = num(row.expect_macAgeAdjusted)
      const expectMacEff = num(row.expect_macEffective)
      const expectFetIso = num(row.expect_fetIso)
      const expectIsoCons = num(row.expect_isoConsumptionMlH)
      const tolMacAge = num(row.tol_macAgeAdjusted) ?? DEFAULT_TOL
      const tolMacEff = num(row.tol_macEffective) ?? DEFAULT_TOL
      const tolFetIso = num(row.tol_fetIso) ?? DEFAULT_TOL
      const tolIsoCons = num(row.tol_isoConsumptionMlH) ?? TOL_CONSUMPTION
      if (expectMacAge != null) expect(Math.abs(result.macAgeAdjusted - expectMacAge), caseName + ' macAgeAdjusted').toBeLessThanOrEqual(tolMacAge)
      if (expectMacEff != null) expect(Math.abs(result.macEffective - expectMacEff), caseName + ' macEffective').toBeLessThanOrEqual(tolMacEff)
      if (expectFetIso != null) expect(Math.abs(result.fetIso - expectFetIso), caseName + ' fetIso').toBeLessThanOrEqual(tolFetIso)
      if (expectIsoCons != null) expect(Math.abs(result.isoConsumptionMlH - expectIsoCons), caseName + ' isoConsumptionMlH').toBeLessThanOrEqual(tolIsoCons)
    }
  })
})
