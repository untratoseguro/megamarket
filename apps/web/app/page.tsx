import Link from 'next/link'
import { getCategoriesTree, getProducts } from '@/lib/api'
import CategoryCard from '@/components/CategoryCard'
import ProductGrid from '@/components/ProductGrid'

export const revalidate = 60

export default async function HomePage() {
  const [categoriesRes, featuredRes] = await Promise.all([
    getCategoriesTree().catch(() => ({ tree: [] as never[], total: 0 })),
    getProducts({ is_featured: true, page_size: 8 }).catch(() => ({
      items: [] as never[],
      total: 0,
      page: 1,
      page_size: 8,
    })),
  ])

  const mainCategories = categoriesRes.tree.slice(0, 6)

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-800 text-white py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
            Encuentra todo<br />
            <span className="text-indigo-300">lo que necesitas</span>
          </h1>
          <p className="text-indigo-200 text-lg mb-10">
            Miles de productos en electrónica, hogar, deportes, moda y mucho más.
          </p>
          <form action="/catalogo" method="GET" className="flex gap-2 max-w-xl mx-auto">
            <input
              name="q"
              type="search"
              placeholder="¿Qué estás buscando?"
              className="flex-1 px-5 py-3 rounded-xl text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors text-sm shadow-lg"
            >
              Buscar
            </button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-indigo-300">
            {['Smartphones', 'Laptops', 'Televisores', 'Zapatillas', 'Libros'].map((term) => (
              <Link
                key={term}
                href={`/catalogo?q=${encodeURIComponent(term)}`}
                className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categorías */}
      {mainCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-zinc-900">Categorías</h2>
            <Link href="/catalogo" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              Ver todo →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {mainCategories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </section>
      )}

      {/* Productos destacados */}
      {featuredRes.items.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10 border-t border-zinc-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-zinc-900">Productos destacados</h2>
            <Link href="/catalogo?is_featured=true" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              Ver todos →
            </Link>
          </div>
          <ProductGrid products={featuredRes.items} />
        </section>
      )}

      {/* Todos los productos recientes */}
      <RecentProducts />
    </main>
  )
}

async function RecentProducts() {
  const res = await getProducts({ page_size: 8, page: 1 }).catch(() => ({
    items: [] as never[],
    total: 0,
    page: 1,
    page_size: 8,
  }))

  if (res.items.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 py-10 border-t border-zinc-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">Recién llegados</h2>
        <Link href="/catalogo" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          Ver catálogo →
        </Link>
      </div>
      <ProductGrid products={res.items} />
    </section>
  )
}
