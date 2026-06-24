'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/api-auth'
import { formatUSD } from '@/lib/utils'

interface Order {
  id: string
  status: string
  subtotal: number
  total: number
  item_count: number
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
}

export default function OrdenesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login?redirect=/perfil/ordenes')
        return
      }
      try {
        const data = await authFetch<Order[]>('/orders')
        setOrders(data)
      } catch {
        // empty on error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-SV', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-zinc-400">
        Cargando pedidos…
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/perfil" className="text-zinc-400 hover:text-zinc-600 text-sm">
          ← Perfil
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Mis pedidos</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 mb-6">Aún no tienes pedidos.</p>
          <Link
            href="/catalogo"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs font-mono text-zinc-400 mb-1">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-zinc-400">{formatDate(order.created_at)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">
                  {order.item_count} artículo{order.item_count !== 1 ? 's' : ''}
                </span>
                <span className="font-bold text-zinc-900">{formatUSD(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
