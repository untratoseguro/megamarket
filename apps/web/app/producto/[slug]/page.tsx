import { notFound } from 'next/navigation'
import { getProductBySlug, NotFoundError } from '@/lib/api'
import Breadcrumbs from '@/components/Breadcrumbs'
import { formatUSD, discountPct, placeholderColor } from '@/lib/utils'
import type { ProductVariant } from '@/types'
import type { Metadata } from 'next'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const product = await getProductBySlug(params.slug)
    return { title: product.title }
  } catch {
    return { title: 'Producto' }
  }
}

function VariantTable({ variants }: { variants: ProductVariant[] }) {
  if (variants.length === 0) return null

  const attrKeys = Array.from(
    new Set(variants.flatMap((v) => Object.keys(v.attributes_json ?? {})))
  )

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-zinc-800 mb-3">Variantes disponibles</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-zinc-200 rounded-xl overflow-hidden">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
            <tr>
              {attrKeys.map((k) => <th key={k} className="px-4 py-3 text-left">{k}</th>)}
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {variants.map((v) => (
              <tr key={v.id} className="hover:bg-zinc-50 transition-colors">
                {attrKeys.map((k) => (
                  <td key={k} className="px-4 py-3 text-zinc-700">
                    {String(v.attributes_json?.[k] ?? '—')}
                  </td>
                ))}
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">{v.sku}</td>
                <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                  {v.price ? formatUSD(v.price) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    v.stock_quantity > 0
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {v.stock_quantity > 0 ? `${v.stock_quantity} disp.` : 'Agotado'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function ProductoPage({ params }: Props) {
  let product
  try {
    product = await getProductBySlug(params.slug)
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    throw err
  }

  const breadcrumbs: Array<{ id: string; name: string; slug: string }> = []

  const discount = product.compare_at_price
    ? discountPct(product.price, product.compare_at_price)
    : null

  const bg = placeholderColor(product.slug)
  const letter = product.title[0]?.toUpperCase() ?? '?'

  const attrEntries = Object.entries(product.attributes_json ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Breadcrumbs items={breadcrumbs} current={product.title} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image */}
        <div
          className="relative aspect-square rounded-2xl flex items-center justify-center shadow-sm overflow-hidden"
          style={{ background: bg }}
        >
          <span className="text-[10rem] font-black text-white/20 select-none leading-none">
            {letter}
          </span>
          {product.is_featured && (
            <span className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
              Destacado
            </span>
          )}
          {discount !== null && (
            <span className="absolute top-4 right-4 bg-rose-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              -{discount}%
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {product.brand && (
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-2">
              {product.brand}
            </p>
          )}

          <h1 className="text-3xl font-bold text-zinc-900 leading-tight mb-4">
            {product.title}
          </h1>

          {product.review_count > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-amber-400 text-base">
                {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
              </span>
              <span className="text-sm text-zinc-500">{product.rating.toFixed(1)} ({product.review_count} reseñas)</span>
            </div>
          )}

          {product.short_description && (
            <p className="text-zinc-600 text-sm leading-relaxed mb-6">
              {product.short_description}
            </p>
          )}

          {/* Price */}
          <div className="bg-zinc-50 rounded-2xl p-6 mb-6">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-zinc-900">
                {formatUSD(product.price)}
              </span>
              {product.compare_at_price && (
                <span className="text-lg text-zinc-400 line-through">
                  {formatUSD(product.compare_at_price)}
                </span>
              )}
            </div>
            {discount !== null && (
              <p className="text-sm text-green-600 font-medium mt-1">
                Ahorras {formatUSD(product.compare_at_price! - product.price)} ({discount}% OFF)
              </p>
            )}
            <p className={`text-sm mt-3 font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock_quantity > 0
                ? `✓ En stock — ${product.stock_quantity} unidades disponibles`
                : '✗ Sin stock'}
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-3 mb-6">
            <button
              disabled
              title="Carrito disponible en la próxima fase"
              className="w-full bg-indigo-100 text-indigo-400 font-semibold py-4 rounded-2xl text-base cursor-not-allowed select-none"
            >
              Agregar al carrito
            </button>
            <button
              disabled
              title="Comprar disponible en la próxima fase"
              className="w-full bg-zinc-100 text-zinc-400 font-semibold py-3 rounded-2xl text-sm cursor-not-allowed select-none"
            >
              Comprar ahora
            </button>
            <p className="text-center text-xs text-zinc-400">
              Carrito y checkout disponibles próximamente
            </p>
          </div>

          {/* SKU */}
          <p className="text-xs text-zinc-400">
            SKU: <span className="font-mono">{product.sku}</span>
          </p>
        </div>
      </div>

      {/* Attributes */}
      {attrEntries.length > 0 && (
        <section className="mt-12 bg-white border border-zinc-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-zinc-900 mb-4">Especificaciones</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {attrEntries.map(([key, value]) => (
              <div key={key} className="bg-zinc-50 rounded-xl p-4">
                <dt className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">{key}</dt>
                <dd className="text-sm font-semibold text-zinc-800">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Variants */}
      {product.product_variants?.length > 0 && (
        <section className="mt-8">
          <VariantTable variants={product.product_variants} />
        </section>
      )}

      {/* Long description */}
      {product.long_description && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-lg font-bold text-zinc-900 mb-4">Descripción completa</h2>
          <div className="prose prose-sm prose-zinc text-zinc-600 leading-relaxed whitespace-pre-wrap">
            {product.long_description}
          </div>
        </section>
      )}
    </div>
  )
}
