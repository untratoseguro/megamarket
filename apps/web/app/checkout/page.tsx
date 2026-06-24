'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/api-auth'
import { formatUSD } from '@/lib/utils'

interface CartItem {
  id: string
  product_id: string
  variant_id: string | null
  quantity: number
  unit_price: number
  line_total: number
  product_title: string
  product_slug: string
}

interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
  item_count: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadCart = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetch<Cart>('/cart')
      setCart(data)
    } catch {
      setError('No se pudo cargar el carrito')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login?redirect=/checkout')
        return
      }
      await loadCart()
    }
    check()
  }, [router, loadCart])

  async function handleRemove(itemId: string) {
    try {
      const data = await authFetch<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' })
      setCart(data)
    } catch {
      setError('No se pudo eliminar el artículo')
    }
  }

  async function handleQuantity(itemId: string, qty: number) {
    try {
      const data = await authFetch<Cart>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: qty }),
      })
      setCart(data)
    } catch {
      setError('No se pudo actualizar la cantidad')
    }
  }

  async function handleConfirm() {
    if (!cart?.items.length) return
    setSubmitting(true)
    setError('')
    try {
      await authFetch('/orders', { method: 'POST', body: JSON.stringify({}) })
      router.push('/perfil/ordenes')
    } catch {
      setError('Error al crear el pedido. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-zinc-400">
        Cargando carrito…
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 mb-6">Tu carrito está vacío.</p>
        <Link
          href="/catalogo"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Tu carrito</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {cart.items.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-zinc-200 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <Link
                href={`/producto/${item.product_slug}`}
                className="text-sm font-semibold text-zinc-800 hover:text-indigo-700 line-clamp-2"
              >
                {item.product_title}
              </Link>
              <p className="text-xs text-zinc-400 mt-0.5">{formatUSD(item.unit_price)} c/u</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="w-7 h-7 rounded-full border border-zinc-300 text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 flex items-center justify-center text-sm font-bold"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold text-zinc-800">
                {item.quantity}
              </span>
              <button
                onClick={() => handleQuantity(item.id, item.quantity + 1)}
                disabled={item.quantity >= 100}
                className="w-7 h-7 rounded-full border border-zinc-300 text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 flex items-center justify-center text-sm font-bold"
              >
                +
              </button>
            </div>

            <span className="text-sm font-bold text-zinc-900 w-20 text-right shrink-0">
              {formatUSD(item.line_total)}
            </span>

            <button
              onClick={() => handleRemove(item.id)}
              aria-label="Eliminar"
              className="text-zinc-300 hover:text-red-500 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200">
        <div className="flex justify-between items-center mb-2 text-sm text-zinc-600">
          <span>Subtotal ({cart.item_count} artículos)</span>
          <span className="font-semibold text-zinc-900">{formatUSD(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between items-center mb-2 text-sm text-zinc-500">
          <span>Envío</span>
          <span>Por definir</span>
        </div>
        <div className="border-t border-zinc-200 mt-4 pt-4 flex justify-between items-center">
          <span className="font-bold text-zinc-900">Total</span>
          <span className="text-xl font-extrabold text-indigo-700">{formatUSD(cart.subtotal)}</span>
        </div>

        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="mt-6 w-full bg-indigo-600 text-white font-semibold py-4 rounded-2xl text-base hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {submitting ? 'Creando pedido…' : 'Confirmar pedido'}
        </button>
        <p className="text-center text-xs text-zinc-400 mt-3">
          El pedido quedará en estado pendiente. El pago se procesa por separado.
        </p>
      </div>
    </div>
  )
}
