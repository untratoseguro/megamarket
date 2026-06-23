-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601050000_reviews_favorites.sql
-- Reviews (1 por user×producto) + Favorites
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.reviews (
  id                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id              uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating               integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                text,
  content              text,
  is_verified_purchase boolean NOT NULL DEFAULT false,
  is_approved          boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX idx_reviews_product  ON public.reviews(product_id);
CREATE INDEX idx_reviews_user     ON public.reviews(user_id);
CREATE INDEX idx_reviews_approved ON public.reviews(is_approved) WHERE is_approved = true;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ── Favoritos ─────────────────────────────────────────────────────────────────

CREATE TABLE public.favorites (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_favorites_user    ON public.favorites(user_id);
CREATE INDEX idx_favorites_product ON public.favorites(product_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
