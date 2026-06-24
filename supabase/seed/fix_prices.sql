-- fix_prices.sql
-- Actualiza precios de los 25 productos del seed a centavos de USD.
-- Aplicar en el SQL editor del dashboard de Supabase:
--   https://supabase.com/dashboard/project/cjymqadfiubmijrbvvym/sql/new
-- Idempotente: puede ejecutarse múltiples veces sin efecto secundario.

UPDATE public.products SET price =  129999, compare_at_price =  149999 WHERE id = '30000000-0000-0000-0000-000000000001'; -- Samsung Galaxy S24 Ultra  ($1,299.99 / $1,499.99)
UPDATE public.products SET price =  119999, compare_at_price =     NULL WHERE id = '30000000-0000-0000-0000-000000000002'; -- iPhone 15 Pro             ($1,199.99)
UPDATE public.products SET price =   59999, compare_at_price =    69999 WHERE id = '30000000-0000-0000-0000-000000000003'; -- Xiaomi 14 Pro             ($599.99  / $699.99)
UPDATE public.products SET price =   69999, compare_at_price =    79999 WHERE id = '30000000-0000-0000-0000-000000000004'; -- Google Pixel 8            ($699.99  / $799.99)
UPDATE public.products SET price =  179999, compare_at_price =     NULL WHERE id = '30000000-0000-0000-0000-000000000005'; -- MacBook Pro M3 14"        ($1,799.99)
UPDATE public.products SET price =  149999, compare_at_price =   169999 WHERE id = '30000000-0000-0000-0000-000000000006'; -- Dell XPS 15               ($1,499.99 / $1,699.99)
UPDATE public.products SET price =  139999, compare_at_price =   159999 WHERE id = '30000000-0000-0000-0000-000000000007'; -- Lenovo ThinkPad X1 Carbon ($1,399.99 / $1,599.99)
UPDATE public.products SET price =   32999, compare_at_price =    39999 WHERE id = '30000000-0000-0000-0000-000000000008'; -- Sony WH-1000XM5           ($329.99  / $399.99)
UPDATE public.products SET price =   24999, compare_at_price =     NULL WHERE id = '30000000-0000-0000-0000-000000000009'; -- AirPods Pro 2da Gen       ($249.99)
UPDATE public.products SET price =    2499, compare_at_price =     3499 WHERE id = '30000000-0000-0000-0000-000000000010'; -- Camiseta Polo Classic Fit ($24.99   / $34.99)
UPDATE public.products SET price =    3999, compare_at_price =     4999 WHERE id = '30000000-0000-0000-0000-000000000011'; -- Jeans Slim Fit Oscuro     ($39.99   / $49.99)
UPDATE public.products SET price =    5999, compare_at_price =     7999 WHERE id = '30000000-0000-0000-0000-000000000012'; -- Chaqueta Bomber Nylon     ($59.99   / $79.99)
UPDATE public.products SET price =    1999, compare_at_price =     2999 WHERE id = '30000000-0000-0000-0000-000000000013'; -- Blusa Floral Chifón       ($19.99   / $29.99)
UPDATE public.products SET price =    3499, compare_at_price =     4499 WHERE id = '30000000-0000-0000-0000-000000000014'; -- Vestido Casual Lino       ($34.99   / $44.99)
UPDATE public.products SET price =    2999, compare_at_price =     3999 WHERE id = '30000000-0000-0000-0000-000000000015'; -- Pantalón Palazzo Crepé    ($29.99   / $39.99)
UPDATE public.products SET price =   11999, compare_at_price =    14999 WHERE id = '30000000-0000-0000-0000-000000000016'; -- Nike Air Max 270          ($119.99  / $149.99)
UPDATE public.products SET price =    8999, compare_at_price =     NULL WHERE id = '30000000-0000-0000-0000-000000000017'; -- Adidas Stan Smith Classic  ($89.99)
UPDATE public.products SET price =   69999, compare_at_price =    84999 WHERE id = '30000000-0000-0000-0000-000000000018'; -- Sofá Sectorial L 3 Módulos ($699.99 / $849.99)
UPDATE public.products SET price =   39999, compare_at_price =    49999 WHERE id = '30000000-0000-0000-0000-000000000019'; -- Mesa Centro Mármol Carrara ($399.99 / $499.99)
UPDATE public.products SET price =   49999, compare_at_price =    59999 WHERE id = '30000000-0000-0000-0000-000000000020'; -- Lavadora Samsung 15 kg    ($499.99  / $599.99)
UPDATE public.products SET price =   89999, compare_at_price =   109999 WHERE id = '30000000-0000-0000-0000-000000000021'; -- Nevera LG French Door 700L ($899.99 / $1,099.99)
UPDATE public.products SET price =   14999, compare_at_price =    19999 WHERE id = '30000000-0000-0000-0000-000000000022'; -- Mancuernas Ajustables     ($149.99  / $199.99)
UPDATE public.products SET price =   29999, compare_at_price =    39999 WHERE id = '30000000-0000-0000-0000-000000000023'; -- Bicicleta Estática Pro X3 ($299.99  / $399.99)
UPDATE public.products SET price =    8999, compare_at_price =    11999 WHERE id = '30000000-0000-0000-0000-000000000024'; -- Carpa Camping Dome 4P     ($89.99   / $119.99)
UPDATE public.products SET price =    2499, compare_at_price =     3499 WHERE id = '30000000-0000-0000-0000-000000000025'; -- Sérum Vitamina C 30ml     ($24.99   / $34.99)

-- Cupones: valor fijo y mínimo de compra también en centavos
UPDATE public.coupons SET value =  500, min_purchase =  3000 WHERE code = 'PROMO50K'; -- $5.00 off, mín $30.00
UPDATE public.coupons SET               min_purchase =  5000 WHERE code = 'SUPER25';  -- 25% off, mín $50.00

-- Verificación rápida
SELECT id, title,
       price / 100.0        AS price_usd,
       compare_at_price / 100.0 AS compare_usd
FROM   public.products
ORDER  BY price DESC
LIMIT  5;
