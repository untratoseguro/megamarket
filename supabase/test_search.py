"""
Prueba los 5 casos de full-text search contra Supabase.
Requiere que la migración 20260601090000_search_vector.sql ya haya sido aplicada.

Ejecutar desde apps/api/ donde está el .env:
    python ../../supabase/test_search.py
"""
import os, sys, json

env_path = os.path.join(os.path.dirname(__file__), "../apps/api/.env")
if os.path.exists(env_path):
    from dotenv import load_dotenv
    load_dotenv(env_path)

from supabase import create_client

url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not url or not key:
    sys.exit("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridos")

sb = create_client(url, key)

CASES = [
    {"q": "iPhone",      "expect_slug": "iphone-15-pro",          "desc": "debe encontrar iPhone 15 Pro"},
    {"q": "Samsung",     "expect_slug": "samsung-galaxy-s24-ultra","desc": "debe encontrar Samsung Galaxy S24 Ultra"},
    {"q": "cámara",      "expect_slug": None,                      "desc": "debe encontrar productos con 'cámara'"},
    {"q": "titanio",     "expect_slug": "iphone-15-pro",           "desc": "debe encontrar iPhone (titanio en short_description)"},
    {"q": "inexistente", "expect_slug": None,                      "desc": "debe devolver 0 resultados"},
]

print("=" * 60)
print("Full-text search — 5 casos de prueba")
print("=" * 60)

all_ok = True
for case in CASES:
    try:
        result = sb.rpc("search_products", {"search_term": case["q"], "p_limit": 5}).execute()
        rows = result.data or []
        total = rows[0]["total_count"] if rows else 0
        titles = [r["title"] for r in rows]
        slugs  = [r["slug"]  for r in rows]

        ok = True
        if case["q"] == "inexistente":
            ok = (total == 0)
        elif case["expect_slug"]:
            ok = case["expect_slug"] in slugs
        else:
            ok = (total > 0)

        status = "PASS" if ok else "FAIL"
        if not ok:
            all_ok = False

        print(f"\n[{status}] q={case['q']!r} — {case['desc']}")
        print(f"  total={total}  resultados={titles[:3]}")
        if case["expect_slug"] and case["expect_slug"] not in slugs:
            print(f"  ESPERABA: {case['expect_slug']}")
    except Exception as e:
        all_ok = False
        print(f"\n[ERROR] q={case['q']!r}: {e}")

print("\n" + "=" * 60)
print("RESULTADO GLOBAL:", "OK - todos los casos pasaron" if all_ok else "FALLARON algunos casos")
print("=" * 60)
