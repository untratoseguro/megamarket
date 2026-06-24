from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.supabase import get_supabase
from app.deps.auth import optional_auth

router = APIRouter(tags=["recommendations"])

_LIMIT_DEFAULT = 8
_PRICE_BAND = 0.30  # ±30%


def get_recommendations(
    based_on: str,
    user_id: Optional[str] = None,
    reference_id: Optional[str] = None,
    limit: int = _LIMIT_DEFAULT,
) -> list[dict]:
    """
    Recomendaciones determinísticas (sin LLM).
    - based_on='product': misma categoría/hermanas, precio ±30%, ordenado por rating.
    - based_on='cart'|'favorites': igual pero usando productos del carrito/favoritos del user.
    - Excluye productos ya en el carrito Y en favoritos del usuario.
    - Fallback: productos destacados si no hay referencia.
    Consumida por la API HTTP directamente y por el tool handler del asistente.
    """
    sb = get_supabase()

    # ── 1. Obtener productos de referencia ────────────────────────────────────
    ref_products: list[dict] = []

    if based_on == "product":
        if not reference_id:
            raise HTTPException(400, "reference_id es requerido para based_on=product")
        row = sb.table("products").select("id, price, category_id").eq("id", reference_id).eq("is_active", True).limit(1).execute()
        if row.data:
            ref_products = row.data

    elif based_on == "cart":
        if not user_id:
            return []
        cart = sb.table("carts").select("id").eq("user_id", user_id).limit(1).execute()
        if cart.data:
            items = sb.table("cart_items").select(
                "products(id, price, category_id)"
            ).eq("cart_id", cart.data[0]["id"]).execute()
            ref_products = [i["products"] for i in (items.data or []) if i.get("products")]

    elif based_on == "favorites":
        if not user_id:
            return []
        favs = sb.table("favorites").select(
            "products(id, price, category_id)"
        ).eq("user_id", user_id).execute()
        ref_products = [f["products"] for f in (favs.data or []) if f.get("products")]

    # ── 2. Fallback: destacados ───────────────────────────────────────────────
    if not ref_products:
        rows = (
            sb.table("products")
            .select("id, title, slug, sku, brand, price, compare_at_price, stock_quantity, rating, review_count, category_id, is_featured, attributes_json")
            .eq("is_active", True)
            .eq("is_featured", True)
            .order("rating", desc=True)
            .limit(limit)
            .execute()
        )
        return rows.data or []

    # ── 3. Calcular banda de precio y categorías ──────────────────────────────
    prices = [float(p.get("price") or 0) for p in ref_products]
    avg_price = sum(prices) / len(prices)
    price_min = avg_price * (1 - _PRICE_BAND)
    price_max = avg_price * (1 + _PRICE_BAND)
    ref_ids = {p["id"] for p in ref_products if p.get("id")}
    cat_ids = list({p["category_id"] for p in ref_products if p.get("category_id")})

    # ── 4. Expandir a categorías hermanas ─────────────────────────────────────
    if cat_ids:
        cats = sb.table("categories").select("id, parent_id").in_("id", cat_ids).execute().data or []
        parent_ids = list({c["parent_id"] for c in cats if c.get("parent_id")})
        if parent_ids:
            siblings = sb.table("categories").select("id").in_("parent_id", parent_ids).execute().data or []
            cat_ids = list({c["id"] for c in siblings} | set(cat_ids))

    # ── 5. IDs a excluir (referencia + carrito + favoritos del usuario) ───────
    excluded = set(ref_ids)
    if user_id:
        cart_r = sb.table("carts").select("id").eq("user_id", user_id).limit(1).execute()
        if cart_r.data:
            ci = sb.table("cart_items").select("product_id").eq("cart_id", cart_r.data[0]["id"]).execute()
            excluded.update(r["product_id"] for r in (ci.data or []))
        fi = sb.table("favorites").select("product_id").eq("user_id", user_id).execute()
        excluded.update(r["product_id"] for r in (fi.data or []))

    # ── 6. Query de recomendaciones ───────────────────────────────────────────
    fetch_limit = limit + len(excluded) + 10  # margen para excluidos
    q = (
        sb.table("products")
        .select("id, title, slug, sku, brand, price, compare_at_price, stock_quantity, rating, review_count, category_id, is_featured, attributes_json")
        .eq("is_active", True)
        .gte("price", price_min)
        .lte("price", price_max)
    )
    if cat_ids:
        q = q.in_("category_id", cat_ids)

    rows = q.order("rating", desc=True).limit(fetch_limit).execute()
    items = [p for p in (rows.data or []) if p["id"] not in excluded]
    return items[:limit]


# ── HTTP endpoint ─────────────────────────────────────────────────────────────

@router.get("")
def recommendations(
    based_on: str = Query(..., pattern="^(cart|favorites|product)$"),
    reference_id: Optional[str] = Query(None),
    limit: int = Query(_LIMIT_DEFAULT, ge=1, le=20),
    profile: Optional[dict] = Depends(optional_auth),
):
    """
    Recomendaciones determinísticas.
    - based_on=cart|favorites: requiere JWT de usuario autenticado.
    - based_on=product: requiere reference_id (UUID), funciona sin autenticación.
    """
    if based_on in ("cart", "favorites") and not profile:
        raise HTTPException(401, "Requiere autenticación para recomendaciones por carrito/favoritos")

    return get_recommendations(
        based_on=based_on,
        user_id=profile["id"] if profile else None,
        reference_id=reference_id,
        limit=limit,
    )
