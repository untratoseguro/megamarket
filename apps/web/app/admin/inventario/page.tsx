'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/api-auth'

interface ProductRow {
  id: string
  title: string
  sku: string
  stock_quantity: number
  product_variants: Array<{ id: string; sku: string; stock_quantity: number; attributes_json: Record<string, unknown> }>
}

interface AdjustResult {
  old_quantity: number
  new_quantity: number
  delta: number
}

export default function InventarioAdmin() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductRow[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<{ product_id: string; variant_id: string | null; label: string; current: number } | null>(null)
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [adjustResult, setAdjustResult] = useState<AdjustResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    try {
      const data = await authFetch<ProductRow[]>(`/admin/inventory/search?q=${encodeURIComponent(query)}`)
      setResults(data)
    } catch { setError('Error en búsqueda') }
    finally { setSearching(false) }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError('')
    setAdjustResult(null)
    try {
      const body = {
        product_id: selected.product_id,
        variant_id: selected.variant_id || null,
        delta: parseInt(delta),
        reason,
      }
      const result = await authFetch<AdjustResult>('/admin/inventory/adjust', { method: 'POST', body: JSON.stringify(body) })
      setAdjustResult(result)
      setDelta('')
      setReason('')
      // Refresh search results
      const data = await authFetch<ProductRow[]>(`/admin/inventory/search?q=${encodeURIComponent(query)}`)
      setResults(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error ajustando stock')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Inventario</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar producto por título o SKU…"
          className="flex-1 border border-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button type="submit" disabled={searching} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden mb-8">
          {results.map(p => (
            <div key={p.id} className="border-b border-zinc-100 last:border-b-0">
              <div
                className={`px-5 py-3 flex items-center justify-between hover:bg-zinc-50 cursor-pointer ${selected?.product_id === p.id && !selected.variant_id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                onClick={() => setSelected({ product_id: p.id, variant_id: null, label: p.title, current: p.stock_quantity })}
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{p.title}</p>
                  <p className="text-xs text-zinc-400 font-mono">{p.sku}</p>
                </div>
                <span className="text-sm font-bold text-zinc-700">{p.stock_quantity} uds</span>
              </div>
              {(p.product_variants || []).map(v => (
                <div
                  key={v.id}
                  className={`px-8 py-2.5 flex items-center justify-between hover:bg-zinc-50 cursor-pointer ${selected?.variant_id === v.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                  onClick={() => setSelected({ product_id: p.id, variant_id: v.id, label: `${p.title} — ${v.sku}`, current: v.stock_quantity })}
                >
                  <p className="text-xs text-zinc-500">{v.sku} — {JSON.stringify(v.attributes_json)}</p>
                  <span className="text-xs font-bold text-zinc-600">{v.stock_quantity} uds</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Adjustment form */}
      {selected && (
        <form onSubmit={handleAdjust} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-zinc-800">Ajustar stock</h2>
          <p className="text-sm text-zinc-600">
            <span className="font-medium">{selected.label}</span> — Stock actual: <span className="font-bold">{selected.current}</span>
          </p>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {adjustResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              Stock actualizado: {adjustResult.old_quantity} → <strong>{adjustResult.new_quantity}</strong> ({adjustResult.delta > 0 ? '+' : ''}{adjustResult.delta})
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Delta *</label>
              <input type="number" required value={delta} onChange={e => setDelta(e.target.value)}
                placeholder="+10 o -5" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <p className="text-xs text-zinc-400 mt-1">Positivo = entrada, negativo = salida. No puede quedar &lt; 0.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Motivo * (mín. 5 caracteres)</label>
              <input required value={reason} onChange={e => setReason(e.target.value)} minLength={5}
                placeholder="Ej: Recepción de mercancía proveedor" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'Ajustando…' : 'Confirmar ajuste'}
            </button>
            <button type="button" onClick={() => setSelected(null)} className="text-zinc-500 px-4 py-2 text-sm">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  )
}
