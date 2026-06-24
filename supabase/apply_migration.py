"""
Aplica la migración de search_vector directamente al proyecto Supabase.

USO:
    python supabase/apply_migration.py [DATABASE_URL]

Si no se pasa DATABASE_URL como argumento, usa la variable de entorno DATABASE_URL.
El DATABASE_URL se encuentra en el dashboard de Supabase:
  Project Settings → Database → Connection string → URI (Session mode, puerto 5432)

Ejemplo:
    python supabase/apply_migration.py "postgresql://postgres:[PASSWORD]@db.cjymqadfiubmijrbvvym.supabase.co:5432/postgres"
"""
import os
import sys


def main() -> None:
    db_url = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("DATABASE_URL", "")
    if not db_url:
        print(__doc__)
        sys.exit(1)

    try:
        import psycopg2
    except ImportError:
        print("Instala psycopg2: pip install psycopg2-binary")
        sys.exit(1)

    migration_path = os.path.join(
        os.path.dirname(__file__),
        "migrations",
        "20260601090000_search_vector.sql",
    )
    with open(migration_path) as f:
        sql = f.read()

    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    print(f"Aplicando migración: {os.path.basename(migration_path)}")
    cur.execute(sql)
    print("Migración aplicada correctamente.")

    # Verify
    cur.execute("SELECT COUNT(*) FROM products WHERE search_vector IS NOT NULL;")
    count = cur.fetchone()[0]
    print(f"Productos con search_vector: {count}")

    cur.execute("SELECT indexname FROM pg_indexes WHERE tablename='products' AND indexname='idx_products_search_vector';")
    idx = cur.fetchone()
    print(f"Índice GIN: {'OK' if idx else 'NO ENCONTRADO'}")

    cur.execute("SELECT proname FROM pg_proc WHERE proname='search_products';")
    fn = cur.fetchone()
    print(f"RPC search_products: {'OK' if fn else 'NO ENCONTRADA'}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
