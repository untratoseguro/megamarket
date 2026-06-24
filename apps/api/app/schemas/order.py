from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class OrderCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    notes: Optional[str] = None
    shipping_address: Optional[dict] = None


class OrderItemOut(BaseModel):
    id: UUID
    product_id: UUID
    variant_id: Optional[UUID]
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    product_title: str


class OrderOut(BaseModel):
    id: UUID
    status: str
    subtotal: Decimal
    total: Decimal
    item_count: int
    created_at: datetime


class OrderDetailOut(OrderOut):
    items: list[OrderItemOut]
    notes: Optional[str]
    updated_at: datetime
