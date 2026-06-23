# RLS Policies Reference

Las políticas viven en:
`supabase/migrations/20260601080000_rls_policies.sql`

Esta carpeta es referencia documental. La fuente de verdad es la migración.

## Resumen por tabla

| Tabla              | SELECT                          | INSERT        | UPDATE        | DELETE        |
|--------------------|---------------------------------|---------------|---------------|---------------|
| profiles           | propio + admin                  | propio        | propio + admin| admin         |
| categories         | público (all)                   | admin         | admin         | admin         |
| category_attributes| público (all)                   | admin         | admin         | admin         |
| products           | activos (public) + admin        | admin         | admin         | admin         |
| product_variants   | público (all)                   | admin         | admin         | admin         |
| coupons            | admin                           | admin         | admin         | admin         |
| carts              | propio                          | propio        | propio        | propio        |
| cart_items         | propio (via cart)               | propio        | propio        | propio        |
| orders             | propio + admin                  | service_role  | service_role  | service_role  |
| order_items        | propio + admin                  | service_role  | service_role  | service_role  |
| payments           | service_role                    | service_role  | service_role  | service_role  |
| payment_events     | service_role                    | service_role  | service_role  | service_role  |
| reviews            | aprobadas (public) + propio     | propio        | propio        | admin         |
| audit_logs         | admin                           | service_role  | —             | —             |
| favorites          | propio                          | propio        | propio        | propio        |
| chat_sessions      | propio (si user_id no null)     | service_role  | service_role  | service_role  |
| chat_messages      | propio (via session autenticada)| service_role  | service_role  | service_role  |
| import_jobs        | admin (sus propios jobs)        | service_role  | service_role  | service_role  |

## Función auxiliar

`public.is_admin()` — SECURITY DEFINER, evita recursión en profiles.
Retorna `true` si el `auth.uid()` tiene `role = 'admin'` en profiles.
