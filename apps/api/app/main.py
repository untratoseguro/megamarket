from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import settings
from app.routers import categories, health, products, cart, favorites, orders, payments

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

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
