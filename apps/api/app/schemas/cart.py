from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CartItemIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: UUID
    variant_id: Optional[UUID] = None
    quantity: int = Field(1, ge=1, le=100)


class CartItemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

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
