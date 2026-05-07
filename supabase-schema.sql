-- =========================================
-- NAABSA Bunker Survey System — Schema SQL
-- Execute este script no Supabase SQL Editor
-- =========================================

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('gestor', 'colaborador')),
  is_active     BOOLEAN DEFAULT TRUE,
  must_change_password BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_seen_at  TIMESTAMPTZ
);

-- REPORTS
CREATE TABLE IF NOT EXISTS bunker_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID REFERENCES profiles(id),
  ref_number        TEXT NOT NULL,
  vessel_name       TEXT NOT NULL,
  port              TEXT,
  status            TEXT DEFAULT 'draft' CHECK (status IN (
                      'draft','in_progress','pending_review',
                      'revision_requested','approved','archived'
                    )),
  form_data         JSONB DEFAULT '{}',
  last_activity_at  TIMESTAMPTZ DEFAULT now(),
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES profiles(id),
  import_source_type TEXT CHECK (
                      import_source_type IS NULL OR import_source_type IN (
                        'bqs_template','saved_template','ai_mapping'
                      )
                    ),
  import_confidence_score INTEGER CHECK (
                      import_confidence_score IS NULL OR import_confidence_score BETWEEN 0 AND 100
                    ),
  imported_file_name TEXT
);

-- Trigger: atualiza updated_at e last_activity_at automaticamente
CREATE OR REPLACE FUNCTION update_report_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_updated ON bunker_reports;
CREATE TRIGGER reports_updated
  BEFORE UPDATE ON bunker_reports
  FOR EACH ROW EXECUTE FUNCTION update_report_timestamps();

-- ATRIBUIÇÕES
CREATE TABLE IF NOT EXISTS report_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id        UUID REFERENCES bunker_reports(id) ON DELETE CASCADE,
  collaborator_id  UUID REFERENCES profiles(id),
  sections         TEXT[] NOT NULL,
  assigned_at      TIMESTAMPTZ DEFAULT now(),
  assigned_by      UUID REFERENCES profiles(id),
  UNIQUE(report_id, collaborator_id)
);

-- COMENTÁRIOS / PEDIDOS DE REVISÃO
CREATE TABLE IF NOT EXISTS report_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID REFERENCES bunker_reports(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id),
  section     TEXT,
  message     TEXT NOT NULL,
  type        TEXT DEFAULT 'revision_request'
                CHECK (type IN ('revision_request','comment','resolved')),
  resolved    BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  reopened_at TIMESTAMPTZ,
  corrected_at TIMESTAMPTZ,
  corrected_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- NOTIFICAÇÕES IN-APP
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  report_id   UUID REFERENCES bunker_reports(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'revision_requested','report_approved',
                'assignment','reminder','submitted_for_review'
              )),
  message     TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS report_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID REFERENCES bunker_reports(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  section     TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- GPT AUDIT LOG
CREATE TABLE IF NOT EXISTS report_ai_audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID NOT NULL REFERENCES bunker_reports(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id),
  model           TEXT NOT NULL,
  input_hash      TEXT NOT NULL,
  readiness_score INTEGER NOT NULL CHECK (readiness_score BETWEEN 0 AND 100),
  can_finalize    BOOLEAN NOT NULL DEFAULT FALSE,
  summary         TEXT NOT NULL,
  findings        JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_ai_audits_report_created_idx
  ON report_ai_audits (report_id, created_at DESC);

-- FLEXIBLE SPREADSHEET IMPORT TEMPLATES
CREATE TABLE IF NOT EXISTS spreadsheet_import_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_signature   TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  mapping            JSONB NOT NULL DEFAULT '{}',
  sample_file_name   TEXT,
  confidence_score   INTEGER CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100),
  usage_count        INTEGER NOT NULL DEFAULT 1,
  created_by         UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  last_used_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS spreadsheet_import_templates_signature_idx
  ON spreadsheet_import_templates (source_signature);

-- IMPORT LOGS
CREATE TABLE IF NOT EXISTS report_import_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID REFERENCES bunker_reports(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES profiles(id),
  file_name         TEXT NOT NULL,
  source_type       TEXT CHECK (source_type IS NULL OR source_type IN ('bqs_template','saved_template','ai_mapping')),
  confidence_score  INTEGER CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100),
  warnings          JSONB NOT NULL DEFAULT '[]',
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_import_logs_created_idx
  ON report_import_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS report_import_logs_report_idx
  ON report_import_logs (report_id);

-- AI FINDING HUMAN REVIEWS
CREATE TABLE IF NOT EXISTS report_ai_finding_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id      UUID NOT NULL REFERENCES report_ai_audits(id) ON DELETE CASCADE,
  finding_key   TEXT NOT NULL,
  reviewed_by   UUID REFERENCES profiles(id),
  review_note   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (audit_id, finding_key)
);

CREATE INDEX IF NOT EXISTS report_ai_finding_reviews_audit_idx
  ON report_ai_finding_reviews (audit_id);

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bunker_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_ai_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheet_import_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_ai_finding_reviews ENABLE ROW LEVEL SECURITY;

-- Helper sem recursao de RLS: policies nao devem consultar profiles diretamente.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Profiles: cada usuário vê o próprio perfil; gestores veem todos
CREATE POLICY "profiles_read" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.current_user_role() = 'gestor'
  );

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (false); -- controlado apenas pela API server-side

CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  USING (id = auth.uid() OR public.current_user_role() = 'gestor');

-- Reports: gestores veem tudo; colaboradores veem só os atribuídos
CREATE POLICY "reports_select" ON bunker_reports FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR created_by = auth.uid()
    OR auth.uid() IN (
      SELECT collaborator_id FROM report_assignments WHERE report_id = bunker_reports.id
    )
  );

CREATE POLICY "reports_insert" ON bunker_reports FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('gestor', 'colaborador')
    AND created_by = auth.uid()
  );

CREATE POLICY "reports_update" ON bunker_reports FOR UPDATE
  USING (public.current_user_role() = 'gestor' OR created_by = auth.uid())
  WITH CHECK (public.current_user_role() = 'gestor' OR created_by = auth.uid());

CREATE POLICY "reports_delete" ON bunker_reports FOR DELETE
  USING (public.current_user_role() = 'gestor');

-- Assignments: gestores veem tudo; colaboradores veem as próprias atribuições
CREATE POLICY "assignments_select" ON report_assignments FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR collaborator_id = auth.uid()
  );

CREATE POLICY "assignments_insert" ON report_assignments FOR INSERT
  WITH CHECK (public.current_user_role() = 'gestor');

-- Comments: gestores veem tudo; colaboradores veem comentários dos seus reports
CREATE POLICY "comments_select" ON report_comments FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR auth.uid() IN (
      SELECT collaborator_id FROM report_assignments WHERE report_id = report_comments.report_id
    )
    OR auth.uid() IN (
      SELECT created_by FROM bunker_reports WHERE id = report_comments.report_id
    )
  );

CREATE POLICY "comments_insert" ON report_comments FOR INSERT
  WITH CHECK (false);

-- Notificações: cada usuário só vê as próprias
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (false);

CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Activity log: apenas gestores leem; serviço insere
CREATE POLICY "activity_log_select" ON report_activity_log FOR SELECT
  USING (public.current_user_role() = 'gestor');

CREATE POLICY "activity_log_insert" ON report_activity_log FOR INSERT
  WITH CHECK (false);

-- AI audits: leitura para quem acessa o relatorio; insercao controlada pela API server-side
CREATE POLICY "ai_audits_select" ON report_ai_audits FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR auth.uid() IN (
      SELECT created_by FROM bunker_reports WHERE id = report_ai_audits.report_id
    )
    OR auth.uid() IN (
      SELECT collaborator_id FROM report_assignments WHERE report_id = report_ai_audits.report_id
    )
  );

CREATE POLICY "ai_audits_insert" ON report_ai_audits FOR INSERT
  WITH CHECK (false);

-- Spreadsheet import templates: leitura para gestor/criador; escrita controlada server-side
CREATE POLICY "spreadsheet_templates_select" ON spreadsheet_import_templates FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR created_by = auth.uid()
  );

CREATE POLICY "spreadsheet_templates_insert" ON spreadsheet_import_templates FOR INSERT
  WITH CHECK (false);

CREATE POLICY "spreadsheet_templates_update" ON spreadsheet_import_templates FOR UPDATE
  USING (false);

CREATE POLICY "report_import_logs_select" ON report_import_logs FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR user_id = auth.uid()
  );

CREATE POLICY "report_import_logs_insert" ON report_import_logs FOR INSERT
  WITH CHECK (false);

CREATE POLICY "ai_finding_reviews_select" ON report_ai_finding_reviews FOR SELECT
  USING (
    public.current_user_role() = 'gestor'
    OR auth.uid() IN (
      SELECT created_by FROM bunker_reports
      WHERE id = (
        SELECT report_id FROM report_ai_audits WHERE report_ai_audits.id = report_ai_finding_reviews.audit_id
      )
    )
    OR auth.uid() IN (
      SELECT collaborator_id FROM report_assignments
      WHERE report_id = (
        SELECT report_id FROM report_ai_audits WHERE report_ai_audits.id = report_ai_finding_reviews.audit_id
      )
    )
  );

CREATE POLICY "ai_finding_reviews_insert" ON report_ai_finding_reviews FOR INSERT
  WITH CHECK (false);

-- =========================================
-- STORAGE BUCKET
-- =========================================
-- Create the bucket (run once):
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('survey-photos', 'survey-photos', true, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for survey-photos bucket
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'survey-photos');

CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'survey-photos');

CREATE POLICY "storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (false);

-- =========================================
-- REALTIME — habilitar para notificações
-- =========================================
-- Execute pelo dashboard: Database > Replication
-- Habilitar: notifications (INSERT)
-- Ou via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =========================================
-- CRIAR PRIMEIRO USUÁRIO GESTOR (opcional)
-- =========================================
-- Crie o usuário via Supabase Auth > Users > New User
-- Depois execute:
-- INSERT INTO profiles (id, full_name, email, role)
-- VALUES ('<user-uuid>', 'Nome do Gestor', 'email@naabsa.com', 'gestor');
