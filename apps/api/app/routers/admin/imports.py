"""
Import de productos vía CSV o XLSX.

Decisión de UPSERT: en conflicto de SKU se sobrescribe el producto existente.
Motivo: los imports se usan principalmente para carga inicial y re-importación
de catálogos de proveedor (precios/stock actualizados). Un comportamiento
fail-on-duplicate obligaría a calcular deltas manualmente para catálogos
grandes. El trade-off (sobreescritura accidental) se mitiga con audit_logs.

Para feeds automáticos futuros (ChinaLink, Alibaba): cambia solo el trigger
y source='api_feed'. El worker de procesamiento es idéntico a este.

Columnas del CSV/XLSX:
  Obligatorias: title, sku, price, category_slug, stock_quantity
  Opcionales: compare_at_price, brand, short_description, long_description,
              is_featured, is_active, attributes_json (string JSON válido)
"""
import csv
import io
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import openpyxl
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import ValidationError

from app.core.supabase import get_supabase
from app.deps.auth import require_admin
from app.schemas.admin import ImportJobOut, ProductIn

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-imports"])

# Límite de tamaño del archivo: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_TYPES = {
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/plain",                     # algunos CSV se suben como text/plain
    "application/octet-stream",       # fallback genérico
}

REQUIRED_COLUMNS = {"title", "sku", "price", "category_slug", "stock_quantity"}

OPTIONAL_COLUMNS = {
    "compare_at_price", "brand", "short_description", "long_description",
    "is_featured", "is_active", "attributes_json",
}

CSV_TEMPLATE = (
    "title,sku,price,category_slug,stock_quantity,"
    "compare_at_price,brand,short_description,is_featured,is_active,attributes_json\n"
    'Producto ejemplo,SKU-001,29.99,electronica,100,'
    '39.99,MarcaEjemplo,Descripción corta,false,true,"{""color"":""rojo""}"\n'
)


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[-\s]+", "-", text)
    return text[:100].strip("-")


def _unique_slug_for_import(base: str, sb) -> str:
    slug = base
    for n in range(2, 500):
        if not sb.table("products").select("id").eq("slug", slug).limit(1).execute().data:
            return slug
        slug = f"{base}-{n}"
    return slug


def _parse_rows_from_bytes(file_bytes: bytes, filename: str) -> tuple[list[dict], str | None]:
    """Parsea CSV o XLSX a lista de dicts. Retorna (rows, error_msg)."""
    is_xlsx = filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls")

    if is_xlsx:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
            ws = wb.active
            rows_iter = ws.iter_rows(values_only=True)
            headers = [str(h).strip() if h is not None else "" for h in next(rows_iter, [])]
            rows = [
                {headers[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(row) if i < len(headers)}
                for row in rows_iter
                if any(v is not None for v in row)
            ]
        except Exception as exc:
            return [], f"Error parseando XLSX: {exc}"
    else:
        try:
            text = file_bytes.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(text))
            rows = [{k.strip(): (v.strip() if v else "") for k, v in row.items()} for row in reader]
        except Exception as exc:
            return [], f"Error parseando CSV: {exc}"

    return rows, None


def _process_import(job_id: str, admin_id: str, bucket_path: str, filename: str) -> None:
    """
    Worker que corre como BackgroundTask.
    1. Descarga el archivo de Supabase Storage.
    2. Parsea fila por fila usando ProductIn (misma validación que CRUD individual).
    3. UPSERT por SKU.
    4. Actualiza import_job con progreso y resultado.
    """
    sb = get_supabase()

    # Marcar como 'processing'
    sb.table("import_jobs").update({
        "status": "processing",
        "started_at": datetime.now(tz=timezone.utc).isoformat(),
    }).eq("id", job_id).execute()

    # Descargar archivo de Storage
    try:
        file_bytes = sb.storage.from_("imports").download(bucket_path)
    except Exception as exc:
        logger.error("import %s: error descargando archivo: %s", job_id, exc)
        sb.table("import_jobs").update({
            "status": "failed",
            "completed_at": datetime.now(tz=timezone.utc).isoformat(),
            "errors_json": [{"row": 0, "field": "_file", "error": f"No se pudo descargar el archivo: {exc}"}],
        }).eq("id", job_id).execute()
        return

    # Parsear
    rows, parse_error = _parse_rows_from_bytes(file_bytes, filename)
    if parse_error:
        sb.table("import_jobs").update({
            "status": "failed",
            "completed_at": datetime.now(tz=timezone.utc).isoformat(),
            "errors_json": [{"row": 0, "field": "_file", "error": parse_error}],
        }).eq("id", job_id).execute()
        return

    if not rows:
        sb.table("import_jobs").update({
            "status": "failed",
            "completed_at": datetime.now(tz=timezone.utc).isoformat(),
            "errors_json": [{"row": 0, "field": "_file", "error": "El archivo no contiene filas de datos"}],
        }).eq("id", job_id).execute()
        return

    # Verificar columnas obligatorias
    sample_keys = set(rows[0].keys())
    missing_cols = REQUIRED_COLUMNS - sample_keys
    if missing_cols:
        sb.table("import_jobs").update({
            "status": "failed",
            "completed_at": datetime.now(tz=timezone.utc).isoformat(),
            "errors_json": [{"row": 0, "field": "_columns", "error": f"Columnas obligatorias faltantes: {sorted(missing_cols)}"}],
        }).eq("id", job_id).execute()
        return

    # Actualizar total_rows
    total = len(rows)
    sb.table("import_jobs").update({"total_rows": total}).eq("id", job_id).execute()

    # Construir caché de category_slug → category_id
    cats = sb.table("categories").select("id, slug").execute().data or []
    cat_by_slug: dict[str, str] = {c["slug"]: c["id"] for c in cats}

    errors: list[dict] = []
    success_count = 0

    for row_num, raw in enumerate(rows, start=2):  # row 1 = headers
        row_errors: list[dict] = []

        # Resolver category_slug → category_id
        cat_slug = raw.get("category_slug", "").strip()
        category_id: str | None = cat_by_slug.get(cat_slug)
        if cat_slug and not category_id:
            row_errors.append({"row": row_num, "field": "category_slug", "error": f"Categoría '{cat_slug}' no encontrada"})

        # Parsear attributes_json
        attrs: dict = {}
        raw_attrs = raw.get("attributes_json", "")
        if raw_attrs:
            try:
                attrs = json.loads(raw_attrs)
                if not isinstance(attrs, dict):
                    raise ValueError("Debe ser un objeto JSON")
            except Exception as exc:
                row_errors.append({"row": row_num, "field": "attributes_json", "error": str(exc)})

        # Construir dict para ProductIn
        try:
            product_data: dict[str, Any] = {
                "title": raw.get("title", ""),
                "sku": raw.get("sku", ""),
                "price": raw.get("price", ""),
                "stock_quantity": int(raw.get("stock_quantity") or 0),
                "category_id": category_id,
                "attributes_json": attrs,
            }
            if raw.get("compare_at_price"):
                product_data["compare_at_price"] = raw["compare_at_price"]
            if raw.get("brand"):
                product_data["brand"] = raw["brand"]
            if raw.get("short_description"):
                product_data["short_description"] = raw["short_description"]
            if raw.get("long_description"):
                product_data["long_description"] = raw["long_description"]
            if raw.get("is_featured"):
                product_data["is_featured"] = raw["is_featured"].lower() in ("true", "1", "yes", "si")
            if raw.get("is_active"):
                product_data["is_active"] = raw["is_active"].lower() in ("true", "1", "yes", "si")

            validated = ProductIn(**product_data)
        except (ValidationError, ValueError, TypeError) as exc:
            for err in (exc.errors() if hasattr(exc, "errors") else [{"loc": ("_row",), "msg": str(exc)}]):
                field = ".".join(str(loc) for loc in err.get("loc", ("_row",)))
                row_errors.append({"row": row_num, "field": field, "error": err.get("msg", str(err))})

        if row_errors:
            errors.extend(row_errors)
            # Actualizar progreso cada 50 filas
            if row_num % 50 == 0:
                sb.table("import_jobs").update({
                    "processed_rows": row_num - 1,
                    "success_count": success_count,
                    "error_count": len(errors),
                }).eq("id", job_id).execute()
            continue

        # UPSERT por SKU (decisión: sobrescribir en conflicto)
        try:
            slug = _slugify(validated.title)
            upsert_data = {
                "title": validated.title,
                "sku": validated.sku,
                "price": float(validated.price),
                "stock_quantity": validated.stock_quantity,
                "category_id": str(validated.category_id) if validated.category_id else None,
                "attributes_json": validated.attributes_json,
                "is_featured": validated.is_featured,
                "is_active": validated.is_active,
            }
            if validated.compare_at_price:
                upsert_data["compare_at_price"] = float(validated.compare_at_price)
            if validated.brand:
                upsert_data["brand"] = validated.brand
            if validated.short_description:
                upsert_data["short_description"] = validated.short_description
            if validated.long_description:
                upsert_data["long_description"] = validated.long_description

            # Verificar si ya existe (para asignar slug solo en INSERT)
            existing = sb.table("products").select("id, slug").eq("sku", validated.sku).limit(1).execute().data
            if existing:
                upsert_data["slug"] = existing[0]["slug"]  # preservar slug existente en update
            else:
                upsert_data["slug"] = _unique_slug_for_import(slug, sb)

            sb.table("products").upsert(upsert_data, on_conflict="sku").execute()
            success_count += 1
        except Exception as exc:
            errors.append({"row": row_num, "field": "_db", "error": str(exc)})

        # Actualizar progreso cada 50 filas
        if row_num % 50 == 0:
            sb.table("import_jobs").update({
                "processed_rows": row_num - 1,
                "success_count": success_count,
                "error_count": len(errors),
            }).eq("id", job_id).execute()

    final_status = "completed" if not errors else "completed_with_errors"
    sb.table("import_jobs").update({
        "status": final_status,
        "processed_rows": total,
        "success_count": success_count,
        "error_count": len(errors),
        "errors_json": errors or None,
        "completed_at": datetime.now(tz=timezone.utc).isoformat(),
    }).eq("id", job_id).execute()

    logger.info("import %s completado: %d éxitos, %d errores", job_id, success_count, len(errors))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/template.csv")
def download_template(admin=Depends(require_admin)):
    from fastapi.responses import Response
    return Response(
        content=CSV_TEMPLATE,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=megamarket_import_template.csv"},
    )


@router.post("/upload", response_model=ImportJobOut, status_code=202)
async def upload_import(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    """
    Acepta CSV o XLSX. Sube a Supabase Storage bucket 'imports' (privado),
    crea import_job y devuelve 202 inmediatamente. El procesamiento ocurre en background.
    """
    if not file.filename:
        raise HTTPException(400, "Nombre de archivo requerido")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(400, "Solo se aceptan archivos .csv, .xlsx o .xls")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Archivo demasiado grande (máximo {MAX_FILE_SIZE // 1024 // 1024} MB)")

    sb = get_supabase()

    # Crear job primero para obtener job_id
    job_result = sb.table("import_jobs").insert({
        "admin_user_id": admin["id"],
        "source": "csv_upload",
        "filename": file.filename,
        "status": "pending",
    }).execute()
    job = job_result.data[0]
    job_id = job["id"]

    # Subir al bucket privado 'imports'
    bucket_path = f"{admin['id']}/{job_id}/{file.filename}"
    try:
        sb.storage.from_("imports").upload(
            bucket_path,
            file_bytes,
            {"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as exc:
        sb.table("import_jobs").update({"status": "failed"}).eq("id", job_id).execute()
        raise HTTPException(502, f"Error subiendo archivo a Storage: {exc}")

    # Encolar worker
    background_tasks.add_task(_process_import, job_id, admin["id"], bucket_path, file.filename)

    return ImportJobOut(**job)


@router.get("", response_model=list[ImportJobOut])
def list_import_jobs(admin=Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("import_jobs").select("*").eq("admin_user_id", admin["id"]).order("created_at", desc=True).limit(50).execute().data
    return rows or []


@router.get("/{job_id}", response_model=ImportJobOut)
def get_import_job(job_id: UUID, admin=Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("import_jobs").select("*").eq("id", str(job_id)).eq("admin_user_id", admin["id"]).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Job no encontrado")
    return rows[0]
