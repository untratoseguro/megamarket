import re
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.supabase import get_supabase
from app.deps.auth import require_admin
from app.schemas.admin import CategoryAttrIn, CategoryAttrOut, CategoryIn, CategoryOut

router = APIRouter(tags=["admin-categories"])


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[-\s]+", "-", text)
    return text[:100].strip("-")


def _unique_slug(base: str) -> str:
    sb = get_supabase()
    slug = base
    for n in range(2, 200):
        exists = sb.table("categories").select("id").eq("slug", slug).limit(1).execute().data
        if not exists:
            return slug
        slug = f"{base}-{n}"
    return slug


# ── Categories CRUD ───────────────────────────────────────────────────────────

@router.get("", response_model=list[CategoryOut])
def list_categories(admin=Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("categories").select(
        "id, name, slug, parent_id, description, image_url, icon, sort_order, is_active, created_at"
    ).order("sort_order").order("name").execute().data
    return rows


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(body: CategoryIn, admin=Depends(require_admin)):
    sb = get_supabase()
    slug = body.slug or _unique_slug(_slugify(body.name))
    data = body.model_dump(exclude={"slug"})
    data["slug"] = slug
    data["parent_id"] = str(data["parent_id"]) if data.get("parent_id") else None
    result = sb.table("categories").insert(data).execute()
    cat = result.data[0]
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "create",
        "entity": "categories",
        "entity_id": str(cat["id"]),
        "diff_json": {"name": cat["name"], "slug": cat["slug"]},
    }).execute()
    return cat


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(category_id: UUID, body: CategoryIn, admin=Depends(require_admin)):
    sb = get_supabase()
    data = body.model_dump(exclude_none=True)
    if "parent_id" in data:
        data["parent_id"] = str(data["parent_id"]) if data["parent_id"] else None
    result = sb.table("categories").update(data).eq("id", str(category_id)).execute()
    if not result.data:
        raise HTTPException(404, "Categoría no encontrada")
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "update",
        "entity": "categories",
        "entity_id": str(category_id),
        "diff_json": {"changes": {k: str(v) if not isinstance(v, (str, bool, int, float, type(None))) else v for k, v in data.items()}},
    }).execute()
    return result.data[0]


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: UUID, admin=Depends(require_admin)):
    sb = get_supabase()
    existing = sb.table("categories").select("name, slug").eq("id", str(category_id)).limit(1).execute().data
    if not existing:
        raise HTTPException(404, "Categoría no encontrada")
    products = sb.table("products").select("id").eq("category_id", str(category_id)).limit(1).execute()
    if products.data:
        raise HTTPException(409, "La categoría tiene productos asignados. Reasígnalos antes de eliminar.")
    sb.table("categories").delete().eq("id", str(category_id)).execute()
    sb.table("audit_logs").insert({
        "actor_id": admin["id"],
        "action": "delete",
        "entity": "categories",
        "entity_id": str(category_id),
        "diff_json": {"deleted": existing[0]},
    }).execute()


@router.post("/{category_id}/image")
async def upload_category_image(
    category_id: UUID,
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    """Sube imagen de categoría a Supabase Storage bucket 'products' (público)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "El archivo debe ser una imagen")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    path = f"categories/{category_id}.{ext}"
    data = await file.read()

    sb = get_supabase()
    try:
        sb.storage.from_("products").upload(path, data, {"content-type": file.content_type, "upsert": "true"})
    except Exception as exc:
        raise HTTPException(502, f"Error subiendo imagen: {exc}")

    public_url = sb.storage.from_("products").get_public_url(path)
    sb.table("categories").update({"image_url": public_url}).eq("id", str(category_id)).execute()
    return {"image_url": public_url}


# ── Category attributes CRUD ──────────────────────────────────────────────────

@router.get("/{category_id}/attributes", response_model=list[CategoryAttrOut])
def list_attributes(category_id: UUID, admin=Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("category_attributes").select("*").eq("category_id", str(category_id)).order("sort_order").execute().data
    return rows


@router.post("/{category_id}/attributes", response_model=CategoryAttrOut, status_code=201)
def create_attribute(category_id: UUID, body: CategoryAttrIn, admin=Depends(require_admin)):
    sb = get_supabase()
    data = body.model_dump()
    data["category_id"] = str(category_id)
    result = sb.table("category_attributes").insert(data).execute()
    return result.data[0]


@router.patch("/{category_id}/attributes/{attr_id}", response_model=CategoryAttrOut)
def update_attribute(category_id: UUID, attr_id: UUID, body: CategoryAttrIn, admin=Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("category_attributes").update(body.model_dump()).eq("id", str(attr_id)).eq("category_id", str(category_id)).execute()
    if not result.data:
        raise HTTPException(404, "Atributo no encontrado")
    return result.data[0]


@router.delete("/{category_id}/attributes/{attr_id}", status_code=204)
def delete_attribute(category_id: UUID, attr_id: UUID, admin=Depends(require_admin)):
    sb = get_supabase()
    sb.table("category_attributes").delete().eq("id", str(attr_id)).eq("category_id", str(category_id)).execute()
