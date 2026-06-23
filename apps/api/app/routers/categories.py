import json
from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.core.supabase import get_supabase
from app.schemas.category import (
    Breadcrumb,
    CategoriesTreeResponse,
    CategoryAttributeSchema,
    CategoryDetail,
    CategoryNode,
)

router = APIRouter(tags=["categories"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_tree(flat: list[dict]) -> list[CategoryNode]:
    """Convierte lista plana de categorías en árbol, ordenando por sort_order."""
    nodes: dict[str, CategoryNode] = {c["id"]: CategoryNode(**c) for c in flat}
    roots: list[CategoryNode] = []

    for node in nodes.values():
        parent_id = node.parent_id
        if parent_id is None or str(parent_id) not in nodes:
            roots.append(node)
        else:
            nodes[str(parent_id)].children.append(node)

    def sort_recursive(items: list[CategoryNode]) -> None:
        items.sort(key=lambda n: n.sort_order)
        for item in items:
            sort_recursive(item.children)

    sort_recursive(roots)
    return roots


def _build_breadcrumbs(
    category: dict,
    all_by_id: dict[str, dict],
) -> list[Breadcrumb]:
    """Construye la ruta desde la raíz hasta la categoría actual."""
    crumbs: list[Breadcrumb] = []
    current: dict | None = category
    while current:
        crumbs.insert(0, Breadcrumb(id=current["id"], name=current["name"], slug=current["slug"]))
        parent_id = current.get("parent_id")
        current = all_by_id.get(parent_id) if parent_id else None
    return crumbs


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/tree", response_model=CategoriesTreeResponse)
def get_categories_tree() -> CategoriesTreeResponse:
    """
    Árbol jerárquico completo de categorías activas.
    Construido en memoria: solo 1 query a DB.
    """
    sb = get_supabase()
    result = (
        sb.table("categories")
        .select("id, parent_id, name, slug, description, image_url, icon, sort_order, is_active")
        .eq("is_active", True)
        .execute()
    )
    flat = result.data or []
    tree = _build_tree(flat)
    return CategoriesTreeResponse(tree=tree, total=len(flat))


@router.get("/{slug}", response_model=CategoryDetail)
def get_category_by_slug(slug: str) -> CategoryDetail:
    """
    Detalle de una categoría + breadcrumbs + atributos definidos.
    Breadcrumbs se construyen desde una segunda query de todas las categorías
    para evitar N+1.
    """
    sb = get_supabase()

    # 1. Categoría con sus atributos
    cat_result = (
        sb.table("categories")
        .select("*, category_attributes(id, name, type, options_json, is_filterable, is_required, sort_order)")
        .eq("slug", slug)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not cat_result.data:
        raise HTTPException(status_code=404, detail=f"Categoría '{slug}' no encontrada")
    cat = cat_result.data[0]

    # 2. Todas las categorías para construir breadcrumbs (tabla pequeña → OK)
    all_result = (
        sb.table("categories")
        .select("id, parent_id, name, slug")
        .execute()
    )
    all_by_id: dict[str, dict] = {c["id"]: c for c in (all_result.data or [])}
    breadcrumbs = _build_breadcrumbs(cat, all_by_id)

    # 3. Atributos ordenados
    raw_attrs: list[dict] = sorted(
        cat.get("category_attributes") or [],
        key=lambda a: a.get("sort_order", 0),
    )
    attributes = [CategoryAttributeSchema(**a) for a in raw_attrs]

    return CategoryDetail(
        id=cat["id"],
        parent_id=cat.get("parent_id"),
        name=cat["name"],
        slug=cat["slug"],
        description=cat.get("description"),
        image_url=cat.get("image_url"),
        icon=cat.get("icon"),
        sort_order=cat["sort_order"],
        is_active=cat["is_active"],
        created_at=cat["created_at"],
        breadcrumbs=breadcrumbs,
        attributes=attributes,
    )
