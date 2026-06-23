-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601030000_products.sql
-- Productos + variantes
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.products (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text         NOT NULL,
  slug              text         NOT NULL UNIQUE,
  sku               text         NOT NULL UNIQUE,
  brand             text,
  short_description text,
  long_description  text,
  price             numeric(12,2) NOT NULL,
  compare_at_price  numeric(12,2),
  stock_quantity    integer      NOT NULL DEFAULT 0,
  rating            numeric(3,2) NOT NULL DEFAULT 0,
  review_count      integer      NOT NULL DEFAULT 0,
  -- Categoría única (no many-to-many). Movido a NULL si la categoría se elimina.
  category_id       uuid         REFERENCES public.categories(id) ON DELETE SET NULL,
  -- Valores de atributos filtrables. El API valida contra category_attributes
  -- antes de persistir.
  attributes_json   jsonb        NOT NULL DEFAULT '{}',
  is_featured       boolean      NOT NULL DEFAULT false,
  is_active         boolean      NOT NULL DEFAULT true,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category   ON public.products(category_id);
CREATE INDEX idx_products_slug       ON public.products(slug);
CREATE INDEX idx_products_sku        ON public.products(sku);
CREATE INDEX idx_products_active     ON public.products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_featured   ON public.products(is_featured) WHERE is_featured = true;
-- Índice GIN para filtrado eficiente por atributos JSON
CREATE INDEX idx_products_attributes ON public.products USING GIN (attributes_json);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Variantes ─────────────────────────────────────────────────────────────────

CREATE TABLE public.product_variants (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid         NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku             text         NOT NULL UNIQUE,
  -- Atributos específicos de la variante, ej: {"color":"Rojo","talla":"M"}
  attributes_json jsonb        NOT NULL DEFAULT '{}',
  price           numeric(12,2),          -- NULL = hereda precio del producto
  stock_quantity  integer      NOT NULL DEFAULT 0,
  image_url       text
);

CREATE INDEX idx_variants_product ON public.product_variants(product_id);

ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
