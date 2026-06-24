'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/api-auth'
import { formatUSD, placeholderColor } from '@/lib/utils'

interface RecProduct {
  id: string
  title: string
  slug: string
  price: number
  rating: number | null
}

interface Props {
  basedOn: 'cart' | 'favorites' | 'product'
  referenceId?: string
  title?: string
}

export default function RecommendationStrip({ basedOn, referenceId, title = 'También te puede interesar' }: Props) {
  const [items, setItems] = useState<RecProduct[]>([])

  useEffect(() => {
    const params = new URLSearchParams({ based_on: basedOn, limit: '6' })
    if (referenceId) params.set('reference_id', referenceId)
    // authFetch adds token if logged in, works without it for based_on=product
    authFetch<RecProduct[]>(`/recommendations?${params}`)
      .then(setItems)
      .catch(() => {})
  }, [basedOn, referenceId])

  if (items.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-zinc-900 mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {items.map(p => {
          const bg = placeholderColor(p.slug)
          return (
            <Link
              key={p.id}
              href={`/producto/${p.slug}`}
              className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="aspect-square flex items-center justify-center" style={{ background: bg }}>
                <span className="text-4xl font-black text-white/20 select-none">{p.title[0]?.toUpperCase()}</span>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-zinc-800 line-clamp-2 leading-snug mb-1">{p.title}</p>
                <p className="text-xs font-bold text-indigo-700">{formatUSD(p.price)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
