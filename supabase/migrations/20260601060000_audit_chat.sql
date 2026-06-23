-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601060000_audit_chat.sql
-- Audit logs (append-only) + Chat sessions + Chat messages
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Audit logs ────────────────────────────────────────────────────────────────
-- Tabla append-only: NUNCA se actualiza ni elimina desde la app.
-- Solo el service_role inserta. No se crean políticas INSERT/UPDATE/DELETE.

CREATE TABLE public.audit_logs (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action    text        NOT NULL,    -- 'create', 'update', 'delete', 'login', etc.
  entity    text        NOT NULL,    -- nombre de la tabla, ej: 'products'
  entity_id uuid        NOT NULL,
  diff_json jsonb,                   -- {before: {}, after: {}} para updates
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity  ON public.audit_logs(entity, entity_id);
CREATE INDEX idx_audit_actor   ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ── Chat ──────────────────────────────────────────────────────────────────────

CREATE TABLE public.chat_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = sesión anónima (Q&A de catálogo sin login)
  user_id         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_user ON public.chat_sessions(user_id);

CREATE TABLE public.chat_messages (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid            NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role            public.chat_role NOT NULL,
  content         text            NOT NULL,
  -- Auditoría de qué tools se invocaron y con qué args en respuestas assistant
  tool_calls_json jsonb,
  created_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
