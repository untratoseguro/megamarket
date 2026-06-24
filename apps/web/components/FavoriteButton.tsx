'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/api-auth'

// Module-level cache: one request shared by all FavoriteButton instances per page load
let favoritesCache: Promise<Set<string>> | null = null

function getFavoriteIds(): Promise<Set<string>> {
  if (!favoritesCache) {
    favoritesCache = authFetch<{ product_id: string }[]>('/favorites')
      .then((data) => new Set(data.map((f) => f.product_id)))
      .catch(() => new Set<string>())
  }
  return favoritesCache
}

export function invalidateFavoritesCache() {
  favoritesCache = null
}

interface Props {
  productId: string
}

export default function FavoriteButton({ productId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setChecked(true)
        return
      }
      const ids = await getFavoriteIds()
      if (!cancelled) {
        setIsFav(ids.has(productId))
        setChecked(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [productId])

  async function handleToggle() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
        return
      }

      if (isFav) {
        await authFetch(`/favorites/${productId}`, { method: 'DELETE' })
        setIsFav(false)
      } else {
        await authFetch(`/favorites/${productId}`, { method: 'POST' })
        setIsFav(true)
      }

      invalidateFavoritesCache()
      router.refresh()
    } catch {
      // keep current state on error
    } finally {
      setLoading(false)
    }
  }

  if (!checked) return null

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      className="rounded-full p-1.5 text-zinc-400 transition-colors hover:text-red-500 disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={isFav ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  )
}
