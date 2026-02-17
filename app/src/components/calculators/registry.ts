import type { ComponentType } from 'react'
import { DantroleneCalculator } from '../DantroleneCalculator'
import { CatecholamineCalculator } from './CatecholamineCalculator'
import { HeparinCalculator } from './HeparinCalculator'
import { WeightDoseCalculator } from './WeightDoseCalculator'
import { NoradrenalineCalculator } from './NoradrenalineCalculator'
import { SedationInfusionCalculator } from './SedationInfusionCalculator'
import { MapCalculator } from './MapCalculator'
import { PbwArdsCalculator } from './PbwArdsCalculator'
import { PfRatioCalculator } from './PfRatioCalculator'
import { GcsCalculator } from './GcsCalculator'

export type CalculatorType =
  | 'dantrolene'
  | 'noradrenaline'
  | 'catecholamine'
  | 'heparin'
  | 'sedation-infusion'
  | 'map-target'
  | 'pbw-ards'
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
  noradrenaline: {
    title: 'Noradrenalin PRO (µg/kg/min ↔ ml/h)',
    defaultConfig: {
      mgTotal: 4,
      mlTotal: 50,
      targetMcgPerKgMin: 0.1,
    },
    Component: NoradrenalineCalculator,
  },
  catecholamine: {
    title: 'Katecholamin Perfusor (µg/kg/min ↔ ml/h)',
    defaultConfig: {
      mgInSyringe: 4,
      mlTotal: 50,
      targetMcgPerKgMin: 0.1,
    },
    Component: CatecholamineCalculator,
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
  'noradrenaline',
  'catecholamine',
  'heparin',
  'sedation-infusion',
  'map-target',
  'pbw-ards',
  'pfratio',
  'weight-dose',
  'gcs',
]
