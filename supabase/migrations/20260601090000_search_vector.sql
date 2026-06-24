-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601090000_search_vector.sql
-- Full-text search con tsvector en products
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Columna search_vector
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Función que construye el tsvector desde los campos de texto relevantes
CREATE OR REPLACE FUNCTION public.products_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'spanish',
    coalesce(NEW.title, '')             || ' ' ||
    coalesce(NEW.brand, '')             || ' ' ||
    coalesce(NEW.short_description, '') || ' ' ||
    coalesce(NEW.long_description, '')
  );
  RETURN NEW;
END;
$$;

-- 3. Trigger: recalcula search_vector en INSERT y en UPDATE de campos relevantes
CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF title, brand, short_description, long_description
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_search_vector_update();

-- 4. Poblar search_vector en las filas ya existentes (seed aplicado antes de esta migración)
UPDATE public.products
SET search_vector = to_tsvector(
  'spanish',
  coalesce(title, '')             || ' ' ||
  coalesce(brand, '')             || ' ' ||
  coalesce(short_description, '') || ' ' ||
  coalesce(long_description, '')
);

-- 5. Índice GIN para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON public.products USING GIN (search_vector);

-- 6. RPC: búsqueda full-text con filtros adicionales y ranking por relevancia (ts_rank)
--    Devuelve las mismas columnas que list_products + total_count para paginación.
CREATE OR REPLACE FUNCTION public.search_products(
  search_term   text,
  p_category_id uuid    DEFAULT NULL,
  p_is_featured boolean DEFAULT NULL,
  p_min_price   numeric DEFAULT NULL,
  p_max_price   numeric DEFAULT NULL,
  p_attrs       jsonb   DEFAULT NULL,
  p_limit       integer DEFAULT 20,
  p_offset      integer DEFAULT 0
)
RETURNS TABLE (
  id                uuid,
  title             text,
  slug              text,
  sku               text,
  brand             text,
  short_description text,
  price             numeric,
  compare_at_price  numeric,
  stock_quantity    integer,
  rating            numeric,
  review_count      integer,
  category_id       uuid,
  attributes_json   jsonb,
  is_featured       boolean,
  is_active         boolean,
  total_count       bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.slug,
    p.sku,
    p.brand,
    p.short_description,
    p.price,
    p.compare_at_price,
    p.stock_quantity,
    p.rating,
    p.review_count,
    p.category_id,
    p.attributes_json,
    p.is_featured,
    p.is_active,
    -- COUNT(*) OVER () se evalúa ANTES del LIMIT → total real de resultados
    COUNT(*) OVER ()::bigint AS total_count
  FROM public.products p
  WHERE
    p.is_active = true
    AND p.search_vector @@ plainto_tsquery('spanish', search_term)
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_is_featured IS NULL OR p.is_featured = p_is_featured)
    AND (p_min_price   IS NULL OR p.price >= p_min_price)
    AND (p_max_price   IS NULL OR p.price <= p_max_price)
    AND (p_attrs       IS NULL OR p.attributes_json @> p_attrs)
  ORDER BY
    ts_rank(p.search_vector, plainto_tsquery('spanish', search_term)) DESC,
    p.rating DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

-- Acceso desde roles anon y authenticated (catálogo público)
GRANT EXECUTE ON FUNCTION public.search_products TO anon, authenticated;
