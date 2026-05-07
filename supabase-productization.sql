-- =========================================
-- NAABSA productization phase 1
-- Import logs and AI finding human reviews.
-- =========================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

ALTER TABLE public.report_comments
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS corrected_by UUID REFERENCES public.profiles(id);

CREATE TABLE IF NOT EXISTS public.report_import_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID REFERENCES public.bunker_reports(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES public.profiles(id),
  file_name         TEXT NOT NULL,
  source_type       TEXT CHECK (
    source_type IS NULL OR source_type IN ('bqs_template', 'saved_template', 'ai_mapping')
  ),
  confidence_score  INTEGER CHECK (
    confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100
  ),
  warnings          JSONB NOT NULL DEFAULT '[]',
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_import_logs_created_idx
  ON public.report_import_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS report_import_logs_report_idx
  ON public.report_import_logs (report_id);

CREATE TABLE IF NOT EXISTS public.report_ai_finding_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id      UUID NOT NULL REFERENCES public.report_ai_audits(id) ON DELETE CASCADE,
  finding_key   TEXT NOT NULL,
  reviewed_by   UUID REFERENCES public.profiles(id),
  review_note   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (audit_id, finding_key)
);

CREATE INDEX IF NOT EXISTS report_ai_finding_reviews_audit_idx
  ON public.report_ai_finding_reviews (audit_id);

ALTER TABLE public.report_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_ai_finding_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_import_logs_select" ON public.report_import_logs;
DROP POLICY IF EXISTS "report_import_logs_insert" ON public.report_import_logs;
DROP POLICY IF EXISTS "ai_finding_reviews_select" ON public.report_ai_finding_reviews;
DROP POLICY IF EXISTS "ai_finding_reviews_insert" ON public.report_ai_finding_reviews;

CREATE POLICY "report_import_logs_select" ON public.report_import_logs FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR user_id = auth.uid()
  );

CREATE POLICY "report_import_logs_insert" ON public.report_import_logs FOR INSERT
  WITH CHECK (false);

CREATE POLICY "ai_finding_reviews_select" ON public.report_ai_finding_reviews FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR auth.uid() IN (
      SELECT created_by
      FROM public.bunker_reports
      WHERE id = (
        SELECT report_id
        FROM public.report_ai_audits
        WHERE report_ai_audits.id = report_ai_finding_reviews.audit_id
      )
    )
    OR auth.uid() IN (
      SELECT collaborator_id
      FROM public.report_assignments
      WHERE report_id = (
        SELECT report_id
        FROM public.report_ai_audits
        WHERE report_ai_audits.id = report_ai_finding_reviews.audit_id
      )
    )
  );

CREATE POLICY "ai_finding_reviews_insert" ON public.report_ai_finding_reviews FOR INSERT
  WITH CHECK (false);
