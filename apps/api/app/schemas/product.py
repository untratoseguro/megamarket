import json
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ProductVariantSchema(BaseModel):
    id: UUID
    sku: str
    attributes_json: dict
    price: Decimal | None = None
    stock_quantity: int
    image_url: str | None = None


class ProductSummary(BaseModel):
    id: UUID
    title: str
    slug: str
    sku: str
    brand: str | None = None
    short_description: str | None = None
    price: Decimal
    compare_at_price: Decimal | None = None
    stock_quantity: int
    rating: Decimal
    review_count: int
    category_id: UUID | None = None
    attributes_json: dict
    is_featured: bool
    is_active: bool


class ProductDetail(ProductSummary):
    long_description: str | None = None
    created_at: datetime
    updated_at: datetime
    variants: list[ProductVariantSchema] = []


class ProductsResponse(BaseModel):
    items: list[ProductSummary]
    total: int
    page: int
    page_size: int


# ── Query params de /products ──────────────────────────────────────────────────

class ProductsFilter(BaseModel):
    """
    Parámetros de filtrado para GET /products.
    Solo los campos declarados aquí son aceptados — whitelist implícita.
    FastAPI ignora silenciosamente query params desconocidos, pero el endpoint
    valida internamente las claves de `attributes` contra category_attributes.
    """

    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    category_id: UUID | None = None
    is_featured: bool | None = None
    min_price: Decimal | None = Field(None, ge=0)
    max_price: Decimal | None = Field(None, ge=0)
    q: str | None = Field(None, max_length=200, description="Búsqueda por título")
    # JSON string: '{"brand":"Samsung","os":"Android"}'
    # Las claves se validan contra category_attributes si category_id está presente.
    attributes: str | None = Field(
        None,
        description='Objeto JSON con atributos filtrables, ej: {"brand":"Samsung"}',
    )

    @field_validator("attributes", mode="before")
    @classmethod
    def validate_attributes_json(cls, v: str | None) -> str | None:
        if v is None:
            return None
        try:
            parsed = json.loads(v)
        except (json.JSONDecodeError, TypeError):
            raise ValueError("attributes debe ser un objeto JSON válido")
        if not isinstance(parsed, dict):
            raise ValueError("attributes debe ser un objeto JSON (no array ni primitivo)")
        return v
