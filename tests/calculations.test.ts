import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calcFinalDifference,
  calcGrossObsVol,
  calcGrossStdVol,
  calcInAir,
  calcInVac,
  calcTankRow,
  deriveFinalFigures,
  IN_AIR_FACTOR,
} from '@/lib/calculations'
import type { SurveyFormData, TankRow } from '@/lib/types'

function closeTo(actual: number, expected: number, decimals = 6) {
  assert.equal(Number(actual.toFixed(decimals)), Number(expected.toFixed(decimals)))
}

test('tank row calculations match NAABSA workbook formulas', () => {
  const grossObserved = calcGrossObsVol(1250.125, 10.125)
  closeTo(grossObserved, 1240)

  const grossStandard = calcGrossStdVol(grossObserved, 0.98765)
  closeTo(grossStandard, 1224.686)

  const inVac = calcInVac(grossStandard, 0.945)
  closeTo(inVac, 1157.32827)

  const inAir = calcInAir(inVac)
  closeTo(inAir, inVac * IN_AIR_FACTOR)
})

test('derived final figures are calculated from opening and closing vessel tanks', () => {
  const opening: TankRow = calcTankRow({
    id: 'open-1',
    total_vol_observed: 1000,
    free_water_vol: 0,
    vcf_tab_54b: 1,
    density_sg: 0.95,
  })
  const closing: TankRow = calcTankRow({
    id: 'close-1',
    total_vol_observed: 1600,
    free_water_vol: 0,
    vcf_tab_54b: 1,
    density_sg: 0.95,
  })

  const figures = deriveFinalFigures({
    vessel_tanks_open: [opening],
    vessel_tanks_close: [closing],
    bdn_figure: 570,
  } as Partial<SurveyFormData>)

  const expectedSurveyor = (1600 * 0.95 * IN_AIR_FACTOR) - (1000 * 0.95 * IN_AIR_FACTOR)
  closeTo(figures.surveyor_final_figure, expectedSurveyor)
  closeTo(figures.final_difference_mt, expectedSurveyor - 570)
  closeTo(figures.final_difference_pct, ((expectedSurveyor - 570) / 570) * 100)
})

test('final difference handles zero BDN without division noise', () => {
  assert.deepEqual(calcFinalDifference(10, 0), { mt: 10, pct: 0 })
})
