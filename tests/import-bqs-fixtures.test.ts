import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { deriveFinalFigures } from '@/lib/calculations'
import { parseBqsWorkbook } from '@/lib/import/bqs-xlsx'
import type { SurveyFormData } from '@/lib/types'

interface ExpectedBqsSample {
  file: string
  vessel_name: string
  port: string
  survey_date: string
  tank_counts: Record<'vessel_tanks_open' | 'vessel_tanks_close' | 'barge_tanks_open' | 'barge_tanks_close', number>
  figures: {
    bdn_figure: number
    surveyor_final_figure: number
    final_difference_mt: number
    final_difference_pct: number
  }
}

const fixturesDir = join(process.cwd(), 'tests', 'fixtures', 'import')
const expected = JSON.parse(readFileSync(join(fixturesDir, 'expected-bqs.json'), 'utf8')) as ExpectedBqsSample[]

function closeTo(actual: number, expectedValue: number, decimals = 6) {
  assert.equal(Number(actual.toFixed(decimals)), Number(expectedValue.toFixed(decimals)))
}

for (const sample of expected) {
  test(`imports BQS workbook fixture: ${sample.file}`, async () => {
    const parsed = await parseBqsWorkbook(readFileSync(join(fixturesDir, sample.file)))
    const formData = parsed.formData as Partial<SurveyFormData>
    const figures = deriveFinalFigures(formData)

    assert.equal(parsed.vesselName, sample.vessel_name)
    assert.equal(parsed.port, sample.port)
    assert.equal(formData.survey_date, sample.survey_date)
    assert.deepEqual(parsed.warnings, [])

    assert.equal(formData.vessel_tanks_open?.length ?? 0, sample.tank_counts.vessel_tanks_open)
    assert.equal(formData.vessel_tanks_close?.length ?? 0, sample.tank_counts.vessel_tanks_close)
    assert.equal(formData.barge_tanks_open?.length ?? 0, sample.tank_counts.barge_tanks_open)
    assert.equal(formData.barge_tanks_close?.length ?? 0, sample.tank_counts.barge_tanks_close)

    closeTo(formData.bdn_figure ?? 0, sample.figures.bdn_figure)
    closeTo(figures.surveyor_final_figure, sample.figures.surveyor_final_figure)
    closeTo(figures.final_difference_mt, sample.figures.final_difference_mt)
    closeTo(figures.final_difference_pct, sample.figures.final_difference_pct)
  })
}
