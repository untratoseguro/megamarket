import { Suspense } from 'react'
import { getCategoriesTree, getProducts } from '@/lib/api'
import ProductGrid from '@/components/ProductGrid'
import Link from 'next/link'
import type { CategoryNode } from '@/types'

type SearchParams = {
  q?: string
  category_id?: string
  min_price?: string
  max_price?: string
  is_featured?: string
  page?: string
}

export const metadata = { title: 'Catálogo' }

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flattenCategories(n.children ?? [])])
}

export default async function CatalogoPage({ searchParams }: { searchParams: SearchParams }) {
  const {
    q,
    category_id,
    min_price,
    max_price,
    is_featured,
    page = '1',
  } = searchParams

  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const pageSize = 12

  const [categoriesRes, productsRes] = await Promise.all([
    getCategoriesTree().catch(() => ({ tree: [] as CategoryNode[], total: 0 })),
    getProducts({
      q,
      category_id,
      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,
      is_featured: is_featured === 'true' ? true : undefined,
      page: pageNum,
      page_size: pageSize,
    }).catch(() => ({ items: [] as never[], total: 0, page: pageNum, page_size: pageSize })),
  ])

  const allCats = flattenCategories(categoriesRes.tree)
  const totalPages = Math.ceil(productsRes.total / pageSize)

  // Build query string helper
  function qs(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (q) base.q = q
    if (category_id) base.category_id = category_id
    if (min_price) base.min_price = min_price
    if (max_price) base.max_price = max_price
    if (is_featured) base.is_featured = is_featured
    const merged = { ...base, ...overrides }
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== '') sp.set(k, v)
    }
    const s = sp.toString()
    return s ? `?${s}` : ''
  }

  const activeLabel = q
    ? `"${q}"`
    : category_id
      ? (allCats.find((c) => c.id === category_id)?.name ?? 'Categoría')
      : is_featured === 'true'
        ? 'Destacados'
        : 'Todos los productos'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <form method="GET" action="/catalogo" className="space-y-6 sticky top-24">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Buscar
              </label>
              <input
                name="q"
                defaultValue={q ?? ''}
                placeholder="Palabras clave…"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Categoría
              </label>
              <select
                name="category_id"
                defaultValue={category_id ?? ''}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">Todas</option>
                {allCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parent_id ? `  ${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price range */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Precio (COP)
              </label>
              <div className="flex gap-2">
                <input
                  name="min_price"
                  type="number"
                  min="0"
                  defaultValue={min_price ?? ''}
                  placeholder="Mín"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <input
                  name="max_price"
                  type="number"
                  min="0"
                  defaultValue={max_price ?? ''}
                  placeholder="Máx"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Featured */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_featured"
                id="is_featured"
                value="true"
                defaultChecked={is_featured === 'true'}
                className="accent-indigo-600"
              />
              <label htmlFor="is_featured" className="text-sm text-zinc-700">
                Solo destacados
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
            >
              Filtrar
            </button>

            {(q || category_id || min_price || max_price || is_featured) && (
              <Link
                href="/catalogo"
                className="block text-center text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                Limpiar filtros
              </Link>
            )}
          </form>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-900">{activeLabel}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                {productsRes.total} producto{productsRes.total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <Suspense fallback={<div className="text-center py-12 text-zinc-400">Cargando…</div>}>
            <ProductGrid
              products={productsRes.items}
              emptyMessage="No encontramos productos con esos filtros."
            />
          </Suspense>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-10 flex justify-center gap-2">
              {pageNum > 1 && (
                <Link
                  href={`/catalogo${qs({ page: String(pageNum - 1) })}`}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1
                return (
                  <Link
                    key={p}
                    href={`/catalogo${qs({ page: String(p) })}`}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      p === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-600 bg-white border border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {p}
                  </Link>
                )
              })}
              {pageNum < totalPages && (
                <Link
                  href={`/catalogo${qs({ page: String(pageNum + 1) })}`}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Siguiente →
                </Link>
              )}
            </nav>
          )}
        </main>
      </div>
    </div>
  )
}
