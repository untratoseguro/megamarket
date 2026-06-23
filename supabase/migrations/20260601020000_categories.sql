-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601020000_categories.sql
-- Categorías (self-referencing, jerarquía ilimitada) + atributos por categoría
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.categories (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid    REFERENCES public.categories(id) ON DELETE SET NULL,
  name        text    NOT NULL,
  slug        text    NOT NULL UNIQUE,
  description text,
  image_url   text,
  icon        text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_slug   ON public.categories(slug);
CREATE INDEX idx_categories_active ON public.categories(is_active) WHERE is_active = true;

-- Esquema de atributos por categoría (no almacena valores, define el SCHEMA).
-- Los valores reales van en products.attributes_json y se validan en API
-- contra esta tabla.
CREATE TABLE public.category_attributes (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid    NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name          text    NOT NULL,
  type          public.attr_type NOT NULL,
  options_json  jsonb,    -- solo para type='select', ej: ["Rojo","Azul","Negro"]
  is_filterable boolean NOT NULL DEFAULT false,
  is_required   boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_cat_attrs_category ON public.category_attributes(category_id);

ALTER TABLE public.categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;
