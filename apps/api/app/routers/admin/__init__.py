from fastapi import APIRouter

from app.routers.admin import categories, coupons, imports, inventory, orders, products

router = APIRouter(prefix="/admin")
router.include_router(categories.router, prefix="/categories")
router.include_router(products.router, prefix="/products")
router.include_router(inventory.router, prefix="/inventory")
router.include_router(orders.router, prefix="/orders")
router.include_router(coupons.router, prefix="/coupons")
router.include_router(imports.router, prefix="/imports")
