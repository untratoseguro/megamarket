from supabase import Client, create_client

from app.core.settings import settings

# Singleton: se crea en la primera llamada y se reutiliza.
# Usa service_role_key → bypasea RLS completamente.
# NUNCA exponer este cliente ni esta key al cliente web.
_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError(
                "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos. "
                "Copia .env.example a .env y completa las variables."
            )
        _client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return _client
