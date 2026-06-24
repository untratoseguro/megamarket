from decimal import Decimal
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field


class CartItemIn(BaseModel):
    product_id: UUID
    variant_id: Optional[UUID] = None
    quantity: int = Field(1, ge=1, le=100)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=100)


class CartItemOut(BaseModel):
    id: UUID
    product_id: UUID
    variant_id: Optional[UUID]
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    product_title: str
    product_slug: str


class CartOut(BaseModel):
    id: UUID
    items: list[CartItemOut]
    subtotal: Decimal
    item_count: int
