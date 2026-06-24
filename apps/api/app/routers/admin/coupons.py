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
    return result.data[0]


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
    return result.data[0]


@router.delete("/{coupon_id}", status_code=204)
def delete_coupon(coupon_id: UUID, admin=Depends(require_admin)):
    sb = get_supabase()
    sb.table("coupons").delete().eq("id", str(coupon_id)).execute()
