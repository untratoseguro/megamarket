import Link from 'next/link'
import { formatCOP, discountPct, placeholderColor } from '@/lib/utils'
import type { ProductSummary } from '@/types'

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.round(rating)
  return (
    <div className="flex items-center gap-1">
      <span className="text-amber-400 text-xs tracking-tight">
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
      <span className="text-xs text-zinc-400">({count})</span>
    </div>
  )
}

export default function ProductCard({ product }: { product: ProductSummary }) {
  const discount = product.compare_at_price
    ? discountPct(product.price, product.compare_at_price)
    : null

  const bg = placeholderColor(product.slug)
  const letter = product.title[0]?.toUpperCase() ?? '?'

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <article className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all duration-200">
        <div className="relative aspect-square flex items-center justify-center" style={{ background: bg }}>
          <span className="text-7xl font-black text-white/25 select-none">{letter}</span>
          {product.is_featured && (
            <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Destacado
            </span>
          )}
          {discount !== null && (
            <span className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
        </div>

        <div className="p-4">
          {product.brand && (
            <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide mb-1">{product.brand}</p>
          )}
          <h3 className="text-sm font-semibold text-zinc-800 line-clamp-2 group-hover:text-indigo-700 transition-colors mb-2 leading-snug">
            {product.title}
          </h3>

          {product.review_count > 0 && (
            <div className="mb-2">
              <StarRating rating={product.rating} count={product.review_count} />
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-base font-bold text-zinc-900">{formatCOP(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-sm text-zinc-400 line-through">{formatCOP(product.compare_at_price)}</span>
            )}
          </div>

          <button
            disabled
            title="Disponible en la próxima fase"
            className="w-full py-2 text-sm font-medium bg-zinc-100 text-zinc-400 rounded-xl cursor-not-allowed select-none"
          >
            Agregar al carrito
          </button>
        </div>
      </article>
    </Link>
  )
}
