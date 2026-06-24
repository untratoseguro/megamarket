from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel


class PaymentCreateIn(BaseModel):
    order_id: UUID


class PayPalOrderOut(BaseModel):
    payment_id: UUID
    paypal_order_id: str
    approval_url: str


class WompiTransactionOut(BaseModel):
    payment_id: UUID
    payment_link_id: str
    redirect_url: str


class PaymentStatusOut(BaseModel):
    payment_id: UUID
    status: str
    provider: str
    amount: Decimal
