import type { ComponentType } from 'react'
import { DantroleneCalculator } from '../DantroleneCalculator'
import { HeparinCalculator } from './HeparinCalculator'
import { WeightDoseCalculator } from './WeightDoseCalculator'
import { NoradrenalinePerfusorCalculator } from './NoradrenalinePerfusorCalculator'
import { SedationInfusionCalculator } from './SedationInfusionCalculator'
import { MapCalculator } from './MapCalculator'
import { PbwArdsCalculator } from './PbwArdsCalculator'
import { PfRatioCalculator } from './PfRatioCalculator'
import { GcsCalculator } from './GcsCalculator'
import { BeCorrectionCalculator } from './BeCorrectionCalculator'
import { MannitolCalculator } from './MannitolCalculator'

export type CalculatorType =
  | 'dantrolene'
  | 'mannitol-osmofundin'
  | 'noradrenaline-perfusor'
  | 'heparin'
  | 'sedation-infusion'
  | 'map-target'
  | 'pbw-ards'
  | 'be-correction'
  | 'pfratio'
  | 'weight-dose'
  | 'gcs'

export interface CalculatorBlockProps {
  config?: Record<string, unknown> | null
  onRemove?: () => void
  onDuplicate?: () => void
  onUpdateConfig?: (next: Record<string, unknown>) => void
}

export interface CalculatorDef {
  title: string
  defaultConfig: Record<string, unknown>
  Component: ComponentType<CalculatorBlockProps>
}

export const CALCULATORS: Record<CalculatorType, CalculatorDef> = {
  dantrolene: {
    title: 'Dantrolen (Agilus)',
    defaultConfig: {
      doseMgPerKg: 2.5,
      vialMg: 120,
      finalVialVolumeMl: 22.6,
      maxDoseMg: 300,
      label: 'Dantrolen (Agilus) 120 mg',
    },
    Component: DantroleneCalculator as ComponentType<CalculatorBlockProps>,
  },
  'mannitol-osmofundin': {
    title: 'Mannitol / Osmofundin 15 %',
    defaultConfig: {
      label: 'Mannitol / Osmofundin 15 %',
      doseGPerKg: 0.5,
      concentrationGPerMl: 0.15,
    },
    Component: MannitolCalculator,
  },
  'noradrenaline-perfusor': {
    title: 'Noradrenalin Perfusor',
    defaultConfig: {
      label: 'Noradrenalin Perfusor',
      mgTotal: 5,
      mlTotal: 50,
      defaultRateMlH: 5,
      defaultWeightKg: 70,
    },
    Component: NoradrenalinePerfusorCalculator,
  },
  heparin: {
    title: 'Heparin Perfusor (IE/kg/h ↔ ml/h)',
    defaultConfig: {
      ieInSyringe: 25000,
      mlTotal: 50,
      targetIEPerKgH: 18,
    },
    Component: HeparinCalculator,
  },
  'sedation-infusion': {
    title: 'Sedierungs-Perfusor (Propofol, Midazolam)',
    defaultConfig: {
      drug: 'propofol',
      mgPerMl: 10,
    },
    Component: SedationInfusionCalculator,
  },
  'map-target': {
    title: 'MAP-Ziel',
    defaultConfig: {},
    Component: MapCalculator,
  },
  'pbw-ards': {
    title: 'IBW / PBW (ARDS)',
    defaultConfig: { gender: 'male' },
    Component: PbwArdsCalculator,
  },
  'be-correction': {
    title: 'BE-Korrektur (TRIS/NaHCO₃)',
    defaultConfig: { label: 'BE-Korrektur (TRIS / NaHCO₃)' },
    Component: BeCorrectionCalculator,
  },
  pfratio: {
    title: 'PaO₂/FiO₂ Ratio',
    defaultConfig: {},
    Component: PfRatioCalculator,
  },
  'weight-dose': {
    title: 'mg/kg Standard (Dose/Volumen/Vials)',
    defaultConfig: {
      doseMgPerKg: 10,
      maxDoseMg: 500,
      vialMg: 1000,
      finalVialVolumeMl: 10,
    },
    Component: WeightDoseCalculator,
  },
  gcs: {
    title: 'GCS Helper',
    defaultConfig: { e: 4, v: 5, m: 6 },
    Component: GcsCalculator,
  },
}

export const CALCULATOR_TYPES: CalculatorType[] = [
  'dantrolene',
  'mannitol-osmofundin',
  'noradrenaline-perfusor',
  'heparin',
  'sedation-infusion',
  'map-target',
  'pbw-ards',
  'be-correction',
  'pfratio',
  'weight-dose',
  'gcs',
]
