import json

from fastapi import APIRouter, Depends, HTTPException

from app.core.supabase import get_supabase
from app.schemas.product import (
    ProductDetail,
    ProductsFilter,
    ProductsResponse,
    ProductSummary,
    ProductVariantSchema,
)

router = APIRouter(tags=["products"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_filterable_attr_names(category_id: str) -> set[str]:
    """Retorna el conjunto de claves filtrables para una categoría."""
    sb = get_supabase()
    result = (
        sb.table("category_attributes")
        .select("name")
        .eq("category_id", category_id)
        .eq("is_filterable", True)
        .execute()
    )
    return {row["name"] for row in (result.data or [])}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=ProductsResponse)
def list_products(filters: ProductsFilter = Depends()) -> ProductsResponse:
    """
    Lista paginada de productos activos con filtros opcionales.

    Filtros disponibles (todos opcionales):
    - category_id: UUID
    - is_featured: bool
    - min_price / max_price: decimal
    - q: búsqueda por título (ILIKE)
    - attributes: JSON string con atributos filtrables, ej: {"brand":"Samsung"}
      → usa índice GIN (@> operator) si category_id también está presente,
        las claves se validan contra category_attributes.
    """
    sb = get_supabase()

    # Validación de claves en attributes contra whitelist de la categoría
    attrs_dict: dict | None = None
    if filters.attributes:
        attrs_dict = json.loads(filters.attributes)
        if filters.category_id and attrs_dict:
            allowed = _get_filterable_attr_names(str(filters.category_id))
            unknown = set(attrs_dict.keys()) - allowed
            if unknown:
                raise HTTPException(
                    status_code=400,
                    detail=f"Atributos no filtrables para esta categoría: {sorted(unknown)}",
                )

    # Construcción de la query
    q = (
        sb.table("products")
        .select(
            "id, title, slug, sku, brand, short_description, price, compare_at_price, "
            "stock_quantity, rating, review_count, category_id, attributes_json, "
            "is_featured, is_active",
            count="exact",
        )
        .eq("is_active", True)
    )

    if filters.category_id:
        q = q.eq("category_id", str(filters.category_id))
    if filters.is_featured is not None:
        q = q.eq("is_featured", filters.is_featured)
    if filters.min_price is not None:
        q = q.gte("price", str(filters.min_price))
    if filters.max_price is not None:
        q = q.lte("price", str(filters.max_price))
    if filters.q:
        q = q.ilike("title", f"%{filters.q}%")
    if attrs_dict:
        # @> en jsonb → usa el índice GIN
        q = q.filter("attributes_json", "cs", json.dumps(attrs_dict))

    start = (filters.page - 1) * filters.page_size
    end = start + filters.page_size - 1
    result = q.order("created_at", desc=True).range(start, end).execute()

    items = [ProductSummary(**p) for p in (result.data or [])]
    return ProductsResponse(
        items=items,
        total=result.count or 0,
        page=filters.page,
        page_size=filters.page_size,
    )


@router.get("/{slug}", response_model=ProductDetail)
def get_product_by_slug(slug: str) -> ProductDetail:
    """
    Detalle de un producto activo + variantes en una sola query.
    """
    sb = get_supabase()
    result = (
        sb.table("products")
        .select("*, product_variants(id, sku, attributes_json, price, stock_quantity, image_url)")
        .eq("slug", slug)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Producto '{slug}' no encontrado")

    p = result.data[0]
    variants = [ProductVariantSchema(**v) for v in (p.get("product_variants") or [])]
    return ProductDetail(**{k: v for k, v in p.items() if k != "product_variants"}, variants=variants)
