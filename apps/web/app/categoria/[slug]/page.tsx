import { notFound } from 'next/navigation'
import { getCategoryBySlug, getProducts, NotFoundError } from '@/lib/api'
import Breadcrumbs from '@/components/Breadcrumbs'
import ProductGrid from '@/components/ProductGrid'
import Link from 'next/link'
import type { CategoryAttribute } from '@/types'
import type { Metadata } from 'next'

type Props = { params: { slug: string }; searchParams: { page?: string; min_price?: string; max_price?: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const cat = await getCategoryBySlug(params.slug)
    return { title: cat.name }
  } catch {
    return { title: 'Categoría' }
  }
}

function AttributeFilter({ attr }: { attr: CategoryAttribute }) {
  if (!attr.is_filterable) return null

  if (attr.type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name={`attr_${attr.name}`}
          id={`attr_${attr.name}`}
          value="true"
          className="accent-indigo-600"
        />
        <label htmlFor={`attr_${attr.name}`} className="text-sm text-zinc-700">
          {attr.name}
        </label>
      </div>
    )
  }

  if (attr.type === 'select' && attr.options_json?.length) {
    return (
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
          {attr.name}
        </label>
        <select
          name={`attr_${attr.name}`}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">Cualquiera</option>
          {attr.options_json.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  return null
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = params
  const pageNum = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const pageSize = 12

  let category
  try {
    category = await getCategoryBySlug(slug)
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    throw err
  }

  const productsRes = await getProducts({
    category_id: category.id,
    min_price: searchParams.min_price ? Number(searchParams.min_price) : undefined,
    max_price: searchParams.max_price ? Number(searchParams.max_price) : undefined,
    page: pageNum,
    page_size: pageSize,
  }).catch(() => ({ items: [] as never[], total: 0, page: pageNum, page_size: pageSize }))

  const totalPages = Math.ceil(productsRes.total / pageSize)
  const filterableAttrs = category.attributes.filter((a) => a.is_filterable)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs items={category.breadcrumbs} current={category.name} />
      </div>

      {/* Category header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          {category.icon && <span className="mr-2">{category.icon}</span>}
          {category.name}
        </h1>
        {category.description && (
          <p className="text-zinc-500 mt-2 text-sm leading-relaxed max-w-2xl">
            {category.description}
          </p>
        )}
        <p className="text-sm text-zinc-400 mt-1">
          {productsRes.total} producto{productsRes.total !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        {filterableAttrs.length > 0 && (
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <form method="GET" className="space-y-5 sticky top-24">
              <h3 className="text-sm font-bold text-zinc-800">Filtros</h3>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Precio (COP)
                </label>
                <div className="flex gap-2">
                  <input
                    name="min_price"
                    type="number"
                    min="0"
                    defaultValue={searchParams.min_price ?? ''}
                    placeholder="Mín"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <input
                    name="max_price"
                    type="number"
                    min="0"
                    defaultValue={searchParams.max_price ?? ''}
                    placeholder="Máx"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* Attribute filters */}
              {filterableAttrs.map((attr) => (
                <AttributeFilter key={attr.id} attr={attr} />
              ))}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
              >
                Filtrar
              </button>

              {(searchParams.min_price || searchParams.max_price) && (
                <Link
                  href={`/categoria/${slug}`}
                  className="block text-center text-sm text-zinc-400 hover:text-zinc-700"
                >
                  Limpiar filtros
                </Link>
              )}
            </form>
          </aside>
        )}

        {/* Product grid */}
        <main className="flex-1 min-w-0">
          <ProductGrid
            products={productsRes.items}
            emptyMessage="No hay productos en esta categoría aún."
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-10 flex justify-center gap-2">
              {pageNum > 1 && (
                <Link
                  href={`/categoria/${slug}?page=${pageNum - 1}`}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
                >
                  ← Anterior
                </Link>
              )}
              {pageNum < totalPages && (
                <Link
                  href={`/categoria/${slug}?page=${pageNum + 1}`}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
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
