-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601010000_profiles.sql
-- Tabla profiles (1:1 con auth.users) + función is_admin() para RLS
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  email      text,
  phone      text,
  role       public.user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SECURITY DEFINER: se ejecuta como owner (postgres), bypasea RLS en profiles.
-- Necesario para que los predicados de otras tablas puedan consultar el rol
-- sin causar recursión infinita en las políticas de profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
