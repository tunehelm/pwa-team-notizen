import type { ComponentType } from 'react'
import { DantroleneCalculator } from '../DantroleneCalculator'
import { CatecholamineCalculator } from './CatecholamineCalculator'
import { HeparinCalculator } from './HeparinCalculator'
import { WeightDoseCalculator } from './WeightDoseCalculator'

export type CalculatorType = 'dantrolene' | 'catecholamine' | 'heparin' | 'weight-dose'

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
}

export const CALCULATOR_TYPES = Object.keys(CALCULATORS) as CalculatorType[]
