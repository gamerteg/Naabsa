-- =========================================
-- NAABSA flexible XLSX import
-- Run this after supabase-schema.sql / existing production schema.
-- =========================================

ALTER TABLE public.bunker_reports
  ADD COLUMN IF NOT EXISTS import_source_type TEXT CHECK (
    import_source_type IS NULL OR import_source_type IN ('bqs_template', 'saved_template', 'ai_mapping')
  ),
  ADD COLUMN IF NOT EXISTS import_confidence_score INTEGER CHECK (
    import_confidence_score IS NULL OR import_confidence_score BETWEEN 0 AND 100
  ),
  ADD COLUMN IF NOT EXISTS imported_file_name TEXT;

CREATE TABLE IF NOT EXISTS public.spreadsheet_import_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_signature   TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  mapping            JSONB NOT NULL DEFAULT '{}',
  sample_file_name   TEXT,
  confidence_score   INTEGER CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100),
  usage_count        INTEGER NOT NULL DEFAULT 1,
  created_by         UUID REFERENCES public.profiles(id),
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  last_used_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS spreadsheet_import_templates_signature_idx
  ON public.spreadsheet_import_templates (source_signature);

ALTER TABLE public.spreadsheet_import_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spreadsheet_templates_select" ON public.spreadsheet_import_templates;
DROP POLICY IF EXISTS "spreadsheet_templates_insert" ON public.spreadsheet_import_templates;
DROP POLICY IF EXISTS "spreadsheet_templates_update" ON public.spreadsheet_import_templates;

CREATE POLICY "spreadsheet_templates_select" ON public.spreadsheet_import_templates FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR created_by = auth.uid()
  );

CREATE POLICY "spreadsheet_templates_insert" ON public.spreadsheet_import_templates FOR INSERT
  WITH CHECK (false);

CREATE POLICY "spreadsheet_templates_update" ON public.spreadsheet_import_templates FOR UPDATE
  USING (false);
