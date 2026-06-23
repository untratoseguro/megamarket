-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601070000_import_jobs.sql
-- Import jobs: procesamiento asíncrono de CSV/feeds de productos
--
-- DISEÑO:
-- 1. El CSV/XLSX se sube a Supabase Storage (bucket privado), no a esta tabla.
-- 2. El endpoint devuelve job_id inmediatamente; el worker actualiza status.
-- 3. Validación de filas usa las mismas reglas Pydantic que el CRUD individual.
-- 4. Filas inválidas se registran en errors_json sin detener el batch.
-- 5. source='api_feed' para feeds automáticos futuros (mismo pipeline, trigger distinto).
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.import_jobs (
  id             uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id  uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  source         public.import_src NOT NULL,
  -- NULL para api_feed (no hay archivo subido por el usuario)
  filename       text,
  status         public.import_st NOT NULL DEFAULT 'pending',
  total_rows     integer,
  processed_rows integer         NOT NULL DEFAULT 0,
  success_count  integer         NOT NULL DEFAULT 0,
  error_count    integer         NOT NULL DEFAULT 0,
  -- Array de {row: N, field: "sku", error: "already exists"}
  errors_json    jsonb,
  created_at     timestamptz     NOT NULL DEFAULT now(),
  started_at     timestamptz,
  completed_at   timestamptz
);

CREATE INDEX idx_import_jobs_admin  ON public.import_jobs(admin_user_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
