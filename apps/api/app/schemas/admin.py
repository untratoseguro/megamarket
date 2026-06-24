"""
Schemas de admin. ProductIn es el canónico para tanto CRUD como validación de imports.
"""
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ── Categories ────────────────────────────────────────────────────────────────

class CategoryIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    slug: Optional[str] = None
    parent_id: Optional[UUID] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CategoryOut(BaseModel):
    id: UUID
    name: str
    slug: str
    parent_id: Optional[UUID]
    description: Optional[str]
    image_url: Optional[str]
    icon: Optional[str]
    sort_order: int
    is_active: bool
    created_at: datetime


class CategoryAttrIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    type: Literal["text", "number", "select", "boolean"]
    options_json: Optional[list[str]] = None
    is_filterable: bool = True
    is_required: bool = False
    sort_order: int = 0


class CategoryAttrOut(BaseModel):
    id: UUID
    category_id: UUID
    name: str
    type: str
    options_json: Optional[list[str]]
    is_filterable: bool
    is_required: bool
    sort_order: int


# ── Products ──────────────────────────────────────────────────────────────────

class ProductIn(BaseModel):
    """
    Schema canónico para crear/actualizar productos.
    Usado tanto por el CRUD individual como por el worker de imports —
    no duplicar validación en ningún lado.
    """
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    slug: Optional[str] = None               # auto-generado desde title si None
    sku: str = Field(min_length=1, max_length=100)
    brand: Optional[str] = None
    short_description: Optional[str] = None
    long_description: Optional[str] = None
    price: Decimal = Field(gt=0)
    compare_at_price: Optional[Decimal] = Field(None, gt=0)
    stock_quantity: int = Field(0, ge=0)
    category_id: Optional[UUID] = None
    attributes_json: dict = Field(default_factory=dict)
    is_featured: bool = False
    is_active: bool = True

    @field_validator("compare_at_price")
    @classmethod
    def compare_must_exceed_price(cls, v: Optional[Decimal], info) -> Optional[Decimal]:
        if v is not None and info.data.get("price") is not None:
            if v <= info.data["price"]:
                raise ValueError("compare_at_price debe ser mayor que price")
        return v


class ProductVariantIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str = Field(min_length=1, max_length=100)
    attributes_json: dict = Field(default_factory=dict)
    price: Optional[Decimal] = Field(None, gt=0)
    stock_quantity: int = Field(0, ge=0)


class ProductAdminOut(BaseModel):
    id: UUID
    title: str
    slug: str
    sku: str
    brand: Optional[str]
    price: Decimal
    compare_at_price: Optional[Decimal]
    stock_quantity: int
    category_id: Optional[UUID]
    is_featured: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ── Inventory ─────────────────────────────────────────────────────────────────

class StockAdjustIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: UUID
    variant_id: Optional[UUID] = None
    delta: int = Field(..., description="Cantidad a sumar (positivo) o restar (negativo)")
    reason: str = Field(min_length=5, max_length=500)


class StockAdjustOut(BaseModel):
    product_id: UUID
    variant_id: Optional[UUID]
    old_quantity: int
    new_quantity: int
    delta: int


# ── Orders ────────────────────────────────────────────────────────────────────

VALID_ORDER_STATUSES = {
    "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"
}


class OrderStatusIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    justification: str = Field(min_length=5, max_length=500)

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v: str) -> str:
        if v not in VALID_ORDER_STATUSES:
            raise ValueError(f"Estado inválido. Opciones: {sorted(VALID_ORDER_STATUSES)}")
        return v


class AdminOrderOut(BaseModel):
    id: UUID
    user_id: UUID
    status: str
    subtotal: Decimal
    total: Decimal
    item_count: int
    created_at: datetime
    updated_at: datetime


# ── Coupons ───────────────────────────────────────────────────────────────────

class CouponIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=2, max_length=50)
    type: Literal["percentage", "fixed"]
    value: Decimal = Field(gt=0)
    min_purchase: Decimal = Field(Decimal("0"), ge=0)
    max_uses: Optional[int] = Field(None, gt=0)
    is_active: bool = True
    expires_at: Optional[datetime] = None

    @field_validator("value")
    @classmethod
    def percentage_max_100(cls, v: Decimal, info) -> Decimal:
        if info.data.get("type") == "percentage" and v > 100:
            raise ValueError("El porcentaje no puede superar 100")
        return v


class CouponOut(BaseModel):
    id: UUID
    code: str
    type: str
    value: Decimal
    min_purchase: Decimal
    max_uses: Optional[int]
    uses_count: int
    is_active: bool
    expires_at: Optional[datetime]
    created_at: datetime


# ── Import jobs ───────────────────────────────────────────────────────────────

class ImportJobOut(BaseModel):
    id: UUID
    source: str
    filename: Optional[str]
    status: str
    total_rows: Optional[int]
    processed_rows: int
    success_count: int
    error_count: int
    errors_json: Optional[list]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
