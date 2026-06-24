from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.supabase import get_supabase
from app.deps.auth import require_auth

router = APIRouter(tags=["favorites"])


class FavoriteOut(BaseModel):
    id: str
    product_id: str
    product_title: str
    product_slug: str
    product_price: float
    created_at: str


@router.get("", response_model=list[FavoriteOut])
def get_favorites(profile: dict = Depends(require_auth)):
    sb = get_supabase()
    rows = sb.table("favorites").select(
        "id, product_id, created_at, products(title, slug, price)"
    ).eq("user_id", profile["id"]).order("created_at", desc=True).execute().data

    return [
        FavoriteOut(
            id=row["id"],
            product_id=row["product_id"],
            product_title=(row.get("products") or {}).get("title", ""),
            product_slug=(row.get("products") or {}).get("slug", ""),
            product_price=float((row.get("products") or {}).get("price", 0)),
            created_at=row["created_at"],
        )
        for row in rows
    ]


@router.post("/{product_id}", status_code=201)
def add_favorite(product_id: UUID, profile: dict = Depends(require_auth)):
    sb = get_supabase()

    existing = sb.table("favorites").select("id").eq("user_id", profile["id"]).eq("product_id", str(product_id)).limit(1).execute()
    if existing.data:
        return {"id": existing.data[0]["id"], "product_id": str(product_id), "already": True}

    result = sb.table("favorites").insert({"user_id": profile["id"], "product_id": str(product_id)}).execute()
    return {"id": result.data[0]["id"], "product_id": str(product_id), "already": False}


@router.delete("/{product_id}", status_code=200)
def remove_favorite(product_id: UUID, profile: dict = Depends(require_auth)):
    sb = get_supabase()
    result = sb.table("favorites").delete().eq("user_id", profile["id"]).eq("product_id", str(product_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
    return {"deleted": True}
