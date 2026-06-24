import re
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.core.supabase import get_supabase
from app.deps.auth import require_admin
from app.schemas.admin import ProductAdminOut, ProductIn, ProductVariantIn
from app.schemas.product import (
    ProductDetail,
    ProductsResponse,
    ProductSummary,
    ProductVariantSchema,
)

router = APIRouter(tags=["admin-products"])


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[-\s]+", "-", text)
    return text[:100].strip("-")


def _unique_slug(base: str, exclude_id: str | None = None) -> str:
    sb = get_supabase()
    slug = base
    for n in range(2, 200):
        q = sb.table("products").select("id").eq("slug", slug)
        if exclude_id:
            q = q.neq("id", exclude_id)
        if not q.limit(1).execute().data:
            return slug
        slug = f"{base}-{n}"
    return slug


def _validate_attrs_against_category(category_id: str | None, attrs: dict) -> None:
    """Verifica que los atributos requeridos de la categoría estén presentes."""
    if not category_id or not attrs:
        return
    sb = get_supabase()
    required = sb.table("category_attributes").select("name").eq("category_id", category_id).eq("is_required", True).execute().data or []
    missing = [r["name"] for r in required if r["name"] not in attrs]
    if missing:
        raise HTTPException(422, f"Atributos requeridos faltantes: {missing}")


# ── Products CRUD ─────────────────────────────────────────────────────────────

@router.get("", response_model=ProductsResponse)
def list_products_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    q: str | None = None,
    admin=Depends(require_admin),
):
    sb = get_supabase()
    query = sb.table("products").select(
        "id, title, slug, sku, brand, price, compare_at_price, stock_quantity, "
        "category_id, is_featured, is_active, rating, review_count, "
        "attributes_json, short_description, created_at, updated_at",
        count="exact",
    )
    if q:
        query = query.or_(f"title.ilike.%{q}%,sku.ilike.%{q}%")
    start = (page - 1) * page_size
    result = query.order("created_at", desc=True).range(start, start + page_size - 1).execute()
    items = [ProductSummary(**p) for p in (result.data or [])]
    return ProductsResponse(items=items, total=result.count or 0, page=page, page_size=page_size)


@router.post("", response_model=ProductAdminOut, status_code=201)
def create_product(body: ProductIn, admin=Depends(require_admin)):
    sb = get_supabase()
    slug = body.slug or _unique_slug(_slugify(body.title))
    category_id_str = str(body.category_id) if body.category_id else None
    _validate_attrs_against_category(category_id_str, body.attributes_json)

    data = body.model_dump(mode="json", exclude={"slug"})
    data["slug"] = slug
    data["category_id"] = category_id_str
    data["price"] = float(body.price)
    data["compare_at_price"] = float(body.compare_at_price) if body.compare_at_price else None

    result = sb.table("products").insert(data).execute()
    product = result.data[0]
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "create",
        "entity": "products",
        "entity_id": str(product["id"]),
        "diff_json": {"title": product["title"], "sku": product["sku"], "price": str(body.price)},
    }).execute()
    return product


@router.get("/{product_id}", response_model=ProductDetail)
def get_product_admin(product_id: UUID, admin=Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("products").select("*, product_variants(id, sku, attributes_json, price, stock_quantity, image_url)").eq("id", str(product_id)).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Producto no encontrado")
    p = rows[0]
    variants = [ProductVariantSchema(**v) for v in (p.get("product_variants") or [])]
    return ProductDetail(**{k: v for k, v in p.items() if k != "product_variants"}, variants=variants)


@router.patch("/{product_id}", response_model=ProductAdminOut)
def update_product(product_id: UUID, body: ProductIn, admin=Depends(require_admin)):
    sb = get_supabase()
    category_id_str = str(body.category_id) if body.category_id else None
    _validate_attrs_against_category(category_id_str, body.attributes_json)

    data = body.model_dump(mode="json", exclude_none=True)
    if body.slug is None:
        data.pop("slug", None)
    data["category_id"] = category_id_str
    data["price"] = float(body.price)
    if body.compare_at_price:
        data["compare_at_price"] = float(body.compare_at_price)

    result = sb.table("products").update(data).eq("id", str(product_id)).execute()
    if not result.data:
        raise HTTPException(404, "Producto no encontrado")
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "update",
        "entity": "products",
        "entity_id": str(product_id),
        "diff_json": {"title": body.title, "sku": body.sku, "price": str(body.price), "is_active": body.is_active},
    }).execute()
    return result.data[0]


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: UUID, admin=Depends(require_admin)):
    """Soft-delete: deshabilita el producto (no elimina del DB para preservar order_items)."""
    sb = get_supabase()
    existing = sb.table("products").select("title, sku").eq("id", str(product_id)).limit(1).execute().data
    if not existing:
        raise HTTPException(404, "Producto no encontrado")
    result = sb.table("products").update({"is_active": False}).eq("id", str(product_id)).execute()
    if not result.data:
        raise HTTPException(404, "Producto no encontrado")
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "soft_delete",
        "entity": "products",
        "entity_id": str(product_id),
        "diff_json": {"title": existing[0]["title"], "sku": existing[0]["sku"], "is_active": False},
    }).execute()


# ── Variants CRUD ─────────────────────────────────────────────────────────────

@router.post("/{product_id}/variants", status_code=201)
def create_variant(product_id: UUID, body: ProductVariantIn, admin=Depends(require_admin)):
    sb = get_supabase()
    data = body.model_dump(mode="json")
    data["product_id"] = str(product_id)
    if body.price is not None:
        data["price"] = float(body.price)
    result = sb.table("product_variants").insert(data).execute()
    return result.data[0]


@router.patch("/{product_id}/variants/{variant_id}")
def update_variant(product_id: UUID, variant_id: UUID, body: ProductVariantIn, admin=Depends(require_admin)):
    sb = get_supabase()
    data = body.model_dump(mode="json", exclude_none=True)
    if body.price is not None:
        data["price"] = float(body.price)
    result = sb.table("product_variants").update(data).eq("id", str(variant_id)).eq("product_id", str(product_id)).execute()
    if not result.data:
        raise HTTPException(404, "Variante no encontrada")
    return result.data[0]


@router.delete("/{product_id}/variants/{variant_id}", status_code=204)
def delete_variant(product_id: UUID, variant_id: UUID, admin=Depends(require_admin)):
    sb = get_supabase()
    sb.table("product_variants").delete().eq("id", str(variant_id)).eq("product_id", str(product_id)).execute()


@router.post("/{product_id}/variants/{variant_id}/image")
async def upload_variant_image(
    product_id: UUID,
    variant_id: UUID,
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    """Sube imagen de variante al bucket público 'products' (service_role)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "El archivo debe ser una imagen")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    path = f"variants/{product_id}/{variant_id}.{ext}"
    data = await file.read()

    sb = get_supabase()
    try:
        sb.storage.from_("products").upload(path, data, {"content-type": file.content_type, "upsert": "true"})
    except Exception as exc:
        raise HTTPException(502, f"Error subiendo imagen: {exc}")

    public_url = sb.storage.from_("products").get_public_url(path)
    sb.table("product_variants").update({"image_url": public_url}).eq("id", str(variant_id)).execute()
    return {"image_url": public_url}
