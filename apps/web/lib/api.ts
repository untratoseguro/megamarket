import type {
  CategoryNode,
  CategoryDetail,
  ProductDetail,
  ProductsResponse,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export class NotFoundError extends Error {}
export class ApiError extends Error {}

async function apiFetch<T>(
  path: string,
  revalidate = 60,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate } })
  if (res.status === 404) throw new NotFoundError(path)
  if (!res.ok) throw new ApiError(`${res.status} ${path}`)
  return res.json() as Promise<T>
}

export type ProductsParams = {
  page?: number
  page_size?: number
  category_id?: string
  is_featured?: boolean
  min_price?: number
  max_price?: number
  q?: string
  attributes?: string
}

export async function getCategoriesTree() {
  return apiFetch<{ tree: CategoryNode[]; total: number }>('/categories/tree', 300)
}

export async function getCategoryBySlug(slug: string) {
  return apiFetch<CategoryDetail>(`/categories/${slug}`, 300)
}

export async function getProducts(params?: ProductsParams) {
  const sp = new URLSearchParams()
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        sp.set(key, String(val))
      }
    }
  }
  const qs = sp.toString()
  return apiFetch<ProductsResponse>(`/products${qs ? `?${qs}` : ''}`, 30)
}

export async function getProductBySlug(slug: string) {
  return apiFetch<ProductDetail>(`/products/${slug}`, 120)
}
