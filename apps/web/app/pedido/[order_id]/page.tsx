'use client'

/**
 * Página de confirmación y pago de un pedido.
 *
 * Modos según URL y estado de la orden:
 *  A) Sin ?provider param + status='pending'  → selección de método de pago
 *  B) Con ?provider param + status='pending'  → polling (el pago está en curso)
 *  C) status='confirmed'                       → éxito
 *  D) status='cancelled'/'refunded'            → error / reembolso
 *
 * UX cuando el webhook llega tarde (respuesta a la pregunta crítica):
 *  El usuario llega en modo B. La página muestra "Procesando tu pago…" con spinner.
 *  Hace polling cada 3 s a GET /orders/{id}. Si el webhook de Wompi/PayPal llega
 *  10 s después del redirect, el siguiente poll (≤ 3 s tras el webhook) actualiza
 *  el estado y la UI cambia a modo C automáticamente. El usuario ve el spinner
 *  como máximo ~13 s. Pasados 90 s sin cambio, se muestra un mensaje de demora
 *  con opción de verificar manualmente o ir a Mis pedidos.
 */

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/api-auth'
import { formatUSD } from '@/lib/utils'

interface OrderDetail {
  id: string
  status: string
  subtotal: number
  total: number
  item_count: number
  created_at: string
  notes: string | null
  items: {
    id: string
    product_id: string
    quantity: number
    unit_price: number
    total_price: number
    product_title: string
  }[]
}

// ── Estado: pago exitoso ──────────────────────────────────────────────────────
function SuccessState({ order }: { order: OrderDetail }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">¡Pago confirmado!</h1>
      <p className="text-zinc-500 text-sm mb-2">
        Pedido <span className="font-mono font-semibold">#{order.id.slice(0, 8).toUpperCase()}</span>
      </p>
      <p className="text-zinc-500 text-sm mb-8">
        {order.item_count} artículo{order.item_count !== 1 ? 's' : ''} — {formatUSD(order.total)}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/perfil/ordenes"
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
        >
          Ver mis pedidos
        </Link>
        <Link
          href="/catalogo"
          className="bg-zinc-100 text-zinc-700 px-6 py-3 rounded-xl font-medium hover:bg-zinc-200 transition-colors text-sm"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}

// ── Estado: procesando pago (polling activo) ──────────────────────────────────
function ProcessingState({
  order,
  provider,
  elapsed,
  onManualCheck,
}: {
  order: OrderDetail
  provider: string
  elapsed: number
  onManualCheck: () => void
}) {
  const providerLabel = provider === 'paypal' ? 'PayPal' : 'Wompi'

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-zinc-900 mb-2">Procesando tu pago…</h1>
      <p className="text-zinc-500 text-sm mb-1">
        Estamos verificando tu transacción con {providerLabel}.
      </p>
      <p className="text-zinc-400 text-xs mb-8">
        Pedido <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span> — {formatUSD(order.total)}
      </p>

      {elapsed >= 30 && elapsed < 90 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 mb-6">
          Está tardando un poco más de lo usual. Seguimos verificando…
        </div>
      )}

      {elapsed >= 90 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-4 text-sm text-zinc-600 mb-6 space-y-3">
          <p>La verificación tardó más de lo esperado.</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={onManualCheck}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Verificar ahora
            </button>
            <Link
              href="/perfil/ordenes"
              className="bg-zinc-100 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Ver mis pedidos
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Estado: selección de método de pago ──────────────────────────────────────
function PaymentMethodState({
  order,
  onSelectPayPal,
  onSelectWompi,
  loading,
  error,
}: {
  order: OrderDetail
  onSelectPayPal: () => void
  onSelectWompi: () => void
  loading: string | null
  error: string
}) {
  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link href="/checkout" className="text-sm text-zinc-400 hover:text-zinc-600 mb-6 inline-block">
        ← Volver al carrito
      </Link>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6">
        <h2 className="text-base font-bold text-zinc-800 mb-4">Resumen del pedido</h2>
        <div className="space-y-2 mb-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-zinc-600 line-clamp-1 flex-1 mr-4">
                {item.product_title} × {item.quantity}
              </span>
              <span className="font-medium text-zinc-800 shrink-0">{formatUSD(item.total_price)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-100 pt-3 flex justify-between font-bold text-zinc-900">
          <span>Total a pagar</span>
          <span className="text-indigo-700">{formatUSD(order.total)}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <h1 className="text-xl font-bold text-zinc-900 mb-5">Elige cómo pagar</h1>

      <div className="space-y-3">
        {/* PayPal */}
        <button
          onClick={onSelectPayPal}
          disabled={!!loading}
          className="w-full flex items-center gap-4 bg-[#0070ba] hover:bg-[#005ea6] disabled:opacity-60 text-white rounded-2xl px-6 py-5 transition-colors"
        >
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
              <path d="M7.5 3h9C19.1 3 21 4.9 21 7.5c0 3.3-2.2 6-5.5 6.5l-.5.1H12l-.8 4.9H9l.2-1H8l-1-6 .5-8z" fill="#003087"/>
              <path d="M9.5 3.5h7c2.5 0 4 1.5 4 3.8 0 3-2 5.2-5 5.7H13l-.7 4.5H10l1.5-14z" fill="#009cde"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-base">
              {loading === 'paypal' ? 'Conectando con PayPal…' : 'Pagar con PayPal'}
            </p>
            <p className="text-xs text-blue-100">Tarjeta de crédito, débito o saldo PayPal</p>
          </div>
          {loading === 'paypal' && (
            <svg className="w-5 h-5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          )}
        </button>

        {/* Wompi */}
        <button
          onClick={onSelectWompi}
          disabled={!!loading}
          className="w-full flex items-center gap-4 bg-[#00c08b] hover:bg-[#00a878] disabled:opacity-60 text-white rounded-2xl px-6 py-5 transition-colors"
        >
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
            <span className="text-[#00c08b] font-black text-sm">W</span>
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-base">
              {loading === 'wompi' ? 'Conectando con Wompi…' : 'Pagar con Wompi'}
            </p>
            <p className="text-xs text-green-100">Nequi, PSE, Bancolombia, tarjeta</p>
          </div>
          {loading === 'wompi' && (
            <svg className="w-5 h-5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-zinc-400 mt-6">
        Serás redirigido al sitio seguro de tu proveedor de pago.
      </p>
    </div>
  )
}

// ── Estado: error de pago ─────────────────────────────────────────────────────
function ErrorState({ order }: { order: OrderDetail }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-zinc-900 mb-2">
        {order.status === 'refunded' ? 'Pedido reembolsado' : 'Pedido cancelado'}
      </h1>
      <p className="text-zinc-500 text-sm mb-8">
        Pedido <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
      </p>
      <Link
        href="/perfil/ordenes"
        className="inline-block bg-zinc-100 text-zinc-700 px-6 py-3 rounded-xl font-medium hover:bg-zinc-200 transition-colors text-sm"
      >
        Ver mis pedidos
      </Link>
    </div>
  )
}

// ── Componente interior (usa useSearchParams → necesita Suspense) ─────────────
function OrderConfirmation({ orderId }: { orderId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const provider = searchParams.get('provider') || ''

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loadingPayment, setLoadingPayment] = useState<string | null>(null)
  const [payError, setPayError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stoppedRef = useRef(false)

  const fetchOrder = useCallback(async () => {
    try {
      const data = await authFetch<OrderDetail>(`/orders/${orderId}`)
      setOrder(data)
      return data
    } catch {
      return null
    }
  }, [orderId])

  // Carga inicial + verificación de autenticación
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace(`/login?redirect=/pedido/${orderId}`)
        return
      }
      await fetchOrder()
    }
    init()
  }, [orderId, router, fetchOrder])

  // Iniciar polling si venimos del proveedor de pago
  useEffect(() => {
    if (!provider || !order) return
    if (order.status !== 'pending') return
    if (stoppedRef.current) return

    pollingRef.current = setInterval(async () => {
      const updated = await fetchOrder()
      if (updated && updated.status !== 'pending') {
        stopPolling()
      }
    }, 3000)

    // Contador de tiempo transcurrido (para los mensajes progresivos)
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)

    return stopPolling
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, order?.status])

  function stopPolling() {
    stoppedRef.current = true
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function handleManualCheck() {
    await fetchOrder()
    setElapsed(0)
    stoppedRef.current = false
    // Reiniciar polling
    pollingRef.current = setInterval(async () => {
      const updated = await fetchOrder()
      if (updated && updated.status !== 'pending') stopPolling()
    }, 3000)
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
  }

  async function handlePayPal() {
    if (!order) return
    setLoadingPayment('paypal')
    setPayError('')
    try {
      const resp = await authFetch<{ approval_url: string }>('/payments/paypal/create-order', {
        method: 'POST',
        body: JSON.stringify({ order_id: order.id }),
      })
      window.location.href = resp.approval_url
    } catch (err) {
      setPayError('No se pudo conectar con PayPal. Intenta de nuevo.')
      setLoadingPayment(null)
    }
  }

  async function handleWompi() {
    if (!order) return
    setLoadingPayment('wompi')
    setPayError('')
    try {
      const resp = await authFetch<{ redirect_url: string }>('/payments/wompi/create-transaction', {
        method: 'POST',
        body: JSON.stringify({ order_id: order.id }),
      })
      window.location.href = resp.redirect_url
    } catch (err) {
      setPayError('No se pudo conectar con Wompi. Intenta de nuevo.')
      setLoadingPayment(null)
    }
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-zinc-400 text-sm">
        Cargando pedido…
      </div>
    )
  }

  // Modo C: pago confirmado
  if (order.status === 'confirmed') {
    return <SuccessState order={order} />
  }

  // Modo D: cancelado o reembolsado
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return <ErrorState order={order} />
  }

  // Modo B: venimos del proveedor → polling
  if (provider && order.status === 'pending') {
    return (
      <ProcessingState
        order={order}
        provider={provider}
        elapsed={elapsed}
        onManualCheck={handleManualCheck}
      />
    )
  }

  // Modo A: elegir método de pago
  return (
    <PaymentMethodState
      order={order}
      onSelectPayPal={handlePayPal}
      onSelectWompi={handleWompi}
      loading={loadingPayment}
      error={payError}
    />
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PedidoPage() {
  const { order_id } = useParams<{ order_id: string }>()

  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-16 text-center text-zinc-400 text-sm">
          Cargando…
        </div>
      }
    >
      <OrderConfirmation orderId={order_id} />
    </Suspense>
  )
}
