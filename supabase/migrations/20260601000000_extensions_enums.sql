-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601000000_extensions_enums.sql
-- Extensiones PostgreSQL + todos los custom ENUMs + función set_updated_at
-- ──────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ── Función reutilizable para updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── ENUMs ─────────────────────────────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'vendor');

CREATE TYPE public.attr_type AS ENUM ('text', 'number', 'select', 'boolean');

CREATE TYPE public.coupon_type AS ENUM ('percentage', 'fixed');

CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

CREATE TYPE public.pay_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TYPE public.import_src AS ENUM ('csv_upload', 'api_feed');

CREATE TYPE public.import_st AS ENUM (
  'pending',
  'processing',
  'completed',
  'completed_with_errors',
  'failed'
);

CREATE TYPE public.chat_role AS ENUM ('user', 'assistant', 'tool');
