from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.supabase import get_supabase
from app.deps.auth import require_admin
from app.schemas.admin import StockAdjustIn, StockAdjustOut

router = APIRouter(tags=["admin-inventory"])


@router.get("/search")
def search_products_for_stock(
    q: str = Query(..., min_length=1),
    admin=Depends(require_admin),
):
    """Busca productos por título o SKU para seleccionar a qué ajustar el stock."""
    sb = get_supabase()
    rows = sb.table("products").select(
        "id, title, sku, stock_quantity, is_active, product_variants(id, sku, stock_quantity, attributes_json)"
    ).or_(f"title.ilike.%{q}%,sku.ilike.%{q}%").limit(20).execute().data
    return rows or []


@router.post("/adjust", response_model=StockAdjustOut)
def adjust_stock(body: StockAdjustIn, admin=Depends(require_admin)):
    """
    Ajusta el stock de un producto o variante y deja registro en audit_logs.
    delta positivo = entrada, negativo = salida.
    """
    sb = get_supabase()

    if body.variant_id:
        # Ajustar variante
        row = sb.table("product_variants").select("id, stock_quantity").eq("id", str(body.variant_id)).eq("product_id", str(body.product_id)).limit(1).execute().data
        if not row:
            raise HTTPException(404, "Variante no encontrada")
        old_qty = row[0]["stock_quantity"]
        new_qty = max(0, old_qty + body.delta)
        sb.table("product_variants").update({"stock_quantity": new_qty}).eq("id", str(body.variant_id)).execute()
        entity = "product_variants"
        entity_id = str(body.variant_id)
    else:
        # Ajustar producto
        row = sb.table("products").select("id, stock_quantity").eq("id", str(body.product_id)).limit(1).execute().data
        if not row:
            raise HTTPException(404, "Producto no encontrado")
        old_qty = row[0]["stock_quantity"]
        new_qty = max(0, old_qty + body.delta)
        sb.table("products").update({"stock_quantity": new_qty}).eq("id", str(body.product_id)).execute()
        entity = "products"
        entity_id = str(body.product_id)

    # Audit log
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "stock_adjust",
        "entity": entity,
        "entity_id": entity_id,
        "diff_json": {
            "before": {"stock_quantity": old_qty},
            "after": {"stock_quantity": new_qty},
            "delta": body.delta,
            "reason": body.reason,
        },
    }).execute()

    return StockAdjustOut(
        product_id=body.product_id,
        variant_id=body.variant_id,
        old_quantity=old_qty,
        new_quantity=new_qty,
        delta=new_qty - old_qty,
    )
