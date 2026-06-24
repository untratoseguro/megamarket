import ProductCard from '@/components/ProductCard'
import type { ProductSummary } from '@/types'

interface ProductGridProps {
  products: ProductSummary[]
  emptyMessage?: string
}

export default function ProductGrid({ products, emptyMessage = 'No se encontraron productos.' }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-zinc-500 text-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
