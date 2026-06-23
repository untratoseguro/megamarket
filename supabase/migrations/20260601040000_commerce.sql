-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601040000_commerce.sql
-- Coupons → Carts → Orders → Payments (orden correcto de dependencias FK)
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Cupones ───────────────────────────────────────────────────────────────────
-- Creados antes de orders porque orders.coupon_id referencia esta tabla.

CREATE TABLE public.coupons (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text         NOT NULL UNIQUE,
  type         public.coupon_type NOT NULL,
  value        numeric(12,2) NOT NULL,
  min_purchase numeric(12,2) NOT NULL DEFAULT 0,
  max_uses     integer,                  -- NULL = usos ilimitados
  uses_count   integer      NOT NULL DEFAULT 0,
  is_active    boolean      NOT NULL DEFAULT true,
  expires_at   timestamptz,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ── Carritos ──────────────────────────────────────────────────────────────────

CREATE TABLE public.carts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cart_items (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id    uuid    NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid    REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity   integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_cart ON public.cart_items(cart_id);

ALTER TABLE public.carts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- ── Órdenes ───────────────────────────────────────────────────────────────────

CREATE TABLE public.orders (
  id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status                public.order_status NOT NULL DEFAULT 'pending',
  subtotal              numeric(12,2) NOT NULL,
  discount_total        numeric(12,2) NOT NULL DEFAULT 0,
  shipping_total        numeric(12,2) NOT NULL DEFAULT 0,
  total                 numeric(12,2) NOT NULL,
  coupon_id             uuid         REFERENCES public.coupons(id) ON DELETE SET NULL,
  shipping_address_json jsonb,
  notes                 text,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user   ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid         NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id            uuid         NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id            uuid         REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity              integer      NOT NULL CHECK (quantity > 0),
  unit_price            numeric(12,2) NOT NULL,
  total_price           numeric(12,2) NOT NULL,
  -- Snapshot del producto en el momento de la compra (precio, título, SKU)
  product_snapshot_json jsonb        NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ── Pagos ─────────────────────────────────────────────────────────────────────

CREATE TABLE public.payments (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid         NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider            text         NOT NULL,              -- 'wompi', 'stripe', etc.
  provider_payment_id text,
  status              public.pay_status NOT NULL DEFAULT 'pending',
  amount              numeric(12,2) NOT NULL,
  currency            text         NOT NULL DEFAULT 'COP',
  metadata_json       jsonb,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order ON public.payments(order_id);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payment_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   uuid        NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  provider     text        NOT NULL,
  event_id     text        NOT NULL,
  event_type   text        NOT NULL,
  payload_json jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  -- Unicidad (provider, event_id) garantiza idempotencia de webhooks
  UNIQUE (provider, event_id)
);

CREATE INDEX idx_payment_events_payment ON public.payment_events(payment_id);

ALTER TABLE public.payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
