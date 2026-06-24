from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.rate_limit import limiter
from app.core.settings import settings
from app.routers import categories, health, products, cart, favorites, orders, payments, recommendations
from app.routers.admin import router as admin_router
from app.routers import assistant

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Rate limiter (slowapi)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS estricto: solo orígenes declarados en CORS_ORIGINS del .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router)
app.include_router(categories.router, prefix="/categories")
app.include_router(products.router, prefix="/products")
app.include_router(cart.router, prefix="/cart")
app.include_router(favorites.router, prefix="/favorites")
app.include_router(orders.router, prefix="/orders")
app.include_router(payments.router, prefix="/payments")
app.include_router(recommendations.router, prefix="/recommendations")
app.include_router(assistant.router, prefix="/assistant")
app.include_router(admin_router)
