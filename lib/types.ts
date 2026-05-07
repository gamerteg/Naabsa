// lib/types.ts

export type Role = 'gestor' | 'colaborador'

export type ReportStatus =
  | 'draft'
  | 'in_progress'
  | 'pending_review'
  | 'revision_requested'
  | 'approved'
  | 'archived'

export type ImportSourceType = 'bqs_template' | 'saved_template' | 'ai_mapping'

export type StepId =
  | 'step1' | 'step2' | 'step3' | 'step4'
  | 'step5' | 'step6' | 'step7' | 'step8'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  is_active: boolean
  must_change_password?: boolean
  created_at: string
  last_seen_at?: string
}

export interface TankRow {
  id: string
  tank_name: string
  grade: 'VLSFO' | 'LSMGO' | 'HFO' | 'MDO'
  sounding_type: 'U' | 'S'
  sounding_value: number
  deg: number
  total_vol_observed: number
  free_water_dip: string
  free_water_vol: number
  gross_obs_vol: number
  vcf_tab_54b: number
  density_sg: number
  gross_std_vol: number
  in_vac: number
  in_air: number
}

export interface GravityRow {
  id: string
  temperature_c: number
  specific_gravity: number
}

export interface PhotoItem {
  id: string
  file?: File
  url?: string
  caption: string
  category: 'vessel_tanks' | 'barge_tanks' | 'sampling'
}

export interface AttachmentItem {
  label: string
  checked: boolean
}

export interface SurveyFormData {
  // Step 1
  ref_number: string
  vessel_name: string
  port: string
  survey_date: string
  cover_photo_url?: string

  // Step 2
  customer_company: string
  customer_contact: string
  surveyor_company: string
  surveyor_name: string
  supplier_company: string
  supplier_contact: string
  vessel_master: string
  vessel_chief_engineer: string

  // Step 3
  flag: string
  port_registry: string
  callsign: string
  imo_number: string
  vessel_type: string
  delivered_year: string
  loa: string
  background_text: string
  boarding_date: string
  boarding_time: string

  // Step 4 — Opening Vessel
  draft_fore_open: number
  draft_aft_open: number
  list_open: number
  trim_correction_applied: boolean
  sounding_date_open: string
  sounding_time_start_open: string
  sounding_time_end_open: string
  vessel_engineer_open: string
  vessel_tanks_open: TankRow[]
  logbook_figure: number
  naabsa_figure: number
  difference_open_vessel: number
  storage_tanks_temp_source: string
  service_settling_temp_source: string
  overflow_temp_source: string
  engine_room_temp: number
  sea_water_temp: number
  vessel_gravities_open: GravityRow[]

  // Step 5 — Opening Barge
  draft_fore_barge_open: number
  draft_aft_barge_open: number
  list_barge_open: number
  flowmeter_status_open: string
  barge_sounding_date: string
  barge_sounding_time_start: string
  barge_sounding_time_end: string
  barge_tanks_open: TankRow[]
  barge_inspector_figure_open: number
  surveyor_figure_barge_open: number
  difference_barge_open: number
  barge_temp_method: string
  barge_gravities_open: GravityRow[]

  // Step 6 — Closing
  draft_fore_close: number
  draft_aft_close: number
  list_close: number
  closing_date: string
  closing_time_start: string
  closing_time_end: string
  vessel_tanks_close: TankRow[]
  initial_quantity: number
  final_quantity: number
  difference_vessel_closing: number
  closing_barge_date: string
  closing_barge_time_start: string
  closing_barge_time_end: string
  barge_tanks_close: TankRow[]
  barge_inspector_figure_close: number
  surveyor_figure_barge_close: number
  difference_barge_close: number
  flowmeter_close: string

  // Step 7 — Final Figures (gestor only)
  bdn_figure: number
  surveyor_final_figure: number
  final_difference_mt: number
  final_difference_pct: number
  letter_of_protest: boolean
  protest_description: string
  second_sounding_done: boolean
  second_sounding_date: string
  second_sounding_time_range: string
  rob_after_bunkering: number
  rob_trim: number

  // Step 8 — Photos & Attachments
  photos: PhotoItem[]
  attachments: AttachmentItem[]
}

export interface BunkerReport {
  id: string
  created_at: string
  updated_at: string
  created_by: string
  ref_number: string
  vessel_name: string
  port: string
  status: ReportStatus
  form_data: Partial<SurveyFormData>
  last_activity_at: string
  approved_at?: string
  approved_by?: string
  import_source_type?: ImportSourceType
  import_confidence_score?: number
  imported_file_name?: string
  // joins
  creator?: Profile
  approver?: Profile
  assignments?: ReportAssignment[]
}

export interface ReportAssignment {
  id: string
  report_id: string
  collaborator_id: string
  sections: StepId[]
  assigned_at: string
  assigned_by: string
  profiles?: Profile
}

export interface ReportComment {
  id: string
  report_id: string
  author_id: string
  section: StepId | null
  message: string
  type: 'revision_request' | 'comment' | 'resolved'
  resolved: boolean
  resolved_by?: string | null
  resolved_at?: string | null
  reopened_at?: string | null
  corrected_at?: string | null
  corrected_by?: string | null
  created_at: string
  author?: Profile
}

export interface ReportActivityLog {
  id: string
  report_id: string
  user_id: string | null
  action: string
  section?: StepId | null
  details?: Record<string, unknown> | null
  created_at: string
  user?: Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>
}

export interface AppNotification {
  id: string
  user_id: string
  report_id: string
  type: 'revision_requested' | 'report_approved' | 'assignment' | 'reminder' | 'submitted_for_review'
  message: string
  read: boolean
  created_at: string
  report?: BunkerReport
}

export const STEP_LABELS: Record<StepId, string> = {
  step1: 'Dados gerais',
  step2: 'Contatos',
  step3: 'Dados da embarcacao',
  step4: 'Abertura do navio',
  step5: 'Abertura da barcaca',
  step6: 'Fechamento',
  step7: 'Resultado final',
  step8: 'Fotos e anexos',
}

export interface ReportAiAudit {
  id: string
  report_id: string
  user_id: string
  model: string
  input_hash: string
  readiness_score: number
  can_finalize: boolean
  summary: string
  findings: import('@/lib/ai/report-audit').AuditFinding[]
  reviews?: ReportAiFindingReview[]
  created_at: string
}

export interface ReportAiFindingReview {
  id: string
  audit_id: string
  finding_key: string
  reviewed_by: string
  review_note?: string
  created_at: string
}

export interface ReportImportLog {
  id: string
  report_id?: string | null
  user_id?: string | null
  file_name: string
  source_type?: ImportSourceType | null
  confidence_score?: number | null
  warnings: string[]
  error_message?: string | null
  created_at: string
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  draft: 'Revisar dados',
  in_progress: 'Em revisao',
  pending_review: 'Pronto para finalizar',
  revision_requested: 'Correcao solicitada',
  approved: 'Finalizado',
  archived: 'Arquivado',
}

export const DEFAULT_ATTACHMENTS: AttachmentItem[] = [
  { label: 'Bunker Quantity Survey Report issued by undersigned surveyor', checked: false },
  { label: 'Bunker Delivery Note (BDN) issued by Petrobras', checked: false },
  { label: 'Barge Tank Measurement (BTM) issued by Petrobras', checked: false },
  { label: 'Letter of Protest issued by vessel', checked: false },
  { label: 'Letter of Protest issued by Naabsa', checked: false },
]
