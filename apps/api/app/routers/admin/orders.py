from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.supabase import get_supabase
from app.deps.auth import require_admin
from app.schemas.admin import AdminOrderOut, OrderStatusIn

router = APIRouter(tags=["admin-orders"])


@router.get("", response_model=list[AdminOrderOut])
def list_orders_admin(
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin=Depends(require_admin),
):
    sb = get_supabase()
    query = sb.table("orders").select(
        "id, user_id, status, subtotal, total, created_at, updated_at, order_items(quantity)",
        count="exact",
    )
    if status:
        query = query.eq("status", status)
    start = (page - 1) * page_size
    rows = query.order("created_at", desc=True).range(start, start + page_size - 1).execute().data or []

    return [
        AdminOrderOut(
            id=r["id"],
            user_id=r["user_id"],
            status=r["status"],
            subtotal=r["subtotal"],
            total=r["total"],
            item_count=sum(i["quantity"] for i in (r.get("order_items") or [])),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


@router.get("/{order_id}")
def get_order_admin(order_id: UUID, admin=Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("orders").select(
        "*, order_items(id, product_id, variant_id, quantity, unit_price, total_price, product_snapshot_json)"
    ).eq("id", str(order_id)).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Orden no encontrada")
    return rows[0]


@router.patch("/{order_id}/status")
def update_order_status(order_id: UUID, body: OrderStatusIn, admin=Depends(require_admin)):
    """Cambia el estado de una orden con justificación obligatoria. Registra en audit_logs."""
    sb = get_supabase()
    rows = sb.table("orders").select("id, status").eq("id", str(order_id)).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Orden no encontrada")

    old_status = rows[0]["status"]
    if old_status == body.status:
        raise HTTPException(400, f"La orden ya está en estado '{body.status}'")

    sb.table("orders").update({"status": body.status}).eq("id", str(order_id)).execute()

    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "update",
        "entity": "orders",
        "entity_id": str(order_id),
        "diff_json": {
            "before": {"status": old_status},
            "after": {"status": body.status},
            "justification": body.justification,
        },
    }).execute()

    return {"order_id": str(order_id), "old_status": old_status, "new_status": body.status}
