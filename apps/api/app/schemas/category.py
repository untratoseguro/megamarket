from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CategoryAttributeSchema(BaseModel):
    id: UUID
    name: str
    type: str
    options_json: list | None = None
    is_filterable: bool
    is_required: bool
    sort_order: int


class CategoryNode(BaseModel):
    id: UUID
    parent_id: UUID | None = None
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    icon: str | None = None
    sort_order: int
    is_active: bool
    children: list[CategoryNode] = []


class Breadcrumb(BaseModel):
    id: UUID
    name: str
    slug: str


class CategoryDetail(BaseModel):
    id: UUID
    parent_id: UUID | None = None
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    icon: str | None = None
    sort_order: int
    is_active: bool
    created_at: datetime
    breadcrumbs: list[Breadcrumb]
    attributes: list[CategoryAttributeSchema]


class CategoriesTreeResponse(BaseModel):
    tree: list[CategoryNode]
    total: int
