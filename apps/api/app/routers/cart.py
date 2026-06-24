from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.supabase import get_supabase
from app.deps.auth import require_auth
from app.schemas.cart import CartItemIn, CartItemOut, CartItemUpdate, CartOut

router = APIRouter(tags=["cart"])


def _get_or_create_cart(user_id: str) -> str:
    sb = get_supabase()
    result = sb.table("carts").select("id").eq("user_id", user_id).limit(1).execute()
    if result.data:
        return result.data[0]["id"]
    new_cart = sb.table("carts").insert({"user_id": user_id}).execute()
    return new_cart.data[0]["id"]


def _build_cart(cart_id: str) -> CartOut:
    sb = get_supabase()
    rows = sb.table("cart_items").select(
        "id, product_id, variant_id, quantity, products(title, slug, price), product_variants(price)"
    ).eq("cart_id", cart_id).execute().data

    items: list[CartItemOut] = []
    for row in rows:
        product = row.get("products") or {}
        variant = row.get("product_variants")
        unit_price = Decimal(str(
            variant["price"] if variant and variant.get("price") is not None
            else product.get("price", 0)
        ))
        qty = row["quantity"]
        items.append(CartItemOut(
            id=row["id"],
            product_id=row["product_id"],
            variant_id=row.get("variant_id"),
            quantity=qty,
            unit_price=unit_price,
            line_total=unit_price * qty,
            product_title=product.get("title", ""),
            product_slug=product.get("slug", ""),
        ))

    subtotal = sum(i.line_total for i in items)
    item_count = sum(i.quantity for i in items)
    return CartOut(id=cart_id, items=items, subtotal=subtotal, item_count=item_count)


@router.get("", response_model=CartOut)
def get_cart(profile: dict = Depends(require_auth)):
    cart_id = _get_or_create_cart(profile["id"])
    return _build_cart(cart_id)


@router.post("/items", response_model=CartOut, status_code=201)
def add_to_cart(body: CartItemIn, profile: dict = Depends(require_auth)):
    sb = get_supabase()

    prod = sb.table("products").select("id, is_active").eq("id", str(body.product_id)).limit(1).execute()
    if not prod.data:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if not prod.data[0]["is_active"]:
        raise HTTPException(status_code=400, detail="Producto no disponible")

    cart_id = _get_or_create_cart(profile["id"])

    # Check existing item (handle NULL variant_id explicitly)
    q = sb.table("cart_items").select("id, quantity").eq("cart_id", cart_id).eq("product_id", str(body.product_id))
    q = q.eq("variant_id", str(body.variant_id)) if body.variant_id else q.is_("variant_id", "null")
    existing = q.limit(1).execute().data

    if existing:
        new_qty = min(existing[0]["quantity"] + body.quantity, 100)
        sb.table("cart_items").update({"quantity": new_qty}).eq("id", existing[0]["id"]).execute()
    else:
        item_data: dict = {
            "cart_id": cart_id,
            "product_id": str(body.product_id),
            "quantity": body.quantity,
        }
        if body.variant_id:
            item_data["variant_id"] = str(body.variant_id)
        sb.table("cart_items").insert(item_data).execute()

    return _build_cart(cart_id)


@router.patch("/items/{item_id}", response_model=CartOut)
def update_cart_item(item_id: UUID, body: CartItemUpdate, profile: dict = Depends(require_auth)):
    sb = get_supabase()
    cart_id = _get_or_create_cart(profile["id"])

    check = sb.table("cart_items").select("id").eq("id", str(item_id)).eq("cart_id", cart_id).limit(1).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Item no encontrado en el carrito")

    sb.table("cart_items").update({"quantity": body.quantity}).eq("id", str(item_id)).execute()
    return _build_cart(cart_id)


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_cart_item(item_id: UUID, profile: dict = Depends(require_auth)):
    sb = get_supabase()
    cart_id = _get_or_create_cart(profile["id"])

    check = sb.table("cart_items").select("id").eq("id", str(item_id)).eq("cart_id", cart_id).limit(1).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Item no encontrado en el carrito")

    sb.table("cart_items").delete().eq("id", str(item_id)).execute()
    return _build_cart(cart_id)
