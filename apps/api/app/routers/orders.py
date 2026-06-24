from decimal import Decimal
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends

from app.core.supabase import get_supabase
from app.deps.auth import require_auth
from app.schemas.order import OrderCreateIn, OrderItemOut, OrderOut, OrderDetailOut

router = APIRouter(tags=["orders"])


@router.post("", response_model=OrderDetailOut, status_code=201)
def create_order(body: OrderCreateIn, profile: dict = Depends(require_auth)):
    sb = get_supabase()
    user_id = profile["id"]

    # 1. Find cart
    cart_result = sb.table("carts").select("id").eq("user_id", user_id).limit(1).execute()
    if not cart_result.data:
        raise HTTPException(status_code=400, detail="El carrito está vacío")
    cart_id = cart_result.data[0]["id"]

    # 2. Get cart items with product info
    items_result = sb.table("cart_items").select(
        "id, product_id, variant_id, quantity, products(id, title, sku, price), product_variants(price)"
    ).eq("cart_id", cart_id).execute().data

    if not items_result:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    # 3. Calculate totals
    subtotal = Decimal("0")
    order_items_payload: list[dict] = []

    for item in items_result:
        product = item.get("products") or {}
        variant = item.get("product_variants")
        unit_price = Decimal(str(
            variant["price"] if variant and variant.get("price") is not None
            else product.get("price", 0)
        ))
        qty = item["quantity"]
        line_total = unit_price * qty
        subtotal += line_total

        order_items_payload.append({
            "product_id": item["product_id"],
            "variant_id": item.get("variant_id"),
            "quantity": qty,
            "unit_price": float(unit_price),
            "total_price": float(line_total),
            # Snapshot del producto al momento de la compra
            "product_snapshot_json": {
                "title": product.get("title", ""),
                "sku": product.get("sku", ""),
                "price": str(unit_price),
            },
        })

    discount_total = Decimal("0")
    shipping_total = Decimal("0")
    total = subtotal - discount_total + shipping_total

    # 4. Create order record
    order_data: dict = {
        "user_id": user_id,
        "status": "pending",
        "subtotal": float(subtotal),
        "discount_total": float(discount_total),
        "shipping_total": float(shipping_total),
        "total": float(total),
    }
    if body.notes:
        order_data["notes"] = body.notes
    if body.shipping_address:
        order_data["shipping_address_json"] = body.shipping_address

    order_result = sb.table("orders").insert(order_data).execute()
    order = order_result.data[0]
    order_id = order["id"]

    # 5. Create order_items (bulk insert)
    for payload in order_items_payload:
        payload["order_id"] = order_id
    items_created = sb.table("order_items").insert(order_items_payload).execute().data

    # 6. Clear cart — NEVER mark as paid here
    sb.table("cart_items").delete().eq("cart_id", cart_id).execute()

    # 7. Build response
    items_out: list[OrderItemOut] = []
    item_count = 0
    for i, item in enumerate(items_result):
        product = item.get("products") or {}
        created = items_created[i] if i < len(items_created) else {}
        items_out.append(OrderItemOut(
            id=created.get("id", "00000000-0000-0000-0000-000000000000"),
            product_id=item["product_id"],
            variant_id=item.get("variant_id"),
            quantity=item["quantity"],
            unit_price=order_items_payload[i]["unit_price"],
            total_price=order_items_payload[i]["total_price"],
            product_title=product.get("title", ""),
        ))
        item_count += item["quantity"]

    return OrderDetailOut(
        id=order_id,
        status="pending",
        subtotal=subtotal,
        total=total,
        item_count=item_count,
        created_at=order["created_at"],
        items=items_out,
        notes=order.get("notes"),
        updated_at=order.get("updated_at", order["created_at"]),
    )


@router.get("", response_model=list[OrderOut])
def list_orders(profile: dict = Depends(require_auth)):
    sb = get_supabase()
    rows = sb.table("orders").select(
        "id, status, subtotal, total, created_at, order_items(quantity)"
    ).eq("user_id", profile["id"]).order("created_at", desc=True).execute().data

    return [
        OrderOut(
            id=row["id"],
            status=row["status"],
            subtotal=row["subtotal"],
            total=row["total"],
            item_count=sum(i["quantity"] for i in (row.get("order_items") or [])),
            created_at=row["created_at"],
        )
        for row in rows
    ]


@router.get("/{order_id}", response_model=OrderDetailOut)
def get_order(order_id: UUID, profile: dict = Depends(require_auth)):
    sb = get_supabase()
    rows = sb.table("orders").select(
        "*, order_items(id, product_id, variant_id, quantity, unit_price, total_price, product_snapshot_json)"
    ).eq("id", str(order_id)).eq("user_id", profile["id"]).limit(1).execute().data

    if not rows:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    order = rows[0]
    items_out: list[OrderItemOut] = []
    item_count = 0

    for item in (order.get("order_items") or []):
        snapshot = item.get("product_snapshot_json") or {}
        items_out.append(OrderItemOut(
            id=item["id"],
            product_id=item["product_id"],
            variant_id=item.get("variant_id"),
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            total_price=item["total_price"],
            product_title=snapshot.get("title", ""),
        ))
        item_count += item["quantity"]

    return OrderDetailOut(
        id=order["id"],
        status=order["status"],
        subtotal=order["subtotal"],
        total=order["total"],
        item_count=item_count,
        created_at=order["created_at"],
        items=items_out,
        notes=order.get("notes"),
        updated_at=order.get("updated_at", order["created_at"]),
    )
