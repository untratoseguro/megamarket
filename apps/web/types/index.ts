export interface CategoryNode {
  id: string
  parent_id: string | null
  name: string
  slug: string
  description: string | null
  image_url: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  children: CategoryNode[]
}

export interface CategoryAttribute {
  id: string
  name: string
  type: 'text' | 'number' | 'select' | 'boolean'
  options_json: string[] | null
  is_filterable: boolean
  is_required: boolean
  sort_order: number
}

export interface Breadcrumb {
  id: string
  name: string
  slug: string
}

export interface CategoryDetail {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  icon: string | null
  breadcrumbs: Breadcrumb[]
  attributes: CategoryAttribute[]
}

export interface ProductSummary {
  id: string
  title: string
  slug: string
  sku: string
  brand: string | null
  short_description: string | null
  price: number
  compare_at_price: number | null
  stock_quantity: number
  rating: number
  review_count: number
  category_id: string | null
  attributes_json: Record<string, unknown>
  is_featured: boolean
  is_active: boolean
}

export interface ProductVariant {
  id: string
  sku: string
  attributes_json: Record<string, unknown>
  price: number | null
  stock_quantity: number
  image_url: string | null
}

export interface ProductDetail extends ProductSummary {
  long_description: string | null
  created_at: string
  updated_at: string
  product_variants: ProductVariant[]
}

export interface ProductsResponse {
  items: ProductSummary[]
  total: number
  page: number
  page_size: number
}
