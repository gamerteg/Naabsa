import ExcelJS from 'exceljs'

import { calcFinalDifference, calcNaabsaFigure, calcTankRow } from '@/lib/calculations'
import type { SurveyFormData, TankRow } from '@/lib/types'

type CellValue = string | number | boolean | Date | null | undefined | { result?: CellValue; text?: string; richText?: { text: string }[] }
type SheetRows = CellValue[][]

interface ParsedWorkbook {
  formData: Partial<SurveyFormData>
  refNumber: string
  vesselName: string
  port: string
  warnings: string[]
}

const REQUIRED_SHEETS = ['Vessel Ullage', 'Sounding Barge', 'Time Log', 'Sample Report']
const GRADES = new Set<TankRow['grade']>(['VLSFO', 'LSMGO', 'HFO', 'MDO'])

function normalizeCellValue(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'object') {
    if ('result' in value) return normalizeCellValue(value.result as ExcelJS.CellValue)
    if ('text' in value && typeof value.text === 'string') return value.text
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('')
    }
  }
  return String(value)
}

function rowsFromSheet(workbook: ExcelJS.Workbook, sheetName: string): SheetRows {
  const sheet = workbook.getWorksheet(sheetName)
  if (!sheet) return []
  const rows: SheetRows = []
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values: CellValue[] = []
    for (let col = 1; col <= sheet.columnCount; col++) {
      values[col - 1] = normalizeCellValue(row.getCell(col).value)
    }
    rows[rowNumber - 1] = values
  })
  return rows
}

function findSheetName(workbook: ExcelJS.Workbook, wantedName: string): string | null {
  const normalizedWanted = wantedName.toLowerCase()
  const exact = workbook.worksheets.find((sheet) => sheet.name.toLowerCase() === normalizedWanted)
  if (exact) return exact.name

  const prefix = workbook.worksheets.find((sheet) => sheet.name.toLowerCase().startsWith(normalizedWanted))
  return prefix?.name ?? null
}

function text(value: CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  return String(value).trim()
}

function numberValue(value: CellValue): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const normalized = text(value).replace(',', '.')
  if (!normalized || normalized.startsWith('#')) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function cell(rows: SheetRows, row: number, col: number): CellValue {
  return rows[row - 1]?.[col - 1]
}

function cellText(rows: SheetRows, row: number, col: number): string {
  return text(cell(rows, row, col))
}

function cellNumber(rows: SheetRows, row: number, col: number): number {
  return numberValue(cell(rows, row, col)) ?? 0
}

function findRow(rows: SheetRows, label: string, startAt = 1): number | null {
  const needle = label.toLowerCase()
  for (let r = startAt - 1; r < rows.length; r++) {
    if (rows[r]?.some((value) => text(value).toLowerCase().includes(needle))) return r + 1
  }
  return null
}

function findCol(rows: SheetRows, row: number, label: string, fallback: number): number {
  const needle = label.toLowerCase()
  const values = rows[row - 1] || []
  const index = values.findIndex((value) => text(value).toLowerCase().includes(needle))
  return index >= 0 ? index + 1 : fallback
}

function excelSerialToDate(serial: number): Date {
  if (!Number.isFinite(serial)) return new Date(Number.NaN)
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400
  const date = new Date(utcValue * 1000)
  const fractionalDay = serial - Math.floor(serial)
  date.setUTCSeconds(date.getUTCSeconds() + Math.round(fractionalDay * 86400))
  return date
}

function toDateInput(value: CellValue): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  if (typeof value === 'number' && value > 20000) {
    const date = excelSerialToDate(value)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
  }

  const raw = text(value)
  if (!raw || raw.includes('00th')) return ''
  const withoutOrdinal = raw.replace(/(\d+)(st|nd|rd|th)/gi, '$1')
  const parsed = new Date(withoutOrdinal)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function toTimeInput(value: CellValue): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(11, 16)
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const minutes = Math.round(value * 24 * 60)
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  }
  const match = text(value).match(/(\d{1,2}):(\d{2})/)
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : ''
}

function splitTimeRange(value: CellValue): { start: string; end: string } {
  const matches = [...text(value).matchAll(/(\d{1,2}):(\d{2})/g)]
  return {
    start: matches[0] ? `${matches[0][1].padStart(2, '0')}:${matches[0][2]}` : '',
    end: matches[1] ? `${matches[1][1].padStart(2, '0')}:${matches[1][2]}` : '',
  }
}

function normalizeGrade(value: CellValue, warnings: string[], context: string): TankRow['grade'] {
  const grade = text(value).toUpperCase() as TankRow['grade']
  if (GRADES.has(grade)) return grade
  if (grade) warnings.push(`${context}: grade "${grade}" not supported; using VLSFO.`)
  return 'VLSFO'
}

function soundingType(value: CellValue): TankRow['sounding_type'] {
  const raw = text(value).toUpperCase()
  return raw.includes('S') && !raw.includes('GAUGE') ? 'S' : 'U'
}

function parseTankBlock(
  rows: SheetRows,
  options: {
    startLabel: string
    startAt?: number
    firstCol: number
    warnings: string[]
    context: string
  }
): TankRow[] {
  const blockStart = findRow(rows, options.startLabel, options.startAt ?? 1)
  if (!blockStart) {
    options.warnings.push(`${options.context}: block "${options.startLabel}" not found.`)
    return []
  }

  const header = findRow(rows, 'Tank', blockStart)
  if (!header) {
    options.warnings.push(`${options.context}: tank header not found.`)
    return []
  }
  const firstCol = findCol(rows, header, 'tank', options.firstCol)

  const tanks: TankRow[] = []
  for (let row = header + 2; row <= rows.length; row++) {
    const tankName = cellText(rows, row, firstCol)
    const firstCell = tankName.toLowerCase()
    if (firstCell === 'total' || firstCell.includes('after ') || firstCell.includes('before ')) break
    if (!tankName) {
      const hasLaterData = rows[row - 1]?.some((value) => text(value))
      if (!hasLaterData) break
      continue
    }

    const totalVol = cellNumber(rows, row, firstCol + 4)
    const freeWaterVol = cellNumber(rows, row, firstCol + 6)
    const spreadsheetGrossObs = numberValue(cell(rows, row, firstCol + 7))
    const spreadsheetGrossStd = numberValue(cell(rows, row, firstCol + 10))
    const spreadsheetInVac = numberValue(cell(rows, row, firstCol + 11))
    const spreadsheetInAir = numberValue(cell(rows, row, firstCol + 12))
    const rowData = calcTankRow({
      tank_name: tankName,
      grade: normalizeGrade(cell(rows, row, firstCol + 1), options.warnings, `${options.context} row ${row}`),
      sounding_type: soundingType(cell(rows, row, firstCol + 2)),
      sounding_value: cellNumber(rows, row, firstCol + 2),
      deg: cellNumber(rows, row, firstCol + 3),
      total_vol_observed: totalVol,
      free_water_dip: cellText(rows, row, firstCol + 5) || 'Nil',
      free_water_vol: freeWaterVol,
      vcf_tab_54b: cellNumber(rows, row, firstCol + 8),
      density_sg: cellNumber(rows, row, firstCol + 9),
    })
    if (spreadsheetGrossObs !== undefined) rowData.gross_obs_vol = spreadsheetGrossObs
    if (spreadsheetGrossStd !== undefined) rowData.gross_std_vol = spreadsheetGrossStd
    if (spreadsheetInVac !== undefined) rowData.in_vac = spreadsheetInVac
    if (spreadsheetInAir !== undefined) rowData.in_air = spreadsheetInAir
    if (!rowData.total_vol_observed && !rowData.gross_std_vol && /^(\d+)?$/.test(tankName.trim())) continue
    tanks.push(rowData)
  }

  return tanks
}

function generatedRef(vesselName: string) {
  const compactName = vesselName.replace(/[^a-z0-9]+/gi, '').slice(0, 8).toUpperCase() || 'IMPORT'
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12)
  return `BQS-${compactName}-${stamp}`
}

export async function parseBqsWorkbook(buffer: Buffer): Promise<ParsedWorkbook> {
  const warnings: string[] = []
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
  const sheetNames = workbook.worksheets.map((sheet) => sheet.name)
  const missing = REQUIRED_SHEETS.filter((sheet) => !sheetNames.includes(sheet))
  if (missing.length > 0) throw new Error(`Invalid BQS template. Missing sheet(s): ${missing.join(', ')}`)
  const protestSheetName = findSheetName(workbook, 'Letter of Protest')
  if (!protestSheetName) warnings.push('Letter of Protest sheet was not found; protest fields need review.')

  const vesselRows = rowsFromSheet(workbook, 'Vessel Ullage')
  const bargeRows = rowsFromSheet(workbook, 'Sounding Barge')
  const timeRows = rowsFromSheet(workbook, 'Time Log')
  const sampleRows = rowsFromSheet(workbook, 'Sample Report')
  const protestRows = protestSheetName ? rowsFromSheet(workbook, protestSheetName) : []

  const vesselName = cellText(vesselRows, 8, 3) || cellText(bargeRows, 9, 4) || 'Imported Vessel'
  const port = cellText(vesselRows, 9, 9) || cellText(bargeRows, 10, 10)
  const surveyDate = toDateInput(cell(vesselRows, 10, 9)) || toDateInput(cell(timeRows, 16, 4))
  const surveyTimes = splitTimeRange(cell(vesselRows, 11, 9))

  const vesselOpen = parseTankBlock(vesselRows, {
    startLabel: 'BEFORE BUNKERING',
    firstCol: 1,
    warnings,
    context: 'Vessel opening',
  })
  const vesselClose = parseTankBlock(vesselRows, {
    startLabel: 'AFTER BUNKERING',
    startAt: 30,
    firstCol: 1,
    warnings,
    context: 'Vessel closing',
  })
  const bargeOpen = parseTankBlock(bargeRows, {
    startLabel: 'BEFORE TRANSFER',
    firstCol: 2,
    warnings,
    context: 'Barge opening',
  })
  const bargeClose = parseTankBlock(bargeRows, {
    startLabel: 'AFTER RECEIVING',
    startAt: 25,
    firstCol: 2,
    warnings,
    context: 'Barge closing',
  })

  const surveyorFinalFigure = calcNaabsaFigure(vesselClose) - calcNaabsaFigure(vesselOpen)
  const bdnFigure = cellNumber(protestRows, 34, 4)
  const finalDifference = calcFinalDifference(surveyorFinalFigure, bdnFigure)

  const formData: Partial<SurveyFormData> = {
    ref_number: generatedRef(vesselName),
    vessel_name: vesselName,
    port,
    survey_date: surveyDate,
    surveyor_company: 'NAABSA Marine Surveyors',
    surveyor_name: cellText(sampleRows, 38, 9) || cellText(timeRows, 56, 9),
    vessel_chief_engineer: cellText(timeRows, 56, 3) || cellText(sampleRows, 38, 3),
    background_text: 'Imported from BQS worksheet.',

    draft_fore_open: cellNumber(vesselRows, 18, 2),
    draft_aft_open: cellNumber(vesselRows, 18, 5),
    list_open: cellNumber(vesselRows, 18, 8),
    sounding_date_open: surveyDate,
    sounding_time_start_open: surveyTimes.start,
    sounding_time_end_open: surveyTimes.end,
    vessel_tanks_open: vesselOpen,
    logbook_figure: cellNumber(vesselRows, 44, 11),
    naabsa_figure: calcNaabsaFigure(vesselOpen),
    difference_open_vessel: calcNaabsaFigure(vesselOpen) - cellNumber(vesselRows, 44, 11),

    draft_fore_barge_open: cellNumber(bargeRows, 17, 3),
    draft_aft_barge_open: cellNumber(bargeRows, 17, 6),
    list_barge_open: cellNumber(bargeRows, 17, 9),
    flowmeter_status_open: cellText(bargeRows, 16, 11),
    barge_sounding_date: surveyDate,
    barge_sounding_time_start: surveyTimes.start,
    barge_sounding_time_end: surveyTimes.end,
    barge_tanks_open: bargeOpen,
    barge_inspector_figure_open: cellNumber(bargeRows, 35, 14),
    surveyor_figure_barge_open: calcNaabsaFigure(bargeOpen),
    difference_barge_open: calcNaabsaFigure(bargeOpen) - cellNumber(bargeRows, 35, 14),

    draft_fore_close: cellNumber(vesselRows, 47, 2),
    draft_aft_close: cellNumber(vesselRows, 47, 5),
    list_close: cellNumber(vesselRows, 47, 8),
    closing_date: surveyDate,
    closing_time_start: toTimeInput(cell(timeRows, 28, 5)),
    closing_time_end: toTimeInput(cell(timeRows, 28, 6)),
    vessel_tanks_close: vesselClose,
    initial_quantity: calcNaabsaFigure(vesselOpen),
    final_quantity: calcNaabsaFigure(vesselClose),
    difference_vessel_closing: surveyorFinalFigure,

    closing_barge_date: surveyDate,
    closing_barge_time_start: toTimeInput(cell(timeRows, 27, 5)),
    closing_barge_time_end: toTimeInput(cell(timeRows, 27, 6)),
    barge_tanks_close: bargeClose,
    barge_inspector_figure_close: cellNumber(bargeRows, 58, 14),
    surveyor_figure_barge_close: calcNaabsaFigure(bargeClose),
    difference_barge_close: calcNaabsaFigure(bargeClose) - cellNumber(bargeRows, 58, 14),
    flowmeter_close: cellText(bargeRows, 40, 11),

    bdn_figure: bdnFigure,
    surveyor_final_figure: surveyorFinalFigure,
    final_difference_mt: finalDifference.mt,
    final_difference_pct: finalDifference.pct,
    letter_of_protest: !!bdnFigure && Math.abs(finalDifference.mt) > 0.1,
    protest_description: cellText(protestRows, 28, 1),

    photos: [],
  }

  if (!surveyDate) warnings.push('Survey date could not be converted automatically.')
  if (vesselOpen.length === 0) warnings.push('No vessel opening tank rows were imported.')
  if (vesselClose.length === 0) warnings.push('No vessel closing tank rows were imported.')
  if (bargeOpen.length === 0) warnings.push('No barge opening tank rows were imported.')
  if (bargeClose.length === 0) warnings.push('No barge closing tank rows were imported.')

  return {
    formData,
    refNumber: formData.ref_number!,
    vesselName,
    port,
    warnings,
  }
}
