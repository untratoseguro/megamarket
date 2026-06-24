from slowapi import Limiter
from slowapi.util import get_remote_address

# Singleton limiter — adjuntar a app.state.limiter en main.py
limiter = Limiter(key_func=get_remote_address)
