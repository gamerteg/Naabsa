-- =========================================
-- NAABSA GPT audit storage
-- Run this in Supabase SQL Editor before enabling the GPT audit UI.
-- =========================================

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
