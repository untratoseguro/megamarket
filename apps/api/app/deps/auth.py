from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.settings import settings
from app.core.supabase import get_supabase

_bearer = HTTPBearer(auto_error=False)


def _decode_token(token: str) -> dict:
    """Verifica firma y expiración del JWT de Supabase (HS256)."""
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def _fetch_profile(user_id: str) -> dict:
    """Lee rol y datos del perfil usando service_role (sin RLS)."""
    sb = get_supabase()
    result = (
        sb.table("profiles")
        .select("id, name, email, role")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Perfil de usuario no encontrado",
        )
    return result.data[0]


# ── Dependencias exportadas ────────────────────────────────────────────────────

def require_auth(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict:
    """Requiere JWT válido. Retorna dict con id, name, email, role."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = _decode_token(credentials.credentials)
    user_id: str = payload.get("sub", "")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sin sub"
        )
    return _fetch_profile(user_id)


def optional_auth(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict | None:
    """JWT opcional: retorna perfil si se provee token, None si no."""
    if credentials is None:
        return None
    payload = _decode_token(credentials.credentials)
    user_id: str = payload.get("sub", "")
    if not user_id:
        return None
    return _fetch_profile(user_id)


def require_admin(user: Annotated[dict, Depends(require_auth)]) -> dict:
    """Requiere rol admin."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    return user
