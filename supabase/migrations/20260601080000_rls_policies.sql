-- ──────────────────────────────────────────────────────────────────────────────
-- 20260601080000_rls_policies.sql
-- Todas las políticas RLS del sistema
--
-- PRINCIPIOS:
-- · Las políticas son ADITIVAS (OR logic): cualquier política que retorne true
--   concede acceso para esa operación.
-- · service_role bypasea RLS completamente en Supabase → no se crean políticas
--   para operaciones que solo debe hacer el backend.
-- · is_admin() usa SECURITY DEFINER → no causa recursión en profiles.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Admin ve y edita todo. Usuario ve/edita solo su propio registro.
-- INSERT solo con auth.uid() = id (Supabase lo crea vía trigger de auth).

CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── categories ────────────────────────────────────────────────────────────────
-- Lectura pública (incluso anónimos). Escritura solo admin.

CREATE POLICY "categories_select_public"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "categories_write_admin"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── category_attributes ───────────────────────────────────────────────────────

CREATE POLICY "cat_attrs_select_public"
  ON public.category_attributes FOR SELECT
  USING (true);

CREATE POLICY "cat_attrs_write_admin"
  ON public.category_attributes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── products ──────────────────────────────────────────────────────────────────
-- Lectura pública solo para productos activos. Admin ve todos y escribe.

CREATE POLICY "products_select_active"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "products_admin_all"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── product_variants ──────────────────────────────────────────────────────────

CREATE POLICY "variants_select_public"
  ON public.product_variants FOR SELECT
  USING (true);

CREATE POLICY "variants_write_admin"
  ON public.product_variants FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── coupons ───────────────────────────────────────────────────────────────────
-- El cliente NUNCA consulta cupones directamente; el backend valida y aplica.

CREATE POLICY "coupons_admin_all"
  ON public.coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── carts ─────────────────────────────────────────────────────────────────────

CREATE POLICY "carts_own"
  ON public.carts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── cart_items ────────────────────────────────────────────────────────────────

CREATE POLICY "cart_items_own"
  ON public.cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE id = cart_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE id = cart_id AND user_id = auth.uid()
    )
  );

-- ── orders ────────────────────────────────────────────────────────────────────
-- Lectura: propio usuario + admin.
-- Escritura: SOLO service_role desde el backend (no se crean políticas INSERT/UPDATE/DELETE).

CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders_select_admin"
  ON public.orders FOR SELECT
  USING (public.is_admin());

-- ── order_items ───────────────────────────────────────────────────────────────

CREATE POLICY "order_items_select_own"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_select_admin"
  ON public.order_items FOR SELECT
  USING (public.is_admin());

-- ── payments ──────────────────────────────────────────────────────────────────
-- Sin políticas de cliente: solo service_role (bypasea RLS).

-- ── payment_events ────────────────────────────────────────────────────────────
-- Sin políticas de cliente: solo service_role.

-- ── reviews ───────────────────────────────────────────────────────────────────
-- Lectura pública solo para reviews aprobadas.
-- Usuario puede leer las suyas (incluso no aprobadas) e insertar/actualizar.
-- Admin gestiona todo.

CREATE POLICY "reviews_select_approved"
  ON public.reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "reviews_select_own"
  ON public.reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_admin_all"
  ON public.reviews FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── audit_logs ────────────────────────────────────────────────────────────────
-- Solo lectura admin. INSERT solo service_role.

CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- ── favorites ─────────────────────────────────────────────────────────────────

CREATE POLICY "favorites_own"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── chat_sessions ─────────────────────────────────────────────────────────────
-- Sesiones con user_id: el usuario autenticado puede ver solo las suyas.
-- Sesiones anónimas (user_id IS NULL): no accesibles desde el cliente.
-- Escritura: solo service_role.

CREATE POLICY "chat_sessions_select_own"
  ON public.chat_sessions FOR SELECT
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- ── chat_messages ─────────────────────────────────────────────────────────────
-- Solo lectura de mensajes de sesiones propias autenticadas.
-- Escritura: solo service_role.

CREATE POLICY "chat_messages_select_own"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id
        AND user_id IS NOT NULL
        AND user_id = auth.uid()
    )
  );

-- ── import_jobs ───────────────────────────────────────────────────────────────
-- Admin puede leer solo sus propios jobs.
-- Escritura (INSERT/UPDATE): solo service_role.

CREATE POLICY "import_jobs_select_admin_own"
  ON public.import_jobs FOR SELECT
  USING (public.is_admin() AND admin_user_id = auth.uid());
