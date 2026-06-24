"""
Aplica el seed de desarrollo a Supabase usando el cliente Python (service_role).
Ejecutar desde apps/api/ donde está el .env:
    python ../../supabase/seed/apply_seed.py
"""

import os
import sys

# Carga variables desde apps/api/.env si existe
env_path = os.path.join(os.path.dirname(__file__), "../../apps/api/.env")
if os.path.exists(env_path):
    from dotenv import load_dotenv
    load_dotenv(env_path)

from supabase import create_client

url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not url or not key:
    sys.exit("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos en el .env")

sb = create_client(url, key)

def upsert(table: str, rows: list[dict], on_conflict: str = "id") -> int:
    result = sb.table(table).upsert(rows, on_conflict=on_conflict).execute()
    return len(result.data)

print("Aplicando seed de desarrollo...")

# ── 1. Categorías principales (parent_id=NULL primero) ────────────────────────
n = upsert("categories", [
    {"id":"10000000-0000-0000-0000-000000000001","parent_id":None,"name":"Electrónica",       "slug":"electronica",       "description":"Smartphones, laptops, audio y más",   "icon":"📱","sort_order":1,"is_active":True},
    {"id":"10000000-0000-0000-0000-000000000002","parent_id":None,"name":"Ropa & Moda",       "slug":"ropa-moda",         "description":"Moda para hombre, mujer y calzado",   "icon":"👗","sort_order":2,"is_active":True},
    {"id":"10000000-0000-0000-0000-000000000003","parent_id":None,"name":"Hogar & Jardín",    "slug":"hogar-jardin",      "description":"Muebles, electrodomésticos y deco",   "icon":"🏠","sort_order":3,"is_active":True},
    {"id":"10000000-0000-0000-0000-000000000004","parent_id":None,"name":"Deportes & Fitness","slug":"deportes-fitness",  "description":"Equipos, ropa deportiva y outdoor",   "icon":"🏋","sort_order":4,"is_active":True},
    {"id":"10000000-0000-0000-0000-000000000005","parent_id":None,"name":"Belleza & Salud",   "slug":"belleza-salud",     "description":"Skincare, maquillaje y suplementos",  "icon":"💄","sort_order":5,"is_active":True},
    {"id":"10000000-0000-0000-0000-000000000006","parent_id":None,"name":"Alimentos",         "slug":"alimentos",         "description":"Orgánicos, bebidas y snacks",         "icon":"🥗","sort_order":6,"is_active":True},
])
print(f"  categories (main): {n}")

# ── 2. Subcategorías ──────────────────────────────────────────────────────────
n = upsert("categories", [
    {"id":"20000000-0000-0000-0000-000000000001","parent_id":"10000000-0000-0000-0000-000000000001","name":"Smartphones",           "slug":"smartphones",          "icon":"📱","sort_order":1,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000002","parent_id":"10000000-0000-0000-0000-000000000001","name":"Laptops & Computadores", "slug":"laptops-computadores", "icon":"💻","sort_order":2,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000003","parent_id":"10000000-0000-0000-0000-000000000001","name":"Audio & Sonido",         "slug":"audio-sonido",         "icon":"🎧","sort_order":3,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000004","parent_id":"10000000-0000-0000-0000-000000000002","name":"Ropa Hombre",            "slug":"ropa-hombre",          "icon":"👔","sort_order":1,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000005","parent_id":"10000000-0000-0000-0000-000000000002","name":"Ropa Mujer",             "slug":"ropa-mujer",           "icon":"👗","sort_order":2,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000006","parent_id":"10000000-0000-0000-0000-000000000002","name":"Calzado",                "slug":"calzado",              "icon":"👟","sort_order":3,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000007","parent_id":"10000000-0000-0000-0000-000000000003","name":"Muebles",                "slug":"muebles",              "icon":"🛋","sort_order":1,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000008","parent_id":"10000000-0000-0000-0000-000000000003","name":"Electrodomésticos",      "slug":"electrodomesticos",    "icon":"🍽","sort_order":2,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000009","parent_id":"10000000-0000-0000-0000-000000000004","name":"Equipos de Fitness",     "slug":"equipos-fitness",      "icon":"🏋","sort_order":1,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000010","parent_id":"10000000-0000-0000-0000-000000000004","name":"Deportes Outdoor",       "slug":"deportes-outdoor",     "icon":"🏕","sort_order":2,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000011","parent_id":"10000000-0000-0000-0000-000000000005","name":"Skincare",               "slug":"skincare",             "icon":"✨","sort_order":1,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000012","parent_id":"10000000-0000-0000-0000-000000000005","name":"Maquillaje",             "slug":"maquillaje",           "icon":"💄","sort_order":2,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000013","parent_id":"10000000-0000-0000-0000-000000000006","name":"Alimentos Orgánicos",    "slug":"alimentos-organicos",  "icon":"🥬","sort_order":1,"is_active":True},
    {"id":"20000000-0000-0000-0000-000000000014","parent_id":"10000000-0000-0000-0000-000000000006","name":"Bebidas",                "slug":"bebidas",              "icon":"🧃","sort_order":2,"is_active":True},
])
print(f"  categories (sub):  {n}")

# ── 3. Category attributes ────────────────────────────────────────────────────
n = upsert("category_attributes", [
    {"id":"40000000-0000-0000-0000-000000000001","category_id":"20000000-0000-0000-0000-000000000001","name":"brand",         "type":"text",  "options_json":None,                                    "is_filterable":True, "is_required":True, "sort_order":1},
    {"id":"40000000-0000-0000-0000-000000000002","category_id":"20000000-0000-0000-0000-000000000001","name":"os",            "type":"select","options_json":["Android","iOS","HarmonyOS"],           "is_filterable":True, "is_required":True, "sort_order":2},
    {"id":"40000000-0000-0000-0000-000000000003","category_id":"20000000-0000-0000-0000-000000000001","name":"ram_gb",        "type":"number","options_json":None,                                    "is_filterable":True, "is_required":False,"sort_order":3},
    {"id":"40000000-0000-0000-0000-000000000004","category_id":"20000000-0000-0000-0000-000000000001","name":"storage_gb",   "type":"number","options_json":None,                                    "is_filterable":True, "is_required":False,"sort_order":4},
    {"id":"40000000-0000-0000-0000-000000000005","category_id":"20000000-0000-0000-0000-000000000001","name":"color",        "type":"text",  "options_json":None,                                    "is_filterable":False,"is_required":False,"sort_order":5},
    {"id":"40000000-0000-0000-0000-000000000006","category_id":"20000000-0000-0000-0000-000000000002","name":"brand",        "type":"text",  "options_json":None,                                    "is_filterable":True, "is_required":True, "sort_order":1},
    {"id":"40000000-0000-0000-0000-000000000007","category_id":"20000000-0000-0000-0000-000000000002","name":"processor",    "type":"text",  "options_json":None,                                    "is_filterable":True, "is_required":False,"sort_order":2},
    {"id":"40000000-0000-0000-0000-000000000008","category_id":"20000000-0000-0000-0000-000000000002","name":"ram_gb",       "type":"number","options_json":None,                                    "is_filterable":True, "is_required":False,"sort_order":3},
    {"id":"40000000-0000-0000-0000-000000000009","category_id":"20000000-0000-0000-0000-000000000002","name":"storage_gb",  "type":"number","options_json":None,                                    "is_filterable":True, "is_required":False,"sort_order":4},
    {"id":"40000000-0000-0000-0000-000000000010","category_id":"20000000-0000-0000-0000-000000000002","name":"screen_inches","type":"number","options_json":None,                                    "is_filterable":True, "is_required":False,"sort_order":5},
    {"id":"40000000-0000-0000-0000-000000000011","category_id":"20000000-0000-0000-0000-000000000003","name":"brand",       "type":"text",  "options_json":None,                                    "is_filterable":True, "is_required":True, "sort_order":1},
    {"id":"40000000-0000-0000-0000-000000000012","category_id":"20000000-0000-0000-0000-000000000003","name":"connectivity","type":"select","options_json":["Bluetooth","Cable","Bluetooth+Cable"],  "is_filterable":True, "is_required":False,"sort_order":2},
    {"id":"40000000-0000-0000-0000-000000000013","category_id":"20000000-0000-0000-0000-000000000004","name":"size",        "type":"select","options_json":["XS","S","M","L","XL","XXL"],           "is_filterable":True, "is_required":True, "sort_order":1},
    {"id":"40000000-0000-0000-0000-000000000014","category_id":"20000000-0000-0000-0000-000000000004","name":"color",       "type":"text",  "options_json":None,                                    "is_filterable":False,"is_required":False,"sort_order":2},
    {"id":"40000000-0000-0000-0000-000000000015","category_id":"20000000-0000-0000-0000-000000000004","name":"material",    "type":"text",  "options_json":None,                                    "is_filterable":False,"is_required":False,"sort_order":3},
    {"id":"40000000-0000-0000-0000-000000000016","category_id":"20000000-0000-0000-0000-000000000005","name":"size",        "type":"select","options_json":["XS","S","M","L","XL"],                 "is_filterable":True, "is_required":True, "sort_order":1},
    {"id":"40000000-0000-0000-0000-000000000017","category_id":"20000000-0000-0000-0000-000000000005","name":"color",       "type":"text",  "options_json":None,                                    "is_filterable":False,"is_required":False,"sort_order":2},
    {"id":"40000000-0000-0000-0000-000000000018","category_id":"20000000-0000-0000-0000-000000000005","name":"material",    "type":"text",  "options_json":None,                                    "is_filterable":False,"is_required":False,"sort_order":3},
    {"id":"40000000-0000-0000-0000-000000000019","category_id":"20000000-0000-0000-0000-000000000006","name":"shoe_size",   "type":"number","options_json":None,                                    "is_filterable":True, "is_required":True, "sort_order":1},
    {"id":"40000000-0000-0000-0000-000000000020","category_id":"20000000-0000-0000-0000-000000000006","name":"color",       "type":"text",  "options_json":None,                                    "is_filterable":False,"is_required":False,"sort_order":2},
    {"id":"40000000-0000-0000-0000-000000000021","category_id":"20000000-0000-0000-0000-000000000006","name":"gender",      "type":"select","options_json":["Hombre","Mujer","Unisex"],              "is_filterable":True, "is_required":False,"sort_order":3},
    {"id":"40000000-0000-0000-0000-000000000022","category_id":"20000000-0000-0000-0000-000000000008","name":"brand",       "type":"text",  "options_json":None,                                    "is_filterable":True, "is_required":True, "sort_order":1},
    {"id":"40000000-0000-0000-0000-000000000023","category_id":"20000000-0000-0000-0000-000000000008","name":"power_watts", "type":"number","options_json":None,                                    "is_filterable":False,"is_required":False,"sort_order":2},
    {"id":"40000000-0000-0000-0000-000000000024","category_id":"20000000-0000-0000-0000-000000000008","name":"color_finish","type":"select","options_json":["Blanco","Negro","Plateado","Inox"],     "is_filterable":True, "is_required":False,"sort_order":3},
])
print(f"  category_attributes: {n}")

# ── 4. Productos (25) ─────────────────────────────────────────────────────────
products = [
    {"id":"30000000-0000-0000-0000-000000000001","title":"Samsung Galaxy S24 Ultra","slug":"samsung-galaxy-s24-ultra","sku":"SKU-SM-S24U","brand":"Samsung","short_description":"Pantalla 6.8\" Dynamic AMOLED, cámara 200MP, S Pen incluido.","price":129999,"compare_at_price":149999,"stock_quantity":18,"category_id":"20000000-0000-0000-0000-000000000001","attributes_json":{"brand":"Samsung","os":"Android","ram_gb":12,"storage_gb":256,"color":"Phantom Black"},"is_featured":True,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000002","title":"iPhone 15 Pro","slug":"iphone-15-pro","sku":"SKU-AP-IP15P","brand":"Apple","short_description":"Chip A17 Pro, cuerpo de titanio, cámara 48MP con zoom 5x.","price":119999,"compare_at_price":None,"stock_quantity":12,"category_id":"20000000-0000-0000-0000-000000000001","attributes_json":{"brand":"Apple","os":"iOS","ram_gb":8,"storage_gb":256,"color":"Natural Titanium"},"is_featured":True,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000003","title":"Xiaomi 14 Pro","slug":"xiaomi-14-pro","sku":"SKU-XM-14P","brand":"Xiaomi","short_description":"Snapdragon 8 Gen 3, cámara Leica, carga 120W.","price":59999,"compare_at_price":69999,"stock_quantity":25,"category_id":"20000000-0000-0000-0000-000000000001","attributes_json":{"brand":"Xiaomi","os":"Android","ram_gb":16,"storage_gb":512,"color":"White"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000004","title":"Google Pixel 8","slug":"google-pixel-8","sku":"SKU-GO-PX8","brand":"Google","short_description":"Google Tensor G3, IA avanzada, 7 años de actualizaciones.","price":69999,"compare_at_price":79999,"stock_quantity":8,"category_id":"20000000-0000-0000-0000-000000000001","attributes_json":{"brand":"Google","os":"Android","ram_gb":8,"storage_gb":128,"color":"Obsidian"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000005","title":"MacBook Pro M3 14\"","slug":"macbook-pro-m3-14","sku":"SKU-AP-MBP14","brand":"Apple","short_description":"Chip Apple M3 Pro, pantalla Liquid Retina XDR, batería 18h.","price":179999,"compare_at_price":None,"stock_quantity":6,"category_id":"20000000-0000-0000-0000-000000000002","attributes_json":{"brand":"Apple","processor":"Apple M3 Pro","ram_gb":18,"storage_gb":512,"screen_inches":14.2},"is_featured":True,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000006","title":"Dell XPS 15","slug":"dell-xps-15","sku":"SKU-DL-XPS15","brand":"Dell","short_description":"Core i7-13700H, pantalla OLED 3.5K táctil, GPU RTX 4060.","price":149999,"compare_at_price":169999,"stock_quantity":4,"category_id":"20000000-0000-0000-0000-000000000002","attributes_json":{"brand":"Dell","processor":"Intel Core i7-13700H","ram_gb":16,"storage_gb":512,"screen_inches":15.6},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000007","title":"Lenovo ThinkPad X1 Carbon Gen 11","slug":"lenovo-thinkpad-x1-carbon-g11","sku":"SKU-LN-X1C11","brand":"Lenovo","short_description":"Core i7-1365U, 14\" IPS 2.8K, ultraligero 1.12 kg.","price":139999,"compare_at_price":159999,"stock_quantity":7,"category_id":"20000000-0000-0000-0000-000000000002","attributes_json":{"brand":"Lenovo","processor":"Intel Core i7-1365U","ram_gb":16,"storage_gb":256,"screen_inches":14.0},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000008","title":"Sony WH-1000XM5","slug":"sony-wh1000xm5","sku":"SKU-SN-XM5","brand":"Sony","short_description":"Cancelación activa de ruido líder en industria, 30h batería.","price":32999,"compare_at_price":39999,"stock_quantity":30,"category_id":"20000000-0000-0000-0000-000000000003","attributes_json":{"brand":"Sony","connectivity":"Bluetooth"},"is_featured":True,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000009","title":"AirPods Pro 2da Gen","slug":"airpods-pro-2","sku":"SKU-AP-APP2","brand":"Apple","short_description":"ANC adaptativo, audio espacial personalizado, chip H2.","price":24999,"compare_at_price":None,"stock_quantity":22,"category_id":"20000000-0000-0000-0000-000000000003","attributes_json":{"brand":"Apple","connectivity":"Bluetooth"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000010","title":"Camiseta Polo Classic Fit","slug":"camiseta-polo-classic-fit","sku":"SKU-RH-PCF01","brand":"Classic Wear","short_description":"Algodón piqué 100%, corte regular, cuello ribeteado.","price":2499,"compare_at_price":3499,"stock_quantity":120,"category_id":"20000000-0000-0000-0000-000000000004","attributes_json":{"size":"M","color":"Azul Navy","material":"Algodón Piqué 100%"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000011","title":"Jeans Slim Fit Oscuro","slug":"jeans-slim-fit-oscuro","sku":"SKU-RH-JSF02","brand":"Denim Co","short_description":"Denim 98% algodón, corte slim, tiro medio.","price":3999,"compare_at_price":4999,"stock_quantity":80,"category_id":"20000000-0000-0000-0000-000000000004","attributes_json":{"size":"M","color":"Azul Oscuro","material":"Denim 98% Algodón"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000012","title":"Chaqueta Bomber Nylon","slug":"chaqueta-bomber-nylon","sku":"SKU-RH-CBN03","brand":"UrbanEdge","short_description":"Nylon con forro polar, bolsillos internos, talla oversized.","price":5999,"compare_at_price":7999,"stock_quantity":45,"category_id":"20000000-0000-0000-0000-000000000004","attributes_json":{"size":"L","color":"Negro","material":"Nylon con forro polar"},"is_featured":True,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000013","title":"Blusa Floral Chifón","slug":"blusa-floral-chifon","sku":"SKU-RM-BFC01","brand":"FlorMode","short_description":"Chifón ligero, estampado floral, manga corta con volante.","price":1999,"compare_at_price":2999,"stock_quantity":95,"category_id":"20000000-0000-0000-0000-000000000005","attributes_json":{"size":"S","color":"Rosado Floral","material":"Chifón"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000014","title":"Vestido Casual Lino","slug":"vestido-casual-lino","sku":"SKU-RM-VCL02","brand":"LinenLife","short_description":"Lino natural, cuello en V, longitud midi, cómodo y fresco.","price":3499,"compare_at_price":4499,"stock_quantity":60,"category_id":"20000000-0000-0000-0000-000000000005","attributes_json":{"size":"M","color":"Verde Oliva","material":"Lino"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000015","title":"Pantalón Palazzo Crepé","slug":"pantalon-palazzo-crepe","sku":"SKU-RM-PPC03","brand":"EleganStyle","short_description":"Crepé satinado, pierna ancha, cintura elástica.","price":2999,"compare_at_price":3999,"stock_quantity":70,"category_id":"20000000-0000-0000-0000-000000000005","attributes_json":{"size":"L","color":"Beige","material":"Crepé"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000016","title":"Nike Air Max 270","slug":"nike-air-max-270","sku":"SKU-CZ-NAM270","brand":"Nike","short_description":"Unidad Air 270° en talón, foam React en mediasuela, diseño lifestyle.","price":11999,"compare_at_price":14999,"stock_quantity":35,"category_id":"20000000-0000-0000-0000-000000000006","attributes_json":{"shoe_size":42,"color":"Blanco/Rojo","gender":"Hombre"},"is_featured":True,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000017","title":"Adidas Stan Smith Classic","slug":"adidas-stan-smith-classic","sku":"SKU-CZ-ASS01","brand":"Adidas","short_description":"Cuero sintético, suela de goma, icónico tenis unisex.","price":8999,"compare_at_price":None,"stock_quantity":50,"category_id":"20000000-0000-0000-0000-000000000006","attributes_json":{"shoe_size":40,"color":"Blanco/Verde","gender":"Unisex"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000018","title":"Sofá Sectorial L 3 Módulos","slug":"sofa-sectorial-l-3-modulos","sku":"SKU-MU-SS3M","brand":"HomeComfort","short_description":"Tela microfibra antimanchas, estructura madera pino, 3 módulos independientes.","price":69999,"compare_at_price":84999,"stock_quantity":5,"category_id":"20000000-0000-0000-0000-000000000007","attributes_json":{},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000019","title":"Mesa de Centro Mármol Carrara","slug":"mesa-centro-marmol-carrara","sku":"SKU-MU-MCM01","brand":"MarbleLux","short_description":"Tapa de mármol Carrara natural, patas de acero negro mate.","price":39999,"compare_at_price":49999,"stock_quantity":3,"category_id":"20000000-0000-0000-0000-000000000007","attributes_json":{},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000020","title":"Lavadora Samsung 15 kg EcoBubble","slug":"lavadora-samsung-15kg-ecobubble","sku":"SKU-EL-SLV15","brand":"Samsung","short_description":"Tecnología EcoBubble, 14 programas de lavado, inverter A+++.","price":49999,"compare_at_price":59999,"stock_quantity":9,"category_id":"20000000-0000-0000-0000-000000000008","attributes_json":{"brand":"Samsung","power_watts":2000,"color_finish":"Blanco"},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000021","title":"Nevera LG French Door 700L","slug":"nevera-lg-french-door-700l","sku":"SKU-EL-LGFD700","brand":"LG","short_description":"No Frost, compresor Inverter Linear, puerta francesa con dispensador.","price":89999,"compare_at_price":109999,"stock_quantity":4,"category_id":"20000000-0000-0000-0000-000000000008","attributes_json":{"brand":"LG","power_watts":350,"color_finish":"Inox"},"is_featured":True,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000022","title":"Mancuernas Ajustables 5-30 kg","slug":"mancuernas-ajustables-5-30kg","sku":"SKU-FT-MA30","brand":"PowerFit","short_description":"Sistema de ajuste rápido, par de mancuernas, reemplaza 15 pares.","price":14999,"compare_at_price":19999,"stock_quantity":20,"category_id":"20000000-0000-0000-0000-000000000009","attributes_json":{},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000023","title":"Bicicleta Estática Pro X3","slug":"bicicleta-estatica-pro-x3","sku":"SKU-FT-BEX3","brand":"FitCycle","short_description":"Resistencia magnética 32 niveles, pantalla LCD, sillín ergonómico.","price":29999,"compare_at_price":39999,"stock_quantity":7,"category_id":"20000000-0000-0000-0000-000000000009","attributes_json":{},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000024","title":"Carpa Camping Dome 4 Personas","slug":"carpa-camping-dome-4","sku":"SKU-OD-CC4P","brand":"TrailMaster","short_description":"Impermeable 3000mm, malla antipicaduras, montaje en 3 minutos.","price":8999,"compare_at_price":11999,"stock_quantity":15,"category_id":"20000000-0000-0000-0000-000000000010","attributes_json":{},"is_featured":False,"is_active":True},
    {"id":"30000000-0000-0000-0000-000000000025","title":"Sérum Vitamina C + Niacinamida 30ml","slug":"serum-vitamina-c-niacinamida-30ml","sku":"SKU-SK-VC30","brand":"GlowLab","short_description":"15% vitamina C estabilizada + 5% niacinamida, aclara manchas.","price":2499,"compare_at_price":3499,"stock_quantity":200,"category_id":"20000000-0000-0000-0000-000000000011","attributes_json":{},"is_featured":True,"is_active":True},
]
n = upsert("products", products)
print(f"  products: {n}")

# ── 5. Cupones ────────────────────────────────────────────────────────────────
n = upsert("coupons", [
    {"id":"50000000-0000-0000-0000-000000000001","code":"DEV10",   "type":"percentage","value":10,  "min_purchase":0,    "max_uses":None,"is_active":True},
    {"id":"50000000-0000-0000-0000-000000000002","code":"PROMO50K","type":"fixed",     "value":500, "min_purchase":3000, "max_uses":100, "is_active":True},
    {"id":"50000000-0000-0000-0000-000000000003","code":"SUPER25", "type":"percentage","value":25,  "min_purchase":5000, "max_uses":50,  "is_active":True},
])
print(f"  coupons: {n}")

print("\nSeed aplicado exitosamente.")
