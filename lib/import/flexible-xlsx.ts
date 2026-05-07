import { createHash } from 'crypto'

import ExcelJS from 'exceljs'

import { calcFinalDifference, calcTankRow } from '@/lib/calculations'
import { parseBqsWorkbook } from '@/lib/import/bqs-xlsx'
import type { SurveyFormData, TankRow } from '@/lib/types'

export type ImportSourceType = 'bqs_template' | 'saved_template' | 'ai_mapping'

export interface CellSource {
  sheet: string
  row: number
  col: number
}

export interface SpreadsheetImportTemplate {
  id?: string
  name?: string
  source_signature?: string
  mapping?: Record<string, CellSource>
}

export interface ImportPreview {
  source_type: ImportSourceType
  confidence_score: number
  form_data: Partial<SurveyFormData>
  field_confidence: Record<string, number>
  warnings: string[]
  template_candidate: {
    signature: string
    template_id?: string
    template_name?: string
    mapping?: Record<string, CellSource>
  }
  file_name: string
}

interface SnapshotCell {
  sheet: string
  row: number
  col: number
  address: string
  text: string
}

interface SnapshotRow {
  row: number
  cells: { col: number; address: string; text: string }[]
}

interface SnapshotKeyValue {
  label: string
  value: string
  label_address: string
  value_address: string
}

interface SnapshotTableRegion {
  start_row: number
  end_row: number
  headers: string[]
  sample_rows: string[][]
}

interface SnapshotSheetSummary {
  name: string
  row_count: number
  column_count: number
  rows: SnapshotRow[]
  key_values: SnapshotKeyValue[]
  table_regions: SnapshotTableRegion[]
}

interface WorkbookSnapshot {
  signature: string
  sheets: string[]
  cells: SnapshotCell[]
  relevant_cells: SnapshotCell[]
  sheet_summaries: SnapshotSheetSummary[]
}

interface AiImportResult {
  confidence_score: number
  fields: {
    field: string
    value: string | number | boolean | null
    confidence: number
    source: {
      sheet: string | null
      row: number | null
      col: number | null
    }
  }[]
  vessel_tanks_open: {
    tank_name: string
    grade: string | null
    sounding_type: string | null
    sounding_value: number | null
    deg: number | null
    total_vol_observed: number | null
    free_water_dip: string | null
    free_water_vol: number | null
    vcf_tab_54b: number | null
    density_sg: number | null
    confidence: number
    source: {
      sheet: string | null
      row: number | null
    }
  }[]
  warnings: string[]
}

const RELEVANT_TERMS = [
  'vessel', 'navio', 'embarcacao', 'port', 'porto', 'survey', 'date', 'data',
  'bunker', 'bdn', 'rob', 'figure', 'quantity', 'quantidade', 'sounding',
  'ullage', 'tank', 'tanque', 'barge', 'barca', 'draft', 'trim', 'list',
  'density', 'temperature', 'sample', 'protest', 'chief', 'engineer', 'surveyor',
]

const SCALAR_FIELDS = new Set([
  'ref_number',
  'vessel_name',
  'port',
  'survey_date',
  'customer_company',
  'surveyor_company',
  'surveyor_name',
  'supplier_company',
  'vessel_master',
  'vessel_chief_engineer',
  'flag',
  'port_registry',
  'callsign',
  'imo_number',
  'vessel_type',
  'delivered_year',
  'loa',
  'background_text',
  'boarding_date',
  'boarding_time',
  'draft_fore_open',
  'draft_aft_open',
  'list_open',
  'draft_fore_barge_open',
  'draft_aft_barge_open',
  'list_barge_open',
  'draft_fore_close',
  'draft_aft_close',
  'list_close',
  'bdn_figure',
  'surveyor_final_figure',
  'final_difference_mt',
  'final_difference_pct',
  'letter_of_protest',
  'protest_description',
  'rob_after_bunkering',
])

const NAABSA_SURVEY_SHEETS = ['Summary', 'Qtt Summary', 'Vessel Ullage', 'Sludge', 'LOG Audit', 'Time Log']

function normalizeText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined && value.result !== null) return normalizeText(value.result as ExcelJS.CellValue)
    if ('text' in value && typeof value.text === 'string') return value.text.trim()
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('').trim()
  }
  return String(value).trim()
}

function sanitizeSnapshotText(value: string): string {
  return value
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email removido]')
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[telefone removido]')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNoisySnapshotText(value: string): boolean {
  const normalized = value.toLowerCase()
  return (
    !normalized ||
    normalized === '[ insert logo ]' ||
    normalized.includes('naabsa marine surveyors & consultants') ||
    normalized.includes('ana costa') ||
    normalized.includes('naabsa.com') ||
    normalized.includes('do not print') ||
    normalized.includes('auto-filled from')
  )
}

function compactCellText(value: ExcelJS.CellValue): string {
  const text = sanitizeSnapshotText(normalizeText(value))
  if (isNoisySnapshotText(text)) return ''
  return text.length > 220 ? `${text.slice(0, 217)}...` : text
}

function shouldKeepCell(text: string) {
  if (!text) return false
  if (text.length > 180) return false
  const normalized = text.toLowerCase()
  return RELEVANT_TERMS.some((term) => normalized.includes(term)) || /^[\d.,:/ -]{4,}$/.test(normalized)
}

function hashSignature(sheets: string[], cells: SnapshotCell[]) {
  const labels = cells
    .filter((cell) => /[a-z]/i.test(cell.text))
    .slice(0, 180)
    .map((cell) => `${cell.sheet}:${cell.row}:${cell.col}:${cell.text.toLowerCase().replace(/\s+/g, ' ')}`)

  return createHash('sha256')
    .update(JSON.stringify({ sheets: sheets.map((sheet) => sheet.toLowerCase()), labels }))
    .digest('hex')
}

function rowSnapshot(row: ExcelJS.Row, rowNumber: number, maxCol: number): SnapshotRow | null {
  const cells: SnapshotRow['cells'] = []
  for (let col = 1; col <= maxCol; col++) {
    const text = compactCellText(row.getCell(col).value)
    if (!text) continue
    cells.push({ col, address: row.getCell(col).address, text })
  }
  return cells.length ? { row: rowNumber, cells } : null
}

function extractKeyValues(rows: SnapshotRow[]): SnapshotKeyValue[] {
  const pairs: SnapshotKeyValue[] = []

  for (const row of rows) {
    const cells = row.cells
    if (cells.length < 2) continue

    for (let index = 0; index < Math.min(3, cells.length - 1); index++) {
      const labelCell = cells[index]
      const valueCell = cells.slice(index + 1).find((cell) => cell.text && cell.text.toLowerCase() !== labelCell.text.toLowerCase())
      if (!valueCell) continue
      if (!/[a-z]/i.test(labelCell.text)) continue
      if (labelCell.text.length > 80 || valueCell.text.length > 180) continue

      pairs.push({
        label: labelCell.text,
        value: valueCell.text,
        label_address: labelCell.address,
        value_address: valueCell.address,
      })
      break
    }
  }

  return pairs.slice(0, 90)
}

function looksLikeHeader(row: SnapshotRow): boolean {
  const textCells = row.cells.filter((cell) => /[a-z]/i.test(cell.text))
  const numericCells = row.cells.filter((cell) => /^-?\d+([.,]\d+)?$/.test(cell.text))
  return textCells.length >= 3 && numericCells.length <= Math.max(1, textCells.length)
}

function extractTableRegions(rows: SnapshotRow[]): SnapshotTableRegion[] {
  const regions: SnapshotTableRegion[] = []

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    if (!looksLikeHeader(row)) continue

    const dataRows: string[][] = []
    for (let next = index + 1; next < rows.length && dataRows.length < 8; next++) {
      const gap = rows[next].row - rows[next - 1].row
      if (gap > 3) break
      if (looksLikeHeader(rows[next]) && dataRows.length > 0) break
      const values = rows[next].cells.map((cell) => cell.text)
      if (values.length >= 2) dataRows.push(values.slice(0, 14))
    }

    if (dataRows.length >= 2) {
      regions.push({
        start_row: row.row,
        end_row: rows[Math.min(rows.length - 1, index + dataRows.length)].row,
        headers: row.cells.map((cell) => cell.text).slice(0, 14),
        sample_rows: dataRows,
      })
    }
  }

  return regions.slice(0, 12)
}

function buildSheetSummary(sheet: ExcelJS.Worksheet): SnapshotSheetSummary {
  const rows: SnapshotRow[] = []
  const maxCol = Math.min(sheet.columnCount || 16, 18)

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rows.length >= 90) return
    const snapshot = rowSnapshot(row, rowNumber, maxCol)
    if (snapshot) rows.push(snapshot)
  })

  return {
    name: sheet.name,
    row_count: sheet.rowCount,
    column_count: sheet.columnCount,
    rows,
    key_values: extractKeyValues(rows),
    table_regions: extractTableRegions(rows),
  }
}

export async function buildWorkbookSnapshot(buffer: Buffer): Promise<WorkbookSnapshot> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)

  const sheets = workbook.worksheets.map((sheet) => sheet.name)
  const cells: SnapshotCell[] = []
  const relevantCells: SnapshotCell[] = []
  const sheetSummaries: SnapshotSheetSummary[] = []

  for (const sheet of workbook.worksheets) {
    sheetSummaries.push(buildSheetSummary(sheet))
    let collected = 0
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (collected >= 260) return
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (collected >= 260) return
        const text = compactCellText(cell.value)
        if (!text) return
        const item = { sheet: sheet.name, row: rowNumber, col: colNumber, address: cell.address, text }
        cells.push(item)
        if (shouldKeepCell(text)) {
          relevantCells.push(item)
          collected += 1
        }
      })
    })
  }

  const signature = hashSignature(sheets, relevantCells.length ? relevantCells : cells)
  return {
    signature,
    sheets,
    cells: cells.slice(0, 1200),
    relevant_cells: relevantCells.slice(0, 520),
    sheet_summaries: sheetSummaries,
  }
}

function highConfidenceFor(formData: Partial<SurveyFormData>) {
  return Object.fromEntries(Object.keys(formData).map((field) => [field, 0.98]))
}

export async function previewFromBqsTemplate(buffer: Buffer, fileName: string): Promise<ImportPreview> {
  const [parsed, snapshot] = await Promise.all([parseBqsWorkbook(buffer), buildWorkbookSnapshot(buffer)])

  return {
    source_type: 'bqs_template',
    confidence_score: parsed.warnings.length ? 92 : 98,
    form_data: parsed.formData,
    field_confidence: highConfidenceFor(parsed.formData),
    warnings: parsed.warnings,
    template_candidate: { signature: snapshot.signature, template_name: 'Modelo BQS padrao' },
    file_name: fileName,
  }
}

function cellTextFromSheet(sheet: ExcelJS.Worksheet | undefined, row: number, col: number): string {
  if (!sheet) return ''
  return normalizeText(sheet.getRow(row).getCell(col).value)
}

function cellNumberFromSheet(sheet: ExcelJS.Worksheet | undefined, row: number, col: number): number {
  const raw = cellTextFromSheet(sheet, row, col).replace(',', '.')
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseDateText(value: string): string {
  const raw = value.trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const withoutOrdinal = raw.replace(/(\d+)(st|nd|rd|th)/gi, '$1')
  const parsed = new Date(withoutOrdinal)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function normalizeSurveyGrade(value: string): TankRow['grade'] {
  const grade = value.toUpperCase()
  if (grade.includes('VLS')) return 'VLSFO'
  if (grade.includes('ULS') || grade.includes('DIST') || grade.includes('MGO') || grade.includes('MDO')) return 'MDO'
  if (grade.includes('HS') || grade.includes('HFO') || grade.includes('IFO')) return 'HFO'
  return 'VLSFO'
}

function soundingTypeFromText(value: string): TankRow['sounding_type'] {
  return value.toUpperCase().includes(' U') ? 'U' : 'S'
}

function soundingNumberFromText(value: string): number {
  const match = value.replace(',', '.').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function summaryValue(sheet: ExcelJS.Worksheet | undefined, label: string): string {
  if (!sheet) return ''
  const wanted = label.toLowerCase()
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const labelFound = [1, 2].some((col) => cellTextFromSheet(sheet, rowNumber, col).toLowerCase() === wanted)
    if (!labelFound) continue

    for (let col = 3; col <= Math.max(row.cellCount, sheet.columnCount); col++) {
      const value = normalizeText(row.getCell(col).value)
      if (value && value.toLowerCase() !== wanted) return value
    }
  }
  return ''
}

function parseNaabsaVesselTanks(sheet: ExcelJS.Worksheet | undefined): TankRow[] {
  if (!sheet) return []
  const tanks: TankRow[] = []

  for (let row = 15; row <= sheet.rowCount; row++) {
    const tankName = cellTextFromSheet(sheet, row, 2)
    const lower = tankName.toLowerCase()
    if (!tankName) continue
    if (lower.startsWith('total') || lower.includes('chief engineer')) break

    tanks.push(calcTankRow({
      tank_name: tankName,
      grade: normalizeSurveyGrade(cellTextFromSheet(sheet, row, 3)),
      sounding_type: soundingTypeFromText(cellTextFromSheet(sheet, row, 4)),
      sounding_value: soundingNumberFromText(cellTextFromSheet(sheet, row, 4)),
      deg: cellNumberFromSheet(sheet, row, 5),
      total_vol_observed: cellNumberFromSheet(sheet, row, 6),
      free_water_dip: cellTextFromSheet(sheet, row, 7) || 'Nil',
      free_water_vol: 0,
      vcf_tab_54b: cellNumberFromSheet(sheet, row, 9),
      density_sg: cellNumberFromSheet(sheet, row, 10),
    }))
  }

  return tanks
}

function sumCells(sheet: ExcelJS.Worksheet | undefined, cells: [number, number][]): number {
  return cells.reduce((sum, [row, col]) => sum + cellNumberFromSheet(sheet, row, col), 0)
}

export async function previewFromNaabsaSurveyTemplate(buffer: Buffer, fileName: string): Promise<ImportPreview | null> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)

  const sheetNames = workbook.worksheets.map((sheet) => sheet.name)
  const matchedSheets = NAABSA_SURVEY_SHEETS.filter((sheet) => sheetNames.includes(sheet))
  if (!sheetNames.includes('Summary') || !sheetNames.includes('Qtt Summary') || matchedSheets.length < 4) {
    return null
  }

  const snapshot = await buildWorkbookSnapshot(buffer)
  const summary = workbook.getWorksheet('Summary')
  const quantities = workbook.getWorksheet('Qtt Summary')
  const vesselUllage = workbook.getWorksheet('Vessel Ullage')
  const timeLog = workbook.getWorksheet('Time Log')

  const surveyorFigure = sumCells(quantities, [[14, 5], [19, 5], [24, 5], [29, 5]])
  const logbookFigure = sumCells(quantities, [[15, 5], [20, 5], [25, 5], [30, 5]])
  const finalDifference = calcFinalDifference(surveyorFigure, logbookFigure)
  const vesselTanks = parseNaabsaVesselTanks(vesselUllage)
  const surveyDate = parseDateText(summaryValue(summary, 'DATE'))
  const warnings: string[] = [
    'Modelo NAABSA ROB/Sludge reconhecido. Confira se o tipo de servico deve ser refletido no texto final do relatorio.',
  ]

  if (!surveyDate) warnings.push('Data da vistoria nao foi convertida automaticamente.')
  if (vesselTanks.length === 0) warnings.push('Tabela de tanques do navio nao foi identificada automaticamente.')
  if (!surveyorFigure) warnings.push('Figura final do surveyor nao foi encontrada no resumo de quantidades.')

  const formData: Partial<SurveyFormData> = {
    ref_number: summaryValue(summary, 'SURVEY REF'),
    vessel_name: summaryValue(summary, 'VESSEL'),
    port: summaryValue(summary, 'PORT'),
    survey_date: surveyDate,
    customer_company: summaryValue(summary, 'CLIENT'),
    surveyor_company: 'NAABSA Marine Surveyors',
    surveyor_name: summaryValue(summary, 'SURVEYOR(S)'),
    vessel_master: summaryValue(summary, 'CAPTAIN'),
    vessel_chief_engineer: summaryValue(summary, 'CHIEF ENGINEER'),
    flag: summaryValue(summary, 'FLAG'),
    port_registry: summaryValue(summary, 'PORT OF REGISTRY'),
    callsign: summaryValue(summary, 'CALL SIGN'),
    imo_number: summaryValue(summary, 'IMO NUMBER'),
    vessel_type: summaryValue(summary, 'TYPE'),
    delivered_year: summaryValue(summary, 'DELIVERED'),
    loa: summaryValue(summary, 'LOA (m)'),
    background_text: summaryValue(summary, 'APPOINTED SERVICE'),
    boarding_date: parseDateText(cellTextFromSheet(timeLog, 15, 3)),
    boarding_time: cellTextFromSheet(timeLog, 15, 4).replace(/h\/lt/i, '').trim(),
    vessel_tanks_open: vesselTanks,
    logbook_figure: logbookFigure,
    naabsa_figure: surveyorFigure,
    difference_open_vessel: finalDifference.mt,
    bdn_figure: logbookFigure,
    surveyor_final_figure: surveyorFigure,
    final_difference_mt: finalDifference.mt,
    final_difference_pct: finalDifference.pct,
    rob_after_bunkering: surveyorFigure,
    letter_of_protest: Math.abs(finalDifference.mt) > 0.1,
    protest_description: summaryValue(summary, 'APPOINTED SERVICE'),
    photos: [],
  }

  return {
    source_type: 'saved_template',
    confidence_score: warnings.length > 1 ? 88 : 94,
    form_data: formData,
    field_confidence: highConfidenceFor(formData),
    warnings,
    template_candidate: {
      signature: snapshot.signature,
      template_name: 'Modelo NAABSA Survey reconhecido',
      mapping: {},
    },
    file_name: fileName,
  }
}

function cellKey(source: CellSource) {
  return `${source.sheet}::${source.row}::${source.col}`
}

function coerceTemplateValue(value: string): string | number | boolean {
  const normalized = value.replace(',', '.')
  const numberValue = Number(normalized)
  if (Number.isFinite(numberValue) && /^-?\d+([.,]\d+)?$/.test(value.trim())) return numberValue
  if (/^(true|yes|sim)$/i.test(value)) return true
  if (/^(false|no|nao|não)$/i.test(value)) return false
  return value
}

export function previewFromSavedTemplate(
  snapshot: WorkbookSnapshot,
  fileName: string,
  template: SpreadsheetImportTemplate
): ImportPreview {
  const byCell = new Map(snapshot.cells.map((cell) => [cellKey(cell), cell.text]))
  const formData: Record<string, unknown> = {}
  const fieldConfidence: Record<string, number> = {}
  const warnings: string[] = []
  const mapping = template.mapping || {}

  for (const [field, source] of Object.entries(mapping)) {
    if (!SCALAR_FIELDS.has(field)) continue
    const value = byCell.get(cellKey(source))
    if (!value) {
      warnings.push(`Campo "${field}" nao foi encontrado na celula salva do modelo.`)
      fieldConfidence[field] = 0.35
      continue
    }
    formData[field] = coerceTemplateValue(value)
    fieldConfidence[field] = 0.82
  }

  if (!formData.vessel_name) warnings.push('Nome da embarcacao precisa ser conferido antes de criar o relatorio.')
  if (!formData.port) warnings.push('Porto nao identificado pelo modelo salvo.')
  if (!formData.survey_date) warnings.push('Data da vistoria nao identificada pelo modelo salvo.')

  return {
    source_type: 'saved_template',
    confidence_score: Math.max(55, Math.round(Object.values(fieldConfidence).reduce((sum, value) => sum + value, 0) / Math.max(1, Object.keys(fieldConfidence).length) * 100)),
    form_data: formData as Partial<SurveyFormData>,
    field_confidence: fieldConfidence,
    warnings,
    template_candidate: {
      signature: snapshot.signature,
      template_id: template.id,
      template_name: template.name || 'Modelo aprovado',
      mapping,
    },
    file_name: fileName,
  }
}

function sanitizeAiFormData(result: AiImportResult) {
  const formData: Record<string, unknown> = {}
  const warnings = [...(Array.isArray(result.warnings) ? result.warnings : [])]
  const confidence: Record<string, number> = {}
  const sources: Record<string, CellSource> = {}

  for (const item of result.fields || []) {
    const field = item.field
    const value = item.value
    const fieldScore = Number(item.confidence ?? 0)
    confidence[field] = Number.isFinite(fieldScore) ? fieldScore : 0
    if (fieldScore < 0.72) {
      warnings.push(`Campo "${field}" ficou em branco por baixa confianca no mapeamento.`)
      continue
    }
    if (value === null || value === undefined || value === '') continue
    formData[field] = value
    if (item.source.sheet && item.source.row && item.source.col) {
      sources[field] = { sheet: item.source.sheet, row: item.source.row, col: item.source.col }
    }
  }

  const vesselTanks = (result.vessel_tanks_open || [])
    .filter((item) => Number(item.confidence ?? 0) >= 0.74 && item.tank_name)
    .map((item) => calcTankRow({
      tank_name: item.tank_name,
      grade: normalizeSurveyGrade(item.grade || ''),
      sounding_type: item.sounding_type === 'S' ? 'S' : 'U',
      sounding_value: Number(item.sounding_value) || 0,
      deg: Number(item.deg) || 0,
      total_vol_observed: Number(item.total_vol_observed) || 0,
      free_water_dip: item.free_water_dip || 'Nil',
      free_water_vol: Number(item.free_water_vol) || 0,
      vcf_tab_54b: Number(item.vcf_tab_54b) || 0,
      density_sg: Number(item.density_sg) || 0,
    }))

  if (vesselTanks.length > 0) {
    formData.vessel_tanks_open = vesselTanks
    confidence.vessel_tanks_open = Math.min(0.9, vesselTanks.length / Math.max(1, (result.vessel_tanks_open || []).length))
  }

  if (!formData.vessel_name) warnings.push('Nome da embarcacao nao foi identificado com confianca.')
  if (!formData.port) warnings.push('Porto nao foi identificado com confianca.')
  if (!formData.survey_date) warnings.push('Data da vistoria nao foi identificada com confianca.')
  if ((result.vessel_tanks_open || []).length > 0 && vesselTanks.length === 0) {
    warnings.push('Tabela de tanques foi encontrada, mas ficou em branco por baixa confianca.')
  }

  return { formData, confidence, warnings, sources }
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const maybe = payload as { output_text?: unknown; output?: unknown }
  if (typeof maybe.output_text === 'string') return maybe.output_text
  if (!Array.isArray(maybe.output)) return ''

  return maybe.output
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const content = (item as { content?: unknown }).content
      return Array.isArray(content) ? content : []
    })
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      const text = (part as { text?: unknown }).text
      return typeof text === 'string' ? text : ''
    })
    .join('')
}

export async function previewFromAiMapping(snapshot: WorkbookSnapshot, fileName: string): Promise<ImportPreview> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('A importacao flexivel por IA esta indisponivel porque OPENAI_API_KEY nao foi configurada.')
  }

  const model = process.env.OPENAI_IMPORT_MODEL || process.env.OPENAI_AUDIT_MODEL || 'gpt-5-mini'
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'Voce mapeia planilhas XLSX de bunker/ROB/sludge survey para JSON. Leia todas as abas disponiveis no snapshot, usando pares label/valor, linhas compactas e regioes de tabela. Use apenas evidencias do snapshot. Nao invente valores. Campos incertos devem ter confianca baixa e podem ficar vazios. Responda em JSON estruturado.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                target_fields: Array.from(SCALAR_FIELDS),
                instructions: [
                  'Mapeie dados equivalentes ao SurveyFormData do sistema NAABSA.',
                  'Procure informacoes equivalentes mesmo quando os nomes forem diferentes: vessel/ship/vsl/navio, port/local/terminal, date/survey date, survey ref/ref number/job number, ROB, BDN, logbook, final figure, surveyor figure.',
                  'Nao envie emails, telefones ou contatos pessoais desnecessarios.',
                  'Inclua source para indicar a celula de origem quando existir.',
                  'Deixe campos de baixa confianca fora de form_data ou com confianca menor que 0.72.',
                  'Extraia vessel_tanks_open somente quando houver uma tabela clara de tanques com tank/grade/sounding/temperature/volume/density. Se a tabela for ambigua, deixe vazia e explique em warnings.',
                  'Para datas, normalize como YYYY-MM-DD quando a evidencia for clara.',
                  'Para quantidades finais, prefira MT e sinalize em warnings se a unidade nao estiver clara.',
                ],
                workbook_snapshot: {
                  signature: snapshot.signature,
                  sheets: snapshot.sheets,
                  relevant_cells: snapshot.relevant_cells,
                  all_cells_sample: snapshot.cells.slice(0, 650),
                  sheet_summaries: snapshot.sheet_summaries,
                },
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'xlsx_import_mapping',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['confidence_score', 'fields', 'vessel_tanks_open', 'warnings'],
            properties: {
              confidence_score: { type: 'integer', minimum: 0, maximum: 100 },
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['field', 'value', 'confidence', 'source'],
                  properties: {
                    field: { type: 'string', enum: Array.from(SCALAR_FIELDS) },
                    value: {
                      anyOf: [
                        { type: 'string' },
                        { type: 'number' },
                        { type: 'boolean' },
                        { type: 'null' },
                      ],
                    },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    source: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['sheet', 'row', 'col'],
                      properties: {
                        sheet: { type: ['string', 'null'] },
                        row: { type: ['integer', 'null'] },
                        col: { type: ['integer', 'null'] },
                      },
                    },
                  },
                },
              },
              vessel_tanks_open: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'tank_name',
                    'grade',
                    'sounding_type',
                    'sounding_value',
                    'deg',
                    'total_vol_observed',
                    'free_water_dip',
                    'free_water_vol',
                    'vcf_tab_54b',
                    'density_sg',
                    'confidence',
                    'source',
                  ],
                  properties: {
                    tank_name: { type: 'string' },
                    grade: { type: ['string', 'null'] },
                    sounding_type: { type: ['string', 'null'], enum: ['U', 'S', null] },
                    sounding_value: { type: ['number', 'null'] },
                    deg: { type: ['number', 'null'] },
                    total_vol_observed: { type: ['number', 'null'] },
                    free_water_dip: { type: ['string', 'null'] },
                    free_water_vol: { type: ['number', 'null'] },
                    vcf_tab_54b: { type: ['number', 'null'] },
                    density_sg: { type: ['number', 'null'] },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    source: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['sheet', 'row'],
                      properties: {
                        sheet: { type: ['string', 'null'] },
                        row: { type: ['integer', 'null'] },
                      },
                    },
                  },
                },
              },
              warnings: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Falha ao mapear planilha com IA: ${text}`)
  }

  const raw = await response.json()
  const outputText = extractOutputText(raw)
  const result = JSON.parse(outputText) as AiImportResult
  const sanitized = sanitizeAiFormData(result)

  return {
    source_type: 'ai_mapping',
    confidence_score: Math.max(0, Math.min(100, Number(result.confidence_score) || 0)),
    form_data: sanitized.formData as Partial<SurveyFormData>,
      field_confidence: sanitized.confidence,
      warnings: sanitized.warnings,
      template_candidate: {
        signature: snapshot.signature,
        template_name: `IA: ${fileName}`,
        mapping: sanitized.sources,
      },
    file_name: fileName,
  }
}

export function ensureReportIdentity(preview: ImportPreview) {
  const formData = { ...preview.form_data }
  const vesselName = String(formData.vessel_name || '').trim() || 'Imported Vessel'
  const refNumber = String(formData.ref_number || '').trim() || generatedImportRef(vesselName)

  formData.vessel_name = vesselName
  formData.ref_number = refNumber
  formData.port = String(formData.port || '').trim()

  return {
    formData,
    vesselName,
    refNumber,
    port: formData.port,
  }
}

function generatedImportRef(vesselName: string) {
  const compactName = vesselName.replace(/[^a-z0-9]+/gi, '').slice(0, 8).toUpperCase() || 'IMPORT'
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12)
  return `BQS-${compactName}-${stamp}`
}
