'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/api-auth'
import { formatUSD } from '@/lib/utils'

interface Order {
  id: string
  status: string
  total: number
  shipping_address_json: Record<string, string>
  created_at: string
  user_id: string
}

interface OrdersResp {
  items: Order[]
  total: number
  page: number
  page_size: number
}

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmada', shipped: 'Enviada',
  delivered: 'Entregada', cancelled: 'Cancelada', refunded: 'Reembolsada',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  refunded: 'bg-zinc-100 text-zinc-600',
}

export default function OrdenesAdmin() {
  const [resp, setResp] = useState<OrdersResp | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState<{ order: Order; newStatus: string; justification: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: '25' })
    if (statusFilter) params.set('status', statusFilter)
    const data = await authFetch<OrdersResp>(`/admin/orders?${params}`).catch(() => null)
    setResp(data)
  }

  useEffect(() => { load() }, [page, statusFilter])

  function openModal(order: Order) {
    setModal({ order, newStatus: order.status, justification: '' })
    setError('')
  }

  async function handleStatusChange(e: React.FormEvent) {
    e.preventDefault()
    if (!modal) return
    setSubmitting(true)
    setError('')
    try {
      await authFetch(`/admin/orders/${modal.order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: modal.newStatus, justification: modal.justification }),
      })
      setModal(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error cambiando estado')
    } finally { setSubmitting(false) }
  }

  const totalPages = resp ? Math.ceil(resp.total / resp.page_size) : 1

  return (
    <div className="px-8 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Órdenes</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => { setStatusFilter(''); setPage(1) }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${statusFilter === '' ? 'bg-indigo-600 text-white' : 'bg-white border border-zinc-300 text-zinc-600 hover:bg-zinc-50'}`}
        >
          Todas
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-zinc-300 text-zinc-600 hover:bg-zinc-50'}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">ID</th>
              <th className="px-5 py-3 text-left">Fecha</th>
              <th className="px-5 py-3 text-left">Dirección</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(resp?.items || []).map(order => (
              <tr key={order.id} className="hover:bg-zinc-50">
                <td className="px-5 py-3 font-mono text-xs text-zinc-500">{order.id.slice(0, 8)}…</td>
                <td className="px-5 py-3 text-zinc-600 text-xs whitespace-nowrap">
                  {new Date(order.created_at).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-5 py-3 text-zinc-600 text-xs">
                  {order.shipping_address_json?.city ?? '—'}, {order.shipping_address_json?.country ?? '—'}
                </td>
                <td className="px-5 py-3 text-right font-semibold">{formatUSD(order.total)}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => openModal(order)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                    Cambiar estado
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resp?.items.length === 0 && <p className="text-center text-zinc-400 py-8 text-sm">Sin órdenes.</p>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg disabled:opacity-40 hover:bg-zinc-50">Anterior</button>
          <span className="px-4 py-1.5 text-sm text-zinc-600">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg disabled:opacity-40 hover:bg-zinc-50">Siguiente</button>
        </div>
      )}

      {/* Status change modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <form
            onSubmit={handleStatusChange}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4"
          >
            <h2 className="font-bold text-zinc-900">Cambiar estado de orden</h2>
            <p className="text-xs text-zinc-500 font-mono">{modal.order.id}</p>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Nuevo estado *</label>
              <select required value={modal.newStatus} onChange={e => setModal(m => m ? { ...m, newStatus: e.target.value } : m)}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Justificación * (mín. 5 caracteres)</label>
              <textarea required minLength={5} value={modal.justification}
                onChange={e => setModal(m => m ? { ...m, justification: e.target.value } : m)}
                placeholder="Ej: Cliente confirmó recepción / fraude detectado"
                rows={3}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'Guardando…' : 'Confirmar'}
              </button>
              <button type="button" onClick={() => setModal(null)} className="text-zinc-500 px-4 py-2 text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
