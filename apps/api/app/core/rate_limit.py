import base64
import json as _json

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

# Singleton limiter — adjuntar a app.state.limiter en main.py
limiter = Limiter(key_func=get_remote_address)


def get_user_or_ip_key(request: Request) -> str:
    """Rate limit key: JWT sub if present, else IP. No signature check — key derivation only."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            token = auth[7:]
            segment = token.split(".")[1]
            padded = segment + "=" * (4 - len(segment) % 4)
            payload = _json.loads(base64.b64decode(padded))
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return get_remote_address(request)
