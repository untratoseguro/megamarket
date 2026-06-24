'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/api-auth'

interface Props {
  productId: string
  variantId?: string | null
  disabled?: boolean
}

export default function AddToCartButton({ productId, variantId, disabled }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  async function handleAdd() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
        return
      }

      await authFetch('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId || null,
          quantity: 1,
        }),
      })

      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
      router.refresh()
    } catch {
      // silently fail — cart page will show updated state
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={disabled || loading}
      className={`
        w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors
        ${added
          ? 'bg-green-600 text-white'
          : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
        }
      `}
    >
      {loading ? 'Agregando…' : added ? '¡Agregado!' : 'Agregar al carrito'}
    </button>
  )
}
