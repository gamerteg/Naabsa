// lib/calculations.ts

import type { TankRow, GravityRow, SurveyFormData } from './types'

export const IN_AIR_FACTOR = 0.9985

export function calcGrossObsVol(totalVol: number, freeWaterVol: number): number {
  return Math.max(0, (totalVol || 0) - (freeWaterVol || 0))
}

export function calcGrossStdVol(grossObs: number, vcf: number): number {
  return (grossObs || 0) * (vcf || 0)
}

export function calcInVac(grossStd: number, densitySg: number): number {
  return (grossStd || 0) * (densitySg || 0)
}

export function calcInAir(inVac: number): number {
  return (inVac || 0) * IN_AIR_FACTOR
}

export function calcTankRow(row: Partial<TankRow>): TankRow {
  const gross_obs_vol = calcGrossObsVol(row.total_vol_observed ?? 0, row.free_water_vol ?? 0)
  const gross_std_vol = calcGrossStdVol(gross_obs_vol, row.vcf_tab_54b ?? 0)
  const in_vac = calcInVac(gross_std_vol, row.density_sg ?? 0)
  const in_air = calcInAir(in_vac)
  return {
    id: row.id ?? crypto.randomUUID(),
    tank_name: row.tank_name ?? '',
    grade: row.grade ?? 'VLSFO',
    sounding_type: row.sounding_type ?? 'U',
    sounding_value: row.sounding_value ?? 0,
    deg: row.deg ?? 0,
    total_vol_observed: row.total_vol_observed ?? 0,
    free_water_dip: row.free_water_dip ?? 'Nil',
    free_water_vol: row.free_water_vol ?? 0,
    vcf_tab_54b: row.vcf_tab_54b ?? 0,
    density_sg: row.density_sg ?? 0,
    gross_obs_vol,
    gross_std_vol,
    in_vac,
    in_air,
  }
}

export interface TankTotals {
  total_gross_obs: number
  total_gross_std: number
  total_in_vac: number
  total_in_air: number
}

export function calcTotals(tanks: TankRow[]): TankTotals {
  return {
    total_gross_obs: tanks.reduce((s, t) => s + (t.gross_obs_vol || 0), 0),
    total_gross_std: tanks.reduce((s, t) => s + (t.gross_std_vol || 0), 0),
    total_in_vac: tanks.reduce((s, t) => s + (t.in_vac || 0), 0),
    total_in_air: tanks.reduce((s, t) => s + (t.in_air || 0), 0),
  }
}

export function calcNaabsaFigure(tanks: TankRow[]): number {
  return calcTotals(tanks).total_in_air
}

export function calcFinalDifference(surveyor: number, bdn: number): { mt: number; pct: number } {
  const mt = (surveyor || 0) - (bdn || 0)
  const pct = bdn !== 0 ? (mt / bdn) * 100 : 0
  return { mt, pct }
}

export function calcSurveyorFinalFigure(data: Partial<SurveyFormData>): number {
  return calcNaabsaFigure(data.vessel_tanks_close || []) - calcNaabsaFigure(data.vessel_tanks_open || [])
}

export function deriveFinalFigures(data: Partial<SurveyFormData>) {
  const surveyor_final_figure = calcSurveyorFinalFigure(data)
  const { mt: final_difference_mt, pct: final_difference_pct } = calcFinalDifference(
    surveyor_final_figure,
    data.bdn_figure || 0
  )

  return {
    surveyor_final_figure,
    final_difference_mt,
    final_difference_pct,
  }
}

export function normalizeCalculatedFields<T extends Partial<SurveyFormData>>(data: T): T & ReturnType<typeof deriveFinalFigures> {
  return {
    ...data,
    ...deriveFinalFigures(data),
  }
}

export function formatNumber(value: number, decimals = 3): string {
  if (isNaN(value) || !isFinite(value)) return '0.' + '0'.repeat(decimals)
  return value.toFixed(decimals)
}

export function createEmptyTankRow(): TankRow {
  return calcTankRow({ id: crypto.randomUUID() })
}

export function createEmptyGravityRow(): GravityRow {
  return { id: crypto.randomUUID(), temperature_c: 0, specific_gravity: 0 }
}
