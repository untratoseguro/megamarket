"""
Smoke tests: verifican que la app importa y configura correctamente.
No requieren conexion real a Supabase ni otras APIs externas.
"""
from unittest.mock import MagicMock, patch


def test_settings_load():
    """Settings con valores minimos no lanza errores."""
    from app.core.settings import Settings

    # _env_file=None evita leer el .env de disco en el test
    s = Settings(
        _env_file=None,
        supabase_url="https://test.supabase.co",
        supabase_anon_key="anon",
        supabase_service_role_key="service_role",
        supabase_jwt_secret="secret",
        anthropic_api_key="sk-test",
    )
    assert s.app_name == "MegaMarket API"
    assert s.get_cors_origins() == ["http://localhost:3000"]


def test_settings_cors_parse():
    """CORS_ORIGINS se parsea correctamente con multiples origenes."""
    from app.core.settings import Settings

    s = Settings(cors_origins="http://localhost:3000,http://localhost:3003,https://example.com")
    origins = s.get_cors_origins()
    assert len(origins) == 3
    assert "https://example.com" in origins


def test_health_endpoint():
    """GET /health retorna 200 sin necesitar DB."""
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    from app.routers.health import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "app" in data


def test_recommendation_schemas():
    """Todos los schemas de assistant.py son validos Python."""
    from app.routers.assistant import TOOLS, SYSTEM_PROMPT

    assert len(TOOLS) == 7
    assert "user_id" not in str(TOOLS)
    assert "email" not in str([t.get("input_schema", {}).get("properties", {}) for t in TOOLS])
    assert len(SYSTEM_PROMPT) > 100


def test_tool_security_no_user():
    """Tools de cuenta con perfil None retornan requiere_login."""
    from app.routers.assistant import (
        _tool_get_my_orders,
        _tool_get_my_cart,
        _tool_get_my_favorites,
    )

    assert _tool_get_my_orders(None) == {"error": "requiere_login"}
    assert _tool_get_my_cart(None) == {"error": "requiere_login"}
    assert _tool_get_my_favorites(None) == {"error": "requiere_login"}


def test_no_tool_schema_exposes_user_id():
    """Ningun tool schema expone user_id o email al modelo."""
    from app.routers.assistant import TOOLS

    for tool in TOOLS:
        props = tool.get("input_schema", {}).get("properties", {})
        assert "user_id" not in props, f"Tool '{tool['name']}' expone user_id al modelo"
        assert "email" not in props, f"Tool '{tool['name']}' expone email al modelo"
