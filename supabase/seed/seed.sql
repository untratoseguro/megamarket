-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║            SEED DE DESARROLLO, NO PRODUCCIÓN                              ║
-- ║  UUIDs fijos para reproducibilidad en dev local y CI.                     ║
-- ║  Ejecutar: supabase db reset (aplica migraciones + seed automáticamente)  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ── CATEGORÍAS PRINCIPALES ────────────────────────────────────────────────────
-- UUID scheme: 10000000-0000-0000-0000-00000000000X (X = número de categoría principal)

INSERT INTO public.categories (id, parent_id, name, slug, description, icon, sort_order, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', NULL, 'Electrónica',       'electronica',       'Smartphones, laptops, audio y más',    '📱', 1, true),
  ('10000000-0000-0000-0000-000000000002', NULL, 'Ropa & Moda',       'ropa-moda',         'Moda para hombre, mujer y calzado',    '👗', 2, true),
  ('10000000-0000-0000-0000-000000000003', NULL, 'Hogar & Jardín',    'hogar-jardin',      'Muebles, electrodomésticos y deco',    '🏠', 3, true),
  ('10000000-0000-0000-0000-000000000004', NULL, 'Deportes & Fitness','deportes-fitness',  'Equipos, ropa deportiva y outdoor',    '🏋️', 4, true),
  ('10000000-0000-0000-0000-000000000005', NULL, 'Belleza & Salud',   'belleza-salud',     'Skincare, maquillaje y suplementos',   '💄', 5, true),
  ('10000000-0000-0000-0000-000000000006', NULL, 'Alimentos',         'alimentos',         'Orgánicos, bebidas y snacks',          '🥗', 6, true);

-- ── SUBCATEGORÍAS ─────────────────────────────────────────────────────────────
-- UUID scheme: 20000000-0000-0000-0000-0000000000XX (XX = índice subcategoría)

INSERT INTO public.categories (id, parent_id, name, slug, description, icon, sort_order, is_active) VALUES
  -- Electrónica (3 sub)
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Smartphones',           'smartphones',           'Celulares y accesorios',              '📱', 1, true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Laptops & Computadores','laptops-computadores',  'Portátiles y de escritorio',          '💻', 2, true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Audio & Sonido',        'audio-sonido',          'Audífonos, parlantes y más',          '🎧', 3, true),
  -- Ropa & Moda (3 sub)
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Ropa Hombre',           'ropa-hombre',           'Camisetas, pantalones, chaquetas',    '👔', 1, true),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Ropa Mujer',            'ropa-mujer',            'Blusas, vestidos, pantalones',        '👗', 2, true),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Calzado',               'calzado',               'Zapatos, tenis y botas',              '👟', 3, true),
  -- Hogar & Jardín (2 sub)
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'Muebles',               'muebles',               'Sofás, mesas, sillas y almacenaje',   '🛋️', 1, true),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', 'Electrodomésticos',     'electrodomesticos',     'Lavadoras, neveras, microondas',      '🍽️', 2, true),
  -- Deportes & Fitness (2 sub)
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000004', 'Equipos de Fitness',    'equipos-fitness',       'Mancuernas, bicicletas, máquinas',    '🏋️', 1, true),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000004', 'Deportes Outdoor',      'deportes-outdoor',      'Camping, ciclismo, senderismo',       '🏕️', 2, true),
  -- Belleza & Salud (2 sub)
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000005', 'Skincare',              'skincare',              'Limpiadores, serums, hidratantes',    '✨', 1, true),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000005', 'Maquillaje',            'maquillaje',            'Base, labial, sombras y más',         '💄', 2, true),
  -- Alimentos (2 sub)
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000006', 'Alimentos Orgánicos',   'alimentos-organicos',   'Productos certificados orgánicos',    '🥬', 1, true),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000006', 'Bebidas',               'bebidas',               'Jugos naturales, aguas, infusiones',  '🧃', 2, true);

-- ── CATEGORY ATTRIBUTES ───────────────────────────────────────────────────────
-- UUID scheme: 40000000-0000-0000-0000-0000000000XX

INSERT INTO public.category_attributes (id, category_id, name, type, options_json, is_filterable, is_required, sort_order) VALUES
  -- Smartphones
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'brand',       'text',   NULL,                                      true,  true,  1),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'os',          'select', '["Android","iOS","HarmonyOS"]',            true,  true,  2),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'ram_gb',      'number', NULL,                                      true,  false, 3),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'storage_gb',  'number', NULL,                                      true,  false, 4),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'color',       'text',   NULL,                                      false, false, 5),
  -- Laptops
  ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'brand',          'text',   NULL,                                   true,  true,  1),
  ('40000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'processor',      'text',   NULL,                                   true,  false, 2),
  ('40000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 'ram_gb',         'number', NULL,                                   true,  false, 3),
  ('40000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'storage_gb',     'number', NULL,                                   true,  false, 4),
  ('40000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'screen_inches',  'number', NULL,                                   true,  false, 5),
  -- Audio
  ('40000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000003', 'brand',         'text',   NULL,                                    true,  true,  1),
  ('40000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000003', 'connectivity',  'select', '["Bluetooth","Cable","Bluetooth+Cable"]', true,  false, 2),
  -- Ropa Hombre
  ('40000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000004', 'size',     'select', '["XS","S","M","L","XL","XXL"]',              true,  true,  1),
  ('40000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000004', 'color',    'text',   NULL,                                         false, false, 2),
  ('40000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000004', 'material', 'text',   NULL,                                         false, false, 3),
  -- Ropa Mujer
  ('40000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000005', 'size',     'select', '["XS","S","M","L","XL"]',                    true,  true,  1),
  ('40000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000005', 'color',    'text',   NULL,                                         false, false, 2),
  ('40000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000005', 'material', 'text',   NULL,                                         false, false, 3),
  -- Calzado
  ('40000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000006', 'shoe_size', 'number', NULL,                                        true,  true,  1),
  ('40000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000006', 'color',     'text',   NULL,                                        false, false, 2),
  ('40000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000006', 'gender',    'select', '["Hombre","Mujer","Unisex"]',                true,  false, 3),
  -- Electrodomésticos
  ('40000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000008', 'brand',        'text',   NULL,                                     true,  true,  1),
  ('40000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000008', 'power_watts',  'number', NULL,                                     false, false, 2),
  ('40000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000008', 'color_finish', 'select', '["Blanco","Negro","Plateado","Inox"]',    true,  false, 3);

-- ── PRODUCTOS (25 demo) ───────────────────────────────────────────────────────
-- UUID scheme: 30000000-0000-0000-0000-0000000000XX
-- attributes_json refleja exactamente los category_attributes definidos arriba.

INSERT INTO public.products
  (id, title, slug, sku, brand, short_description, price, compare_at_price, stock_quantity, category_id, attributes_json, is_featured, is_active)
VALUES
  -- ── Smartphones (4) ──────────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000001',
   'Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'SKU-SM-S24U',
   'Samsung', 'Pantalla 6.8" Dynamic AMOLED, cámara 200MP, S Pen incluido.',
   4500000, 5200000, 18, '20000000-0000-0000-0000-000000000001',
   '{"brand":"Samsung","os":"Android","ram_gb":12,"storage_gb":256,"color":"Phantom Black"}',
   true, true),

  ('30000000-0000-0000-0000-000000000002',
   'iPhone 15 Pro', 'iphone-15-pro', 'SKU-AP-IP15P',
   'Apple', 'Chip A17 Pro, cuerpo de titanio, cámara 48MP con zoom 5x.',
   5200000, NULL, 12, '20000000-0000-0000-0000-000000000001',
   '{"brand":"Apple","os":"iOS","ram_gb":8,"storage_gb":256,"color":"Natural Titanium"}',
   true, true),

  ('30000000-0000-0000-0000-000000000003',
   'Xiaomi 14 Pro', 'xiaomi-14-pro', 'SKU-XM-14P',
   'Xiaomi', 'Snapdragon 8 Gen 3, cámara Leica, carga 120W.',
   2800000, 3100000, 25, '20000000-0000-0000-0000-000000000001',
   '{"brand":"Xiaomi","os":"Android","ram_gb":16,"storage_gb":512,"color":"White"}',
   false, true),

  ('30000000-0000-0000-0000-000000000004',
   'Google Pixel 8', 'google-pixel-8', 'SKU-GO-PX8',
   'Google', 'Google Tensor G3, IA avanzada, 7 años de actualizaciones.',
   3100000, 3500000, 8, '20000000-0000-0000-0000-000000000001',
   '{"brand":"Google","os":"Android","ram_gb":8,"storage_gb":128,"color":"Obsidian"}',
   false, true),

  -- ── Laptops (3) ──────────────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000005',
   'MacBook Pro M3 14"', 'macbook-pro-m3-14', 'SKU-AP-MBP14',
   'Apple', 'Chip Apple M3 Pro, pantalla Liquid Retina XDR, batería 18h.',
   8900000, NULL, 6, '20000000-0000-0000-0000-000000000002',
   '{"brand":"Apple","processor":"Apple M3 Pro","ram_gb":18,"storage_gb":512,"screen_inches":14.2}',
   true, true),

  ('30000000-0000-0000-0000-000000000006',
   'Dell XPS 15', 'dell-xps-15', 'SKU-DL-XPS15',
   'Dell', 'Core i7-13700H, pantalla OLED 3.5K táctil, GPU RTX 4060.',
   7200000, 7900000, 4, '20000000-0000-0000-0000-000000000002',
   '{"brand":"Dell","processor":"Intel Core i7-13700H","ram_gb":16,"storage_gb":512,"screen_inches":15.6}',
   false, true),

  ('30000000-0000-0000-0000-000000000007',
   'Lenovo ThinkPad X1 Carbon Gen 11', 'lenovo-thinkpad-x1-carbon-g11', 'SKU-LN-X1C11',
   'Lenovo', 'Core i7-1365U, 14" IPS 2.8K, ultraligero 1.12 kg.',
   6500000, 7200000, 7, '20000000-0000-0000-0000-000000000002',
   '{"brand":"Lenovo","processor":"Intel Core i7-1365U","ram_gb":16,"storage_gb":256,"screen_inches":14.0}',
   false, true),

  -- ── Audio & Sonido (2) ────────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000008',
   'Sony WH-1000XM5', 'sony-wh1000xm5', 'SKU-SN-XM5',
   'Sony', 'Cancelación activa de ruido líder en industria, 30h batería.',
   1200000, 1450000, 30, '20000000-0000-0000-0000-000000000003',
   '{"brand":"Sony","connectivity":"Bluetooth"}',
   true, true),

  ('30000000-0000-0000-0000-000000000009',
   'AirPods Pro 2da Gen', 'airpods-pro-2', 'SKU-AP-APP2',
   'Apple', 'ANC adaptativo, audio espacial personalizado, chip H2.',
   950000, NULL, 22, '20000000-0000-0000-0000-000000000003',
   '{"brand":"Apple","connectivity":"Bluetooth"}',
   false, true),

  -- ── Ropa Hombre (3) ───────────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000010',
   'Camiseta Polo Classic Fit', 'camiseta-polo-classic-fit', 'SKU-RH-PCF01',
   'Classic Wear', 'Algodón piqué 100%, corte regular, cuello ribeteado.',
   89000, 110000, 120, '20000000-0000-0000-0000-000000000004',
   '{"size":"M","color":"Azul Navy","material":"Algodón Piqué 100%"}',
   false, true),

  ('30000000-0000-0000-0000-000000000011',
   'Jeans Slim Fit Oscuro', 'jeans-slim-fit-oscuro', 'SKU-RH-JSF02',
   'Denim Co', 'Denim 98% algodón, corte slim, tiro medio.',
   159000, 195000, 80, '20000000-0000-0000-0000-000000000004',
   '{"size":"M","color":"Azul Oscuro","material":"Denim 98% Algodón"}',
   false, true),

  ('30000000-0000-0000-0000-000000000012',
   'Chaqueta Bomber Nylon', 'chaqueta-bomber-nylon', 'SKU-RH-CBN03',
   'UrbanEdge', 'Nylon con forro polar, bolsillos internos, talla oversized.',
   289000, 349000, 45, '20000000-0000-0000-0000-000000000004',
   '{"size":"L","color":"Negro","material":"Nylon con forro polar"}',
   true, true),

  -- ── Ropa Mujer (3) ────────────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000013',
   'Blusa Floral Chifón', 'blusa-floral-chifon', 'SKU-RM-BFC01',
   'FlorMode', 'Chifón ligero, estampado floral, manga corta con volante.',
   79000, 99000, 95, '20000000-0000-0000-0000-000000000005',
   '{"size":"S","color":"Rosado Floral","material":"Chifón"}',
   false, true),

  ('30000000-0000-0000-0000-000000000014',
   'Vestido Casual Lino', 'vestido-casual-lino', 'SKU-RM-VCL02',
   'LinenLife', 'Lino natural, cuello en V, longitud midi, cómodo y fresco.',
   129000, 159000, 60, '20000000-0000-0000-0000-000000000005',
   '{"size":"M","color":"Verde Oliva","material":"Lino"}',
   false, true),

  ('30000000-0000-0000-0000-000000000015',
   'Pantalón Palazzo Crepé', 'pantalon-palazzo-crepe', 'SKU-RM-PPC03',
   'EleganStyle', 'Crepé satinado, pierna ancha, cintura elástica.',
   109000, 139000, 70, '20000000-0000-0000-0000-000000000005',
   '{"size":"L","color":"Beige","material":"Crepé"}',
   false, true),

  -- ── Calzado (2) ───────────────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000016',
   'Nike Air Max 270', 'nike-air-max-270', 'SKU-CZ-NAM270',
   'Nike', 'Unidad Air 270° en talón, foam React en mediasuela, diseño lifestyle.',
   389000, 450000, 35, '20000000-0000-0000-0000-000000000006',
   '{"shoe_size":42,"color":"Blanco/Rojo","gender":"Hombre"}',
   true, true),

  ('30000000-0000-0000-0000-000000000017',
   'Adidas Stan Smith Classic', 'adidas-stan-smith-classic', 'SKU-CZ-ASS01',
   'Adidas', 'Cuero sintético, suela de goma, icónico tenis unisex.',
   319000, NULL, 50, '20000000-0000-0000-0000-000000000006',
   '{"shoe_size":40,"color":"Blanco/Verde","gender":"Unisex"}',
   false, true),

  -- ── Muebles (2) ───────────────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000018',
   'Sofá Sectorial L 3 Módulos', 'sofa-sectorial-l-3-modulos', 'SKU-MU-SS3M',
   'HomeComfort', 'Tela microfibra antimanchas, estructura madera pino, 3 módulos independientes.',
   2890000, 3500000, 5, '20000000-0000-0000-0000-000000000007',
   '{}',
   false, true),

  ('30000000-0000-0000-0000-000000000019',
   'Mesa de Centro Mármol Carrara', 'mesa-centro-marmol-carrara', 'SKU-MU-MCM01',
   'MarbleLux', 'Tapa de mármol Carrara natural, patas de acero negro mate.',
   1290000, 1590000, 3, '20000000-0000-0000-0000-000000000007',
   '{}',
   false, true),

  -- ── Electrodomésticos (2) ─────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000020',
   'Lavadora Samsung 15 kg EcoBubble', 'lavadora-samsung-15kg-ecobubble', 'SKU-EL-SLV15',
   'Samsung', 'Tecnología EcoBubble, 14 programas de lavado, inverter A+++.',
   2100000, 2500000, 9, '20000000-0000-0000-0000-000000000008',
   '{"brand":"Samsung","power_watts":2000,"color_finish":"Blanco"}',
   false, true),

  ('30000000-0000-0000-0000-000000000021',
   'Nevera LG French Door 700L', 'nevera-lg-french-door-700l', 'SKU-EL-LGFD700',
   'LG', 'No Frost, compresor Inverter Linear, puerta francesa con dispensador.',
   4500000, 5200000, 4, '20000000-0000-0000-0000-000000000008',
   '{"brand":"LG","power_watts":350,"color_finish":"Inox"}',
   true, true),

  -- ── Equipos de Fitness (2) ────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000022',
   'Mancuernas Ajustables 5-30 kg', 'mancuernas-ajustables-5-30kg', 'SKU-FT-MA30',
   'PowerFit', 'Sistema de ajuste rápido, par de mancuernas, reemplaza 15 pares.',
   890000, 1100000, 20, '20000000-0000-0000-0000-000000000009',
   '{}',
   false, true),

  ('30000000-0000-0000-0000-000000000023',
   'Bicicleta Estática Pro X3', 'bicicleta-estatica-pro-x3', 'SKU-FT-BEX3',
   'FitCycle', 'Resistencia magnética 32 niveles, pantalla LCD, sillín ergonómico.',
   1290000, 1590000, 7, '20000000-0000-0000-0000-000000000009',
   '{}',
   false, true),

  -- ── Deportes Outdoor (1) ──────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000024',
   'Carpa Camping Dome 4 Personas', 'carpa-camping-dome-4', 'SKU-OD-CC4P',
   'TrailMaster', 'Impermeable 3000mm, malla antipicaduras, montaje en 3 minutos.',
   590000, 750000, 15, '20000000-0000-0000-0000-000000000010',
   '{}',
   false, true),

  -- ── Skincare (1) ──────────────────────────────────────────────────────────
  ('30000000-0000-0000-0000-000000000025',
   'Sérum Vitamina C + Niacinamida 30ml', 'serum-vitamina-c-niacinamida-30ml', 'SKU-SK-VC30',
   'GlowLab', '15% vitamina C estabilizada + 5% niacinamida, aclara manchas.',
   129000, 159000, 200, '20000000-0000-0000-0000-000000000011',
   '{}',
   true, true);

-- ── CUPONES DE DESARROLLO ─────────────────────────────────────────────────────

INSERT INTO public.coupons (id, code, type, value, min_purchase, max_uses, is_active) VALUES
  ('50000000-0000-0000-0000-000000000001', 'DEV10',    'percentage', 10,     0,       NULL, true),
  ('50000000-0000-0000-0000-000000000002', 'PROMO50K', 'fixed',      50000,  200000,  100,  true),
  ('50000000-0000-0000-0000-000000000003', 'SUPER25',  'percentage', 25,     500000,  50,   true);
