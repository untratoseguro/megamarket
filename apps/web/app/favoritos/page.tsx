'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/api-auth'
import { formatUSD, placeholderColor } from '@/lib/utils'

interface Favorite {
  id: string
  product_id: string
  product_title: string
  product_slug: string
  product_price: number
  created_at: string
}

export default function FavoritosPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login?redirect=/favoritos')
        return
      }
      try {
        const data = await authFetch<Favorite[]>('/favorites')
        setFavorites(data)
      } catch {
        // empty list on error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleRemove(productId: string) {
    try {
      await authFetch(`/favorites/${productId}`, { method: 'DELETE' })
      setFavorites((prev) => prev.filter((f) => f.product_id !== productId))
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-zinc-400">
        Cargando favoritos…
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Mis favoritos</h1>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 mb-6">Aún no tienes productos favoritos.</p>
          <Link
            href="/catalogo"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {favorites.map((fav) => {
            const bg = placeholderColor(fav.product_slug)
            const letter = fav.product_title[0]?.toUpperCase() ?? '?'
            return (
              <article
                key={fav.id}
                className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all duration-200"
              >
                <Link href={`/producto/${fav.product_slug}`} className="group block">
                  <div
                    className="aspect-square flex items-center justify-center"
                    style={{ background: bg }}
                  >
                    <span className="text-5xl font-black text-white/25 select-none">{letter}</span>
                  </div>
                  <div className="p-3 pb-2">
                    <h3 className="text-sm font-semibold text-zinc-800 line-clamp-2 group-hover:text-indigo-700 transition-colors leading-snug mb-1">
                      {fav.product_title}
                    </h3>
                    <p className="text-sm font-bold text-zinc-900">{formatUSD(fav.product_price)}</p>
                  </div>
                </Link>
                <div className="px-3 pb-3">
                  <button
                    onClick={() => handleRemove(fav.product_id)}
                    className="w-full text-xs text-red-500 hover:text-red-700 py-1 transition-colors"
                  >
                    Quitar de favoritos
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
