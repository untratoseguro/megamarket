from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.supabase import get_supabase
from app.deps.auth import require_admin
from app.schemas.admin import CouponIn, CouponOut

router = APIRouter(tags=["admin-coupons"])


@router.get("", response_model=list[CouponOut])
def list_coupons(admin=Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("coupons").select("*").order("created_at", desc=True).execute().data
    return rows or []


@router.post("", response_model=CouponOut, status_code=201)
def create_coupon(body: CouponIn, admin=Depends(require_admin)):
    sb = get_supabase()
    data = body.model_dump(mode="json")
    data["code"] = data["code"].upper().strip()
    data["value"] = float(body.value)
    data["min_purchase"] = float(body.min_purchase)
    result = sb.table("coupons").insert(data).execute()
    coupon = result.data[0]
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "create",
        "entity": "coupons",
        "entity_id": str(coupon["id"]),
        "diff_json": {"code": coupon["code"], "type": coupon["type"], "value": str(body.value)},
    }).execute()
    return coupon


@router.patch("/{coupon_id}", response_model=CouponOut)
def update_coupon(coupon_id: UUID, body: CouponIn, admin=Depends(require_admin)):
    sb = get_supabase()
    data = body.model_dump(mode="json", exclude_none=True)
    data["code"] = data["code"].upper().strip()
    data["value"] = float(body.value)
    data["min_purchase"] = float(body.min_purchase)
    result = sb.table("coupons").update(data).eq("id", str(coupon_id)).execute()
    if not result.data:
        raise HTTPException(404, "Cupón no encontrado")
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "update",
        "entity": "coupons",
        "entity_id": str(coupon_id),
        "diff_json": {"changes": {"code": data["code"], "type": body.type, "value": str(body.value), "is_active": body.is_active}},
    }).execute()
    return result.data[0]


@router.delete("/{coupon_id}", status_code=204)
def delete_coupon(coupon_id: UUID, admin=Depends(require_admin)):
    sb = get_supabase()
    existing = sb.table("coupons").select("code, type").eq("id", str(coupon_id)).limit(1).execute().data
    if not existing:
        raise HTTPException(404, "Cupón no encontrado")
    sb.table("coupons").delete().eq("id", str(coupon_id)).execute()
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "delete",
        "entity": "coupons",
        "entity_id": str(coupon_id),
        "diff_json": {"deleted": existing[0]},
    }).execute()
