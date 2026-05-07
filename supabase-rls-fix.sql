-- =========================================
-- NAABSA RLS fix
-- Run this in Supabase SQL Editor if login redirects to /login?error=profile
-- while the user exists in auth.users and public.profiles.
-- =========================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

CREATE POLICY "profiles_read" ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.current_user_role() = 'gestor'
  );

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (false);

CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR public.current_user_role() = 'gestor'
  );

DROP POLICY IF EXISTS "reports_select" ON public.bunker_reports;
DROP POLICY IF EXISTS "reports_insert" ON public.bunker_reports;
DROP POLICY IF EXISTS "reports_update" ON public.bunker_reports;
DROP POLICY IF EXISTS "reports_delete" ON public.bunker_reports;

CREATE POLICY "reports_select" ON public.bunker_reports FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR created_by = auth.uid()
    OR auth.uid() IN (
      SELECT collaborator_id FROM public.report_assignments WHERE report_id = bunker_reports.id
    )
  );

CREATE POLICY "reports_insert" ON public.bunker_reports FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('gestor', 'colaborador')
    AND created_by = auth.uid()
  );

CREATE POLICY "reports_update" ON public.bunker_reports FOR UPDATE
  USING (
    public.current_user_role() = 'gestor'
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.current_user_role() = 'gestor'
    OR created_by = auth.uid()
  );

CREATE POLICY "reports_delete" ON public.bunker_reports FOR DELETE
  USING (public.current_user_role() = 'gestor');

DROP POLICY IF EXISTS "assignments_select" ON public.report_assignments;
DROP POLICY IF EXISTS "assignments_insert" ON public.report_assignments;

CREATE POLICY "assignments_select" ON public.report_assignments FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR collaborator_id = auth.uid()
  );

CREATE POLICY "assignments_insert" ON public.report_assignments FOR INSERT
  WITH CHECK (public.current_user_role() = 'gestor');

DROP POLICY IF EXISTS "comments_select" ON public.report_comments;
DROP POLICY IF EXISTS "comments_insert" ON public.report_comments;

CREATE POLICY "comments_select" ON public.report_comments FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR auth.uid() IN (
      SELECT collaborator_id FROM public.report_assignments WHERE report_id = report_comments.report_id
    )
    OR auth.uid() IN (
      SELECT created_by FROM public.bunker_reports WHERE id = report_comments.report_id
    )
  );

CREATE POLICY "comments_insert" ON public.report_comments FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  WITH CHECK (false);

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_log_select" ON public.report_activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON public.report_activity_log;

CREATE POLICY "activity_log_select" ON public.report_activity_log FOR SELECT
  USING (public.current_user_role() = 'gestor');

CREATE POLICY "activity_log_insert" ON public.report_activity_log FOR INSERT
  WITH CHECK (false);

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

CREATE TABLE IF NOT EXISTS public.report_ai_finding_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id      UUID NOT NULL REFERENCES public.report_ai_audits(id) ON DELETE CASCADE,
  finding_key   TEXT NOT NULL,
  reviewed_by   UUID REFERENCES public.profiles(id),
  review_note   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (audit_id, finding_key)
);

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

CREATE TABLE IF NOT EXISTS public.report_ai_audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID NOT NULL REFERENCES public.bunker_reports(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id),
  model           TEXT NOT NULL,
  input_hash      TEXT NOT NULL,
  readiness_score INTEGER NOT NULL CHECK (readiness_score BETWEEN 0 AND 100),
  can_finalize    BOOLEAN NOT NULL DEFAULT FALSE,
  summary         TEXT NOT NULL,
  findings        JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_ai_audits_report_created_idx
  ON public.report_ai_audits (report_id, created_at DESC);

ALTER TABLE public.report_ai_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_audits_select" ON public.report_ai_audits;
DROP POLICY IF EXISTS "ai_audits_insert" ON public.report_ai_audits;

CREATE POLICY "ai_audits_select" ON public.report_ai_audits FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR auth.uid() IN (
      SELECT created_by FROM public.bunker_reports WHERE id = report_ai_audits.report_id
    )
    OR auth.uid() IN (
      SELECT collaborator_id FROM public.report_assignments WHERE report_id = report_ai_audits.report_id
    )
  );

CREATE POLICY "ai_audits_insert" ON public.report_ai_audits FOR INSERT
  WITH CHECK (false);
